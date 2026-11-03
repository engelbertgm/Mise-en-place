// Domains, stage (building/live), go-live, deferring and switching a domain off.
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { parse, stringify } from 'yaml'
import { loadCatalog } from '../engine/src/catalog.ts'
import { formatDomains, formatFocus, meter, progressColor, summarize } from '../engine/src/domains.ts'
import { evaluate } from '../engine/src/evaluate.ts'
import { closePhase, gate, launch } from '../engine/src/gate.ts'
import { loadProfile } from '../engine/src/profile.ts'
import { verifyItems } from '../engine/src/verify.ts'
import type { Catalog, Item } from '../engine/src/types.ts'
import { CLI, REAL_CATALOG, addFiles, item, makeRepo, tempDir, withProfile } from './helpers.ts'
import { spawnSync } from 'node:child_process'

/** A catalog with the real dimensions and these items, placed in these domains (and linked as given). */
function domainCatalog(items: Item[], domains: Record<string, Record<string, string[]>>, links: Record<string, string[]> = {}): { catalog: Catalog; dir: string } {
  const dir = tempDir('mep-domains-')
  for (const f of ['dimensions.yaml', 'VERSION', 'sensitive.yaml', 'signals.yaml']) copyFileSync(join(REAL_CATALOG, f), join(dir, f))
  writeFileSync(join(dir, 'stack-rules.yaml'), '[]\n')
  mkdirSync(join(dir, 'items'))
  writeFileSync(join(dir, 'items', 'test.yaml'), stringify(items))
  const tree = Object.fromEntries(
    Object.entries(domains).map(([d, subs]) => [d, { label: d, description: d, subdomains: Object.fromEntries(Object.entries(subs).map(([s, ids]) => [s, { label: s, description: s, items: ids }])) }]),
  )
  writeFileSync(join(dir, 'domains.yaml'), stringify({ domains: tree, links }))
  return { catalog: loadCatalog(dir), dir }
}

const ITEMS = [
  item({ id: 'secret-a', phase: 'foundation.setup' }),
  item({ id: 'abuse-a', phase: 'build.features' }),
  item({ id: 'abuse-lock', phase: 'build.features', locked: true }),
  item({ id: 'ui-a', phase: 'build.ux' }),
  item({ id: 'ui-rec', phase: 'build.ux', level: 'recommended' }),
]
const TREE = { security: { secrets: ['secret-a'], abuse: ['abuse-a', 'abuse-lock'] }, ui: { design: ['ui-a', 'ui-rec'] } }

describe('the real catalog', () => {
  test('every item has exactly one home and the links point at real subdomains', () => {
    const catalog = loadCatalog(REAL_CATALOG)
    assert.ok(catalog.domains.length >= 18)
    assert.deepEqual(catalog.items.filter(i => !i.domain), [])
    const paths = new Set(catalog.domains.flatMap(d => d.subdomains.map(s => `${d.key}.${s.key}`)))
    for (const i of catalog.items) for (const l of i.links ?? []) assert.ok(paths.has(l) && l !== i.domain, `${i.id} → ${l}`)
  })

  test('a catalog without a home for an item does not load', () => {
    const { dir } = domainCatalog(ITEMS, TREE)
    const file = join(dir, 'domains.yaml')
    const doc = parse(readFileSync(file, 'utf8'))
    doc.domains.ui.subdomains.design.items = ['ui-a']
    writeFileSync(file, stringify(doc))
    assert.throws(() => loadCatalog(dir), /ui-rec: no home in domains\.yaml/)
  })
})

