import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { loadCatalog, validateProfile } from '../engine/src/catalog.ts'
import { marketCovers, matches } from '../engine/src/conditions.ts'
import { diff, evaluate, stack } from '../engine/src/evaluate.ts'
import { normalizeProfile } from '../engine/src/profile.ts'
import { SECRET_PATTERN } from '../engine/src/secrets.ts'
import { cpSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify } from 'yaml'
import { compareVersions } from '../engine/src/version.ts'
import { REAL_CATALOG, item, profile, tempDir, testCatalog } from './helpers.ts'

const real = loadCatalog()

describe('conditions', () => {
  const p = profile(real, { type: 'saas', capabilities: ['auth', 'payments'], markets: ['MX', 'EU:DE'], signals: { has_forms: true } })

  test('a list means "contains all"', () => {
    assert.equal(matches({ capabilities: ['auth'] }, p), true)
    assert.equal(matches({ capabilities: ['auth', 'payments'] }, p), true)
    assert.equal(matches({ capabilities: ['auth', 'ugc'] }, p), false)
  })

  test('any / none / scalar', () => {
    assert.equal(matches({ capabilities: { any: ['ugc', 'payments'] } }, p), true)
    assert.equal(matches({ capabilities: { none: ['ugc'] } }, p), true)
    assert.equal(matches({ type: 'saas' }, p), true)
    assert.equal(matches({ type: { any: ['landing', 'blog'] } }, p), false)
  })

  test('all / any / not combine', () => {
    assert.equal(matches({ all: [{ type: 'saas' }, { not: { capabilities: ['ugc'] } }] }, p), true)
    assert.equal(matches({ any: [{ type: 'blog' }, { capabilities: ['ugc'] }] }, p), false)
  })

  test('parent market covers its children, a child does not cover the parent', () => {
    assert.equal(marketCovers('EU', 'EU:DE'), true)
    assert.equal(marketCovers('EU:DE', 'EU'), false)
    assert.equal(matches({ markets: { any: ['EU'] } }, p), true)
    assert.equal(matches({ markets: ['EU:FR'] }, p), false)
    const wholeEu = profile(real, { markets: ['EU'] })
    assert.equal(matches({ markets: ['EU:DE'] }, wholeEu), false)
  })

  test('signals compare by value', () => {
    assert.equal(matches({ signals: { has_forms: true } }, p), true)
    assert.equal(matches({ signals: { has_embeds: true } }, p), false)
  })
})

describe('evaluate', () => {
  const p = profile(real, { type: 'saas', capabilities: ['auth', 'payments', 'subscriptions', 'email'], markets: ['MX', 'USA:CA', 'EU:DE'], context: 'client-project' })

  test('same profile, same items', () => {
    const a = JSON.stringify(evaluate(p, real))
    const b = JSON.stringify(evaluate(normalizeProfile(structuredClone(p), real), real))
    assert.equal(a, b)
  })

  test('capabilities imply signals and other capabilities', () => {
    const q = profile(real, { capabilities: ['auth', 'subscriptions'] })
    assert.equal(q.signals.has_db, true)
    assert.equal(q.signals.has_forms, true)
    assert.ok(q.capabilities.includes('payments'))
    assert.ok(profile(real, { counts: { languages: 2 } }).capabilities.includes('i18n'))
  })

  test('conditional items apply only when their condition holds', () => {
    const ids = new Set(evaluate(p, real).map(e => e.item.id))
    assert.ok(ids.has('hosted-checkout'))
    assert.ok(!ids.has('api-cors'))
    const landing = new Set(evaluate(profile(real, { type: 'landing' }), real).map(e => e.item.id))
    assert.ok(!landing.has('password-hashing'))
    assert.ok(landing.has('meta-charset'))
  })

  test('level overrides raise the level', () => {
    const c = testCatalog([item({ id: 'a', level: 'recommended', level_overrides: [{ when: { markets: { any: ['EU'] } }, level: 'required' }] })])
    assert.equal(evaluate(profile(c, { markets: ['MX'] }), c)[0].level, 'recommended')
    assert.equal(evaluate(profile(c, { markets: ['EU:DE'] }), c)[0].level, 'required')
  })

  test('selection states: skipped, overridden, offered; locked ignores overrides', () => {
    const c = testCatalog([
      item({ id: 'rec', level: 'recommended' }),
      item({ id: 'req' }),
      item({ id: 'lock', locked: true }),
      item({ id: 'opt', level: 'optional' }),
    ])
    const q = profile(c, {
      selections: {
        optional_added: [],
        recommended_skipped: [{ id: 'rec', reason: 'MVP', date: '2026-10-13' }],
        overrides: [
          { id: 'req', reason: 'r', date: '2026-10-13' },
          { id: 'lock', reason: 'r', date: '2026-10-13' },
        ],
        manual_confirmed: [],
        grace: [],
      },
    })
    const state = Object.fromEntries(evaluate(q, c).map(e => [e.item.id, e.state]))
    assert.deepEqual(state, { rec: 'skipped', req: 'overridden', lock: 'active', opt: 'offered' })
  })

  test('diff shows only what changed', () => {
    const before = profile(real, { type: 'saas', capabilities: ['auth'] })
    const after = profile(real, { type: 'saas', capabilities: ['auth', 'payments'] })
    const changes = diff(before, after, real)
    assert.ok(changes.length > 0)
    assert.ok(changes.some(c => c.id === 'hosted-checkout' && c.change === 'new'))
    assert.ok(changes.every(c => c.id !== 'meta-charset'))
    assert.deepEqual(diff(before, before, real), [])
    const pentest = diff(before, after, real).find(c => c.id === 'pentest-before-launch')
    assert.equal(pentest?.change, 'raised')
  })

  test('stack: rules recommend with a reason; the profile decides', () => {
    const landing = stack(profile(real, { type: 'landing' }), real)
    assert.equal(landing.find(d => d.key === 'db')?.value, 'none')
    assert.equal(landing.find(d => d.key === 'framework')?.value, 'nextjs')
    const saas = stack(p, real)
    assert.equal(saas.find(d => d.key === 'db')?.value, 'postgresql')
    assert.ok(saas.every(d => d.why.length > 0))
    const decided = stack(profile(real, { type: 'saas', capabilities: ['auth'], stack: { decided: { framework: 'vite-react' } } }), real)
    assert.equal(decided.find(d => d.key === 'framework')?.value, 'vite-react')
  })
})

