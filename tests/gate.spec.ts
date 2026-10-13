import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { deployKind } from '../engine/src/deploy.ts'
import { closePhase, gate } from '../engine/src/gate.ts'
import { loadProfile } from '../engine/src/profile.ts'
import { findSecret } from '../engine/src/secrets.ts'
import { addFiles, item, makeRepo, testCatalog, withProfile } from './helpers.ts'

const catalog = testCatalog([
  item({ id: 'setup-a', phase: 'foundation.setup' }),
  item({ id: 'setup-rec', phase: 'foundation.setup', level: 'recommended' }),
  item({ id: 'data-a', phase: 'build.data' }),
  item({ id: 'no-secret', phase: 'build.features', locked: true, verify: [{ type: 'grep', pattern: 'SECRET123', glob: '**/*.ts', expect: 'absent' }] }),
  item({ id: 'launch-a', phase: 'launch.ops' }),
])

const ids = (rs: { item: { id: string } }[]) => rs.map(r => r.item.id).sort()

describe('gate', () => {
  test('does nothing in a repo without .mep/', () => {
    const r = gate(makeRepo(), catalog, 'prod')
    assert.equal(r.block, false)
    assert.equal(r.message, '')
  })

  test('stop: required items of the active sub-phase are info, not blockers', () => {
    const root = makeRepo()
    withProfile(root, catalog)
    const r = gate(root, catalog, 'stop')
    assert.equal(r.block, false)
    assert.deepEqual(ids(r.info), ['setup-a'])
  })

  test('stop: a closed sub-phase blocks on regressions and not when they are met', () => {
    const root = makeRepo({ 'setup-a.txt': '' })
    withProfile(root, catalog, { phase: { closed: ['foundation.setup'], active: 'foundation.design' } })
    assert.equal(gate(root, catalog, 'stop').block, false)
    const fresh = makeRepo()
    withProfile(fresh, catalog, { phase: { closed: ['foundation.setup'], active: 'foundation.design' } })
    const r = gate(fresh, catalog, 'stop')
    assert.equal(r.block, true)
    assert.deepEqual(ids(r.blockers), ['setup-a'])
    assert.match(r.message, /setup-a .*— así/)
  })

  test('a locked violation blocks in any sub-phase and ignores MEP_BYPASS', () => {
    const root = makeRepo({ 'src/x.ts': 'const k = "SECRET123"' })
    withProfile(root, catalog)
    const r = gate(root, catalog, 'stop', { MEP_BYPASS: '1' })
    assert.equal(r.block, true)
    assert.deepEqual(ids(r.blockers), ['no-secret'])
  })

  test('MEP_BYPASS skips regular blockers and is logged', () => {
    const root = makeRepo()
    withProfile(root, catalog, { phase: { closed: ['foundation.setup'], active: 'foundation.design' } })
    const r = gate(root, catalog, 'stop', { MEP_BYPASS: '1' })
    assert.equal(r.block, false)
    assert.equal(r.bypassed, true)
    assert.match(readFileSync(join(root, '.mep', 'log'), 'utf8'), /bypass stop: setup-a/)
  })

  test('prod: blocks on every pending required item of every sub-phase', () => {
    const root = makeRepo({ 'setup-a.txt': '' })
    withProfile(root, catalog)
    const r = gate(root, catalog, 'prod')
    assert.equal(r.block, true)
    assert.deepEqual(ids(r.blockers), ['data-a', 'launch-a'])
    assert.equal(gate(root, catalog, 'preview').block, false)
  })

  test('overridden required items do not block', () => {
    const root = makeRepo({ 'setup-a.txt': '', 'data-a.txt': '' })
    withProfile(root, catalog, { selections: { optional_added: [], recommended_skipped: [], overrides: [{ id: 'launch-a', reason: 'r', date: '2026-10-13' }], manual_confirmed: [] } })
    assert.equal(gate(root, catalog, 'prod').block, false)
  })
})

describe('phase close', () => {
  test('closes only when its required items pass, then moves to the next sub-phase', () => {
    const root = makeRepo()
    withProfile(root, catalog)
    const fail = closePhase(root, catalog, 'foundation.setup')
    assert.equal(fail.closed, false)
    assert.deepEqual(ids(fail.pending), ['setup-a'])
    addFiles(root, { 'setup-a.txt': '' })
    const ok = closePhase(root, catalog, 'foundation.setup')
    assert.equal(ok.closed, true)
    const p = loadProfile(root, catalog)
    assert.deepEqual(p.phase.closed, ['foundation.setup'])
    assert.equal(p.phase.active, 'foundation.design')
    assert.equal(closePhase(root, catalog, 'foundation.setup').closed, false)
    assert.ok(existsSync(join(root, '.mep', 'log')))
  })
})

describe('deploy detection', () => {
  test('production', () => {
    for (const cmd of ['vercel deploy --prod', 'vercel --prod', 'npx vercel --prod --yes', 'git push origin main', 'git push origin HEAD:main', 'netlify deploy --prod', 'vercel promote https://x.vercel.app']) {
      assert.equal(deployKind(cmd), 'prod', cmd)
    }
    assert.equal(deployKind('git push', 'main'), 'prod')
    assert.equal(deployKind('git push -u origin', 'main'), 'prod')
  })
  test('preview and non-deploys', () => {
    assert.equal(deployKind('vercel deploy'), 'preview')
    assert.equal(deployKind('vercel'), 'preview')
    assert.equal(deployKind('netlify deploy'), 'preview')
    for (const cmd of ['git push origin feature-main', 'git push', 'vercel env pull', 'vercel link', 'ls', 'echo vercel-like']) {
      assert.equal(deployKind(cmd, 'feature'), undefined, cmd)
    }
  })
})

describe('secrets', () => {
  test('known shapes are found, placeholders are not', () => {
    assert.equal(findSecret('STRIPE=sk_live_' + 'a'.repeat(24)), 'Stripe secret key')
    assert.equal(findSecret('-----BEGIN RSA PRIVATE KEY-----'), 'private key')
    assert.equal(findSecret('DATABASE_URL=postgres://app:hunter22@db.example.com/x'), 'connection string with password')
    assert.equal(findSecret('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY='), 'Supabase service_role in public variable')
    assert.equal(findSecret('STRIPE_SECRET_KEY=\nDATABASE_URL=postgres://user:${PASSWORD}@host/db'), undefined)
  })
})