describe('switching a domain off', () => {
  const { catalog } = domainCatalog(ITEMS, TREE)

  test('a domain or a subdomain turns its items off; a locked item stays on', () => {
    const p = withProfile(makeRepo(), catalog, { selections: { domains_off: [{ path: 'security', reason: 'lo lleva otro equipo', date: '2026-11-03' }] } as never })
    const states = Object.fromEntries(evaluate(p, catalog).map(e => [e.item.id, e.state]))
    assert.equal(states['secret-a'], 'off')
    assert.equal(states['abuse-a'], 'off')
    assert.equal(states['abuse-lock'], 'active')
    assert.equal(states['ui-a'], 'active')
    const sub = withProfile(makeRepo(), catalog, { selections: { domains_off: [{ path: 'security.abuse', reason: 'r', date: '2026-11-03' }] } as never })
    const s2 = Object.fromEntries(evaluate(sub, catalog).map(e => [e.item.id, e.state]))
    assert.equal(s2['secret-a'], 'active')
    assert.equal(s2['abuse-a'], 'off')
  })

  test('an item off does not block anything, and its reason says why', () => {
    const root = makeRepo()
    const p = withProfile(root, catalog, { stage: 'live', selections: { domains_off: [{ path: 'ui', reason: 'diseño lo entrega el cliente', date: '2026-11-03' }] } as never })
    const off = evaluate(p, catalog).find(e => e.item.id === 'ui-a')
    assert.match(off?.reason ?? '', /dominio apagado \(ui\): diseño lo entrega el cliente/)
    assert.ok(!gate(root, catalog, 'prod').blockers.some(b => b.item.id === 'ui-a'))
  })
})

describe('deferring until go-live', () => {
  const { catalog } = domainCatalog(ITEMS, TREE)
  const deferred = (...ids: string[]) => ({ deferred: ids.map(id => ({ id, reason: 'después', date: '2026-11-03' })) }) as never

  test('a deferred 🔴 does not stop closing the sub-phase, but production still needs it', () => {
    const root = makeRepo()
    withProfile(root, catalog, { selections: deferred('secret-a') })
    const close = closePhase(root, catalog, 'foundation.setup', { review: false })
    assert.equal(close.closed, true, close.message)
    assert.ok(gate(root, catalog, 'prod').blockers.some(b => b.item.id === 'secret-a'))
    assert.ok(!gate(root, catalog, 'stop').blockers.some(b => b.item.id === 'secret-a'))
    assert.match(gate(root, catalog, 'stop').message, /1 🔴 diferidos hasta el go-live/)
  })
})

describe('go-live', () => {
  const { catalog } = domainCatalog(ITEMS, TREE)

  test('launch runs the full gate and only then the project is live', () => {
    const root = makeRepo()
    withProfile(root, catalog)
    const blocked = launch(root, catalog)
    assert.equal(blocked.ok, false)
    assert.match(blocked.message, /Por dominio: security|bloquea el deploy a producción/)
    assert.equal(loadProfile(root, catalog).stage, 'building')
    addFiles(root, { 'secret-a.txt': '', 'abuse-a.txt': '', 'abuse-lock.txt': '', 'ui-a.txt': '' })
    const ok = launch(root, catalog)
    assert.equal(ok.ok, true, ok.message)
    assert.equal(loadProfile(root, catalog).stage, 'live')
  })
})

