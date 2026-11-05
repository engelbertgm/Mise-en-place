// The catalog is a general guide: Claude fits it to THIS scope, and the profile records what did not fit and why.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { loadCatalog, validateProfile } from '../engine/src/catalog.ts'
import { diff, evaluate } from '../engine/src/evaluate.ts'
import { panelData, formatProposal } from '../engine/src/report.ts'
import { renderBrief } from '../engine/src/render.ts'
import { renderScope } from '../engine/src/scope.ts'
import { verifyItems } from '../engine/src/verify.ts'
import { CLI, REAL_CATALOG, makeRepo, profile, tempDir } from './helpers.ts'
import type { Profile } from '../engine/src/types.ts'

const real = loadCatalog(REAL_CATALOG)
const solo = (extra: Partial<Profile> = {}) => profile(real, { type: 'saas', capabilities: ['auth', 'subscriptions'], audience: ['b2b'], ...extra })
const fit = { not_applicable: [{ id: 'saas-teams', reason: 'herramienta de una sola persona, sin equipos' }], notes: { 'saas-plan-limits': 'el límite es por proyecto, no por usuario' } }

describe('fitting the catalog to the scope', () => {
  test('a SaaS gets the SaaS rules by default; the scope can take out the ones that do not fit', () => {
    const states = (p: Profile) => Object.fromEntries(evaluate(p, real).map(e => [e.item.id, e.state]))
    assert.equal(states(solo())['saas-teams'], 'active')
    const fitted = evaluate(solo({ tailoring: fit }), real).find(e => e.item.id === 'saas-teams')!
    assert.equal(fitted.state, 'off')
    assert.match(fitted.reason!, /no aplica a este scope: herramienta de una sola persona/)
    assert.equal(states(solo({ tailoring: fit }))['saas-plan-limits'], 'active') // the rest stays
  })

  test('only real, unlocked items with a reason can be fitted out; notes need a real item', () => {
    const errors = (t: Profile['tailoring']) => validateProfile(solo({ tailoring: t }), real)
    assert.deepEqual(errors(fit), [])
    assert.match(errors({ not_applicable: [{ id: 'nope', reason: 'x' }], notes: {} }).join(), /nope no existe/)
    const locked = real.items.find(i => i.locked)!.id
    assert.match(errors({ not_applicable: [{ id: locked, reason: 'x' }], notes: {} }).join(), /locked/)
    assert.match(errors({ not_applicable: [{ id: 'saas-teams', reason: ' ' }], notes: {} }).join(), /necesita una razón/)
    assert.match(errors({ not_applicable: [], notes: { nope: 'x' } }).join(), /nota de nope/)
  })

  test('a locked item cannot be fitted out even if the profile says so', () => {
    const locked = real.items.find(i => i.locked && evaluate(solo(), real).some(e => e.item.id === i.id))!.id
    const e = evaluate(solo({ tailoring: { not_applicable: [{ id: locked, reason: 'x' }], notes: {} } }), real).find(x => x.item.id === locked)!
    assert.equal(e.state, 'active')
  })

  test('/mep:add shows a fitted-out item as "deja de aplicar" and bringing it back as new', () => {
    const before = solo()
    const after = solo({ tailoring: fit })
    assert.ok(diff(before, after, real).some(c => c.id === 'saas-teams' && c.change === 'removed'))
    assert.ok(diff(after, before, real).some(c => c.id === 'saas-teams' && c.change === 'new'))
  })

  test('the BRIEF says how an item applies here and lists what did not fit; the panel and counts skip it', () => {
    const p = solo({ tailoring: fit })
    const evaluated = evaluate(p, real)
    const brief = renderBrief(p, evaluated, real)
    assert.match(brief, /`saas-plan-limits`[^\n]*\n {2}- 🎯 el límite es por proyecto, no por usuario/)
    assert.match(brief, /### 🎯 Ajustado a este scope[\s\S]*`saas-teams` — herramienta de una sola persona/)
    assert.doesNotMatch(brief.split('### 🎯 Ajustado')[0]!, /`saas-teams`/)
    const results = verifyItems(makeRepo(), p, evaluated, 'fast')
    assert.ok(!panelData(results, p, real).items.some(i => i.id === 'saas-teams'))
    const scope = renderScope(p, evaluated, real)
    assert.match(scope, /## A tu medida[\s\S]*`saas-teams` — herramienta de una sola persona/)
    assert.match(scope, /`saas-plan-limits` — el límite es por proyecto/)
  })

  test('the proposal is grouped by domain and lists the fitted-out items apart', () => {
    const text = formatProposal(evaluate(solo({ tailoring: fit }), real))
    assert.match(text, /\n {2}auth\.[a-z-]+\n/)
    assert.match(text, /🎯 Ajustado a este scope \(1\)[\s\S]*saas-teams — no aplica a este scope/)
  })
})

describe('the CLI', () => {
  test('init takes the tailoring from the draft, and add can change it with a diff', () => {
    const root = makeRepo()
    const mep = (args: string[]) => spawnSync('node', [CLI, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, MEP_BYPASS: '', MEP_CONFIG_DIR: tempDir() } })
    writeFileSync(join(root, 'draft.yaml'), 'project: Solo\ntype: saas\ncapabilities: [auth, subscriptions]\naudience: [b2b]\nmarkets: [MX]\ntailoring:\n  not_applicable:\n    - { id: saas-teams, reason: "una sola persona" }\n  notes:\n    saas-plan-limits: "por proyecto"\n')
    const proposal = mep(['evaluate', '--from', 'draft.yaml'])
    assert.match(proposal.stdout, /🎯 Ajustado a este scope \(1\)/)
    assert.equal(mep(['init', '--from', 'draft.yaml']).status, 0)
    assert.match(readFileSync(join(root, 'BRIEF.md'), 'utf8'), /`saas-teams` — una sola persona/)
    assert.match(readFileSync(join(root, 'SCOPE.md'), 'utf8'), /A tu medida/)
    writeFileSync(join(root, 'change.yaml'), 'tailoring:\n  not_applicable: []\n  notes: {}\n')
    assert.match(mep(['add', '--from', 'change.yaml']).stdout, /＋ nuevo {2}saas-teams/)
  })
})
