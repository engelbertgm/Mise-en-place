// The security review before going live: the person's checklist, each line made of catalog items.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { parse } from 'yaml'
import { loadCatalog } from '../engine/src/catalog.ts'
import { evaluate } from '../engine/src/evaluate.ts'
import { formatPrelaunch, prelaunch } from '../engine/src/prelaunch.ts'
import type { PrelaunchCheck } from '../engine/src/prelaunch.ts'
import { verifyItems } from '../engine/src/verify.ts'
import { CLI, REAL_CATALOG, makeRepo, profile, tempDir } from './helpers.ts'

const real = loadCatalog(REAL_CATALOG)
const checks = (parse(readFileSync(join(REAL_CATALOG, 'prelaunch.yaml'), 'utf8')) as { checks: PrelaunchCheck[] }).checks

describe('the checklist', () => {
  test('it has the 19 lines and every item in it exists and is security or auth', () => {
    assert.equal(checks.length, 19)
    const ids = new Map(real.items.map(i => [i.id, i]))
    for (const c of checks) {
      assert.ok(c.items.length, c.label)
      for (const id of c.items) assert.ok(ids.has(id), `${c.label}: ${id}`)
    }
  })

  test('the four items it adds are required, security, and checked right before going live', () => {
    for (const id of ['password-reset-expiry', 'debug-mode-off', 'unused-dependencies', 'secrets-history-clean']) {
      const item = real.items.find(i => i.id === id)!
      assert.equal(item.category, 'security', id)
      assert.equal(item.level, 'required', id)
      assert.equal(item.phase, 'launch.ops', id)
      assert.ok(item.domain?.startsWith('security.') || item.domain?.startsWith('auth.'), id)
    }
  })

  test('uploads: the allowlist, the content hardening and the safe serving are required, and the review line holds all six', () => {
    for (const id of ['upload-type-allowlist', 'upload-content-hardening', 'upload-served-safely']) {
      const item = real.items.find(i => i.id === id)!
      assert.equal(item.level, 'required', id)
      assert.deepEqual(item.when, { capabilities: ['uploads'] }, id)
      assert.equal(item.domain, 'backend.uploads', id)
    }
    const line = checks.find(c => c.label.includes('Subidas'))!
    for (const id of ['upload-validation', 'upload-type-allowlist', 'upload-size-limits', 'upload-content-hardening', 'upload-antivirus', 'upload-served-safely']) assert.ok(line.items.includes(id), id)
  })

  test('uploads: user-generated content or a marketplace makes the antivirus required; a plain site keeps it recommended', () => {
    const level = (p: ReturnType<typeof profile>) => evaluate(p, real).find(e => e.item.id === 'upload-antivirus')!.level
    assert.equal(level(profile(real, { type: 'corporate', capabilities: ['uploads'] })), 'recommended')
    assert.equal(level(profile(real, { type: 'saas', capabilities: ['uploads', 'ugc'] })), 'required')
    assert.equal(level(profile(real, { type: 'marketplace', capabilities: ['uploads'] })), 'required')
  })

  test('uploads: a wide-open accept or an allowlist with a wildcard is caught; a real allowlist is not', () => {
    const grep = real.items.find(i => i.id === 'upload-type-allowlist')!.verify.filter(v => v.type === 'grep') as { pattern: string }[]
    const allow = new RegExp(grep[0]!.pattern)
    const open = new RegExp(grep[1]!.pattern)
    assert.match("const allowedMimeTypes = ['image/png', 'image/jpeg']", allow)
    assert.match('<input type="file" accept="*/*" />', open)
    assert.match("allowedMimeTypes: ['*']", open)
    assert.doesNotMatch("const allowedMimeTypes = ['image/png', 'image/webp']", open)
  })

  test('debug mode: a development NODE_ENV or DEBUG=true in the production config is found', () => {
    const item = real.items.find(i => i.id === 'debug-mode-off')!
    const grep = item.verify.find(v => v.type === 'grep') as { pattern: string; flags?: string }
    const re = new RegExp(grep.pattern, grep.flags)
    for (const bad of ['ENV NODE_ENV=development', 'DEBUG=true', 'APP_DEBUG=1', 'FLASK_DEBUG=1', '{ "debug": true }'.replace('"debug"', 'debug')]) assert.match(bad, re, bad)
    for (const ok of ['NODE_ENV=production', 'DEBUG=false', 'NEXT_PUBLIC_DEBUG_BAR=0']) assert.doesNotMatch(ok, re, ok)
  })
})

describe('the review, line by line', () => {
  test('a line that applies to nothing in the scope is n/a; one that applies is done only when all its items pass', () => {
    const p = profile(real, { type: 'landing' })
    const results = verifyItems(makeRepo(), p, evaluate(p, real), 'fast')
    const rows = prelaunch(checks, results, () => 'falta')
    const by = (needle: string) => rows.find(r => r.label.includes(needle))!
    assert.equal(by('Contraseñas').state, 'na') // no accounts
    assert.equal(by('Subidas').state, 'na') // no uploads
    assert.equal(by('admin').state, 'na') // no admin panel
    assert.equal(by('precio').state, 'na') // no payments
    assert.notEqual(by('HTTPS').state, 'na')
    assert.notEqual(by('debug').state, 'na')
    assert.match(formatPrelaunch(rows, false), /Antes de salir en vivo · seguridad: \d+ de \d+ listas \(\d+ no aplican\)/)
  })

  test('with accounts, uploads and payments the lines come back, and a missing one says what', () => {
    const p = profile(real, { type: 'saas', capabilities: ['auth', 'uploads', 'payments', 'admin-panel'] })
    const results = verifyItems(makeRepo(), p, evaluate(p, real), 'fast')
    const rows = prelaunch(checks, results, () => 'falta')
    for (const needle of ['Contraseñas', 'Subidas', 'admin', 'precio', 'recuperación']) assert.notEqual(rows.find(r => r.label.includes(needle))!.state, 'na', needle)
    const open = rows.find(r => r.label.includes('recuperación'))!
    assert.match(open.detail, /password-reset-expiry|password-recovery/)
  })
})

describe('the CLI', () => {
  const mep = (root: string, args: string[]) => {
    const r = spawnSync('node', [CLI, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, MEP_BYPASS: '', MEP_CONFIG_DIR: tempDir() } })
    return { code: r.status, out: r.stdout }
  }

  test('mep prelaunch prints the review, changes nothing and works while building', () => {
    const root = makeRepo()
    writeFileSync(join(root, 'draft.yaml'), 'project: Demo\ntype: saas\ncapabilities: [auth]\nmarkets: [MX]\n')
    assert.equal(mep(root, ['init', '--from', 'draft.yaml']).code, 0)
    const before = readFileSync(join(root, '.mep/profile.yaml'), 'utf8')
    const r = mep(root, ['prelaunch'])
    assert.match(r.out, /Antes de salir en vivo · seguridad:/)
    assert.match(r.out, /Contraseñas guardadas con hash/)
    assert.match(r.out, /mep launch.*exige estos mismos ítems/)
    assert.equal(readFileSync(join(root, '.mep/profile.yaml'), 'utf8'), before)
    const json = JSON.parse(mep(root, ['prelaunch', '--json']).out)
    assert.equal(json.length, 19)
  })
})