describe('the CLI', () => {
  const mep = (root: string, args: string[], env: Record<string, string> = {}) => {
    const r = spawnSync('node', [CLI, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, MEP_BYPASS: '', MEP_CONFIG_DIR: tempDir(), ...env } })
    return { code: r.status, out: r.stdout, err: r.stderr }
  }
  function project(): string {
    const root = makeRepo()
    writeFileSync(join(root, 'draft.yaml'), 'project: Demo\ntype: landing\nmarkets: [MX]\n')
    assert.equal(mep(root, ['init', '--from', 'draft.yaml']).code, 0)
    return root
  }

  test('while building, CI integrates (exit 0) even with 🔴 pending; live, it is the full gate', () => {
    const root = project()
    assert.equal(mep(root, ['verify', '--ci', '--no-cache']).code, 0)
    assert.equal(mep(root, ['verify', '--prod', '--no-cache']).code, 1)
    const profileFile = join(root, '.mep/profile.yaml')
    assert.match(readFileSync(profileFile, 'utf8'), /stage: building/)
    // launch refuses while 🔴 are pending, and says where they are
    const launched = mep(root, ['launch'])
    assert.equal(launched.code, 1)
    assert.match(launched.out, /Por dominio:/)
  })

  test('defer, domain off and the way back are the person\'s: the agent cannot', () => {
    const root = project()
    const required = JSON.parse(mep(root, ['check', '--json', '--fast']).out).results.find((r: { level: string; state: string; status: string }) => r.level === 'required' && r.state === 'active' && r.status !== 'pass')
    assert.equal(mep(root, ['defer', required.id, 'lo hago después']).code, 3)
    assert.equal(mep(root, ['domain', 'off', 'seo', 'lo lleva otro equipo']).code, 3)
    assert.equal(mep(root, ['defer', required.id, 'lo hago después', '--human']).code, 0)
    assert.match(mep(root, ['check']).out, /⏳ 1 🔴 diferidos/)
    assert.equal(mep(root, ['undefer', required.id]).code, 0)
    const off = mep(root, ['domain', 'off', 'seo', 'lo lleva otro equipo', '--human'])
    assert.equal(off.code, 0, off.err)
    assert.match(mep(root, ['domains']).out, /seo\s+apagado: lo lleva otro equipo/)
    assert.match(mep(root, ['check']).out, /⊘ seo apagado \(\d+ ítems\)/)
    assert.match(readFileSync(join(root, 'BRIEF.md'), 'utf8'), /Dominios apagados[\s\S]*`seo` — lo lleva otro equipo/)
    assert.equal(mep(root, ['domain', 'on', 'seo']).code, 0)
    assert.equal(mep(root, ['domain', 'off', 'nope', 'x', '--human']).code, 1)
  })

  test('domains and focus show where things are, including what is linked from elsewhere', () => {
    const root = project()
    const domains = mep(root, ['domains']).out
    assert.match(domains, /Dominios · stage: building/)
    assert.match(domains, /accessibility\s+/)
    assert.match(mep(root, ['domains', 'ux']).out, /\n {2}forms\s+/)
    const focus = mep(root, ['focus', 'ux.principles']).out
    assert.match(focus, /ux\.principles: \d+ pendientes/)
    assert.match(focus, /↗ viene de accessibility\.operable/)
  })

  test('the pre-bash hook lets a push to main through while building, and stops it once live', () => {
    const root = project()
    const hook = (command: string) => {
      const r = spawnSync('node', [CLI, 'hook', 'pre-bash'], { cwd: root, encoding: 'utf8', input: JSON.stringify({ cwd: root, tool_input: { command } }), env: { ...process.env, MEP_BYPASS: '' } })
      return r.stdout ? JSON.parse(r.stdout) : {}
    }
    assert.equal(hook('git push origin main').hookSpecificOutput, undefined)
    assert.equal(hook('vercel deploy --prod').hookSpecificOutput.permissionDecision, 'deny')
  })
})

describe('summaries', () => {
  const { catalog } = domainCatalog(ITEMS, TREE, { 'ui-a': ['security.abuse'] })

  test('per domain and subdomain: what applies, how much is done, what is deferred', () => {
    const root = makeRepo({ 'secret-a.txt': '' })
    const p = withProfile(root, catalog)
    const results = verifyItems(root, p, evaluate(p, catalog), 'fast')
    const tree = summarize(results, catalog, ['abuse-a'], [])
    const security = tree.find(t => t.row.path === 'security')!
    assert.equal(security.row.required, 3)
    assert.equal(security.row.done, 1)
    assert.equal(security.row.deferred, 1)
    assert.equal(security.subs.find(s => s.path === 'security.abuse')!.pendingRequired, 1) // abuse-lock; abuse-a is deferred
    assert.match(formatDomains(tree, 'building'), /security\s+⣿?[⣀-⣿]+ 1\/3/)
  })

  test('focus lists linked items from other domains with their origin', () => {
    const root = makeRepo()
    const p = withProfile(root, catalog)
    const results = verifyItems(root, p, evaluate(p, catalog), 'fast')
    const text = formatFocus('security.abuse', results, [])
    assert.match(text, /abuse-a/)
    assert.match(text, /ui-a.*↗ viene de ui\.design/)
  })

  test('the bar fills in braille and moves from red to green', () => {
    assert.deepEqual(meter(0, 4, 4), { filled: '', rest: '⣀⣀⣀⣀' })
    assert.deepEqual(meter(4, 4, 4), { filled: '⣿⣿⣿⣿', rest: '' })
    assert.equal(meter(2, 4, 4).filled, '⣿⣿')
    assert.equal(progressColor(0), '#e5484d')
    assert.equal(progressColor(0.5), '#f5a524')
    assert.equal(progressColor(1), '#30a46c')
  })
})