describe('catalog', () => {
  test('every item has why, how, verify, effort and phase (the loader rejects otherwise)', () => {
    for (const i of real.items) {
      assert.ok(i.why && i.how && i.verify.length && i.effort && i.phase, i.id)
    }
  })

  test('the five presets load a valid profile', () => {
    assert.deepEqual(Object.keys(real.presets).sort(), ['corporate', 'ecommerce', 'landing', 'marketplace', 'saas'])
    for (const [name, preset] of Object.entries(real.presets)) {
      assert.deepEqual(validateProfile(normalizeProfile({ ...preset, project: name }, real), real), [], name)
    }
  })

  test('the secret pattern in the catalog is the one the gate mod uses', () => {
    const check = real.items.find(i => i.id === 'no-secrets-in-repo')!.verify[0]
    assert.equal(check.type === 'grep' && check.pattern, SECRET_PATTERN)
  })

  test('every item belongs to a released catalog version', () => {
    for (const i of real.items) assert.ok(compareVersions(i.since, real.version) <= 0, i.id)
  })

  test('legal items cite an official source', () => {
    const legal = real.items.filter(i => i.category === 'legal' && i.id.match(/^(mx|usa|ca|eu|uk|br|in)-/))
    assert.ok(legal.length >= 20)
    for (const i of legal) assert.ok(i.references?.length || i.verify.some(v => v.type === 'manual'), i.id)
  })

  test('a new market (CN) only needs catalog files, not engine changes', () => {
    const dir = tempDir('mep-catalog-cn-')
    cpSync(REAL_CATALOG, dir, { recursive: true })
    const dims = readFileSync(join(dir, 'dimensions.yaml'), 'utf8').replace('markets: [MX, USA, CA, EU, UK, BR, IN]', 'markets: [MX, USA, CA, EU, UK, BR, IN, CN]')
    writeFileSync(join(dir, 'dimensions.yaml'), dims)
    writeFileSync(join(dir, 'markets', 'cn.yaml'), stringify([item({ id: 'cn-pipl', category: 'legal', when: { markets: { any: ['CN'] } } })]))
    const cn = loadCatalog(dir)
    assert.ok(evaluate(profile(cn, { markets: ['CN'] }), cn).some(e => e.item.id === 'cn-pipl'))
    assert.ok(!evaluate(profile(cn, { markets: ['MX'] }), cn).some(e => e.item.id === 'cn-pipl'))
  })

  test('invalid values are rejected', () => {
    assert.throws(() => testCatalog([item({ id: 'x', when: { capabilities: ['teleport'] } })]), /not a valid capabilities/)
    assert.throws(() => testCatalog([item({ id: 'x', verify: [] })]), /at least one verify/)
    assert.throws(() => testCatalog([item({ id: 'x', phase: 'nope' })]), /invalid phase/)
    const errors = validateProfile(profile(real, { type: 'spaceship', markets: ['MARS'] }), real)
    assert.equal(errors.length, 2)
  })
})
