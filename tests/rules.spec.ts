// Catalog 2026.10.7: rules by project type, usage billing, operations and sensitive data; mep's own limits.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { loadCatalog, validateProfile } from '../engine/src/catalog.ts'
import { evaluate } from '../engine/src/evaluate.ts'
import { normalizeProfile } from '../engine/src/profile.ts'
import type { Profile } from '../engine/src/types.ts'
import { verifyItems } from '../engine/src/verify.ts'
import { makeRepo } from './helpers.ts'

const real = loadCatalog()
const profile = (raw: Partial<Profile>) => normalizeProfile({ project: 'x', ...raw }, real)
const levels = (p: Profile) => new Map(evaluate(p, real).map(e => [e.item.id, e.level]))

describe('mep does not scope projects for minors or that verify age', () => {
  test('a profile with minors or age-verification is invalid, with the reason', () => {
    for (const audience of ['minors', 'age-verification']) {
      const errors = validateProfile(profile({ type: 'saas', audience: [audience] }), real)
      assert.match(errors.join('\n'), /no cubre proyectos para menores de edad ni que verifiquen edad/)
    }
    assert.equal(real.items.some(i => i.id === 'usa-coppa'), false)
  })
})

describe('rules by project type apply only to their type', () => {
  test('SaaS, ecommerce, marketplace, blog, directory, portfolio and internal apps', () => {
    const saas = levels(profile({ type: 'saas', audience: ['b2b'], capabilities: ['auth', 'subscriptions'] }))
    assert.equal(saas.get('saas-tenant-isolation'), 'required')
    assert.equal(saas.get('saas-teams'), 'required')
    assert.equal(saas.get('saas-plan-limits'), 'required')
    const landing = levels(profile({ type: 'landing' }))
    for (const id of ['saas-tenant-isolation', 'ecommerce-no-oversell', 'marketplace-split-payments', 'blog-article-schema', 'internal-sso']) assert.equal(landing.has(id), false, id)
    const market = levels(profile({ type: 'marketplace', capabilities: ['payments', 'ugc'] }))
    for (const id of ['marketplace-split-payments', 'marketplace-seller-verification', 'marketplace-review-integrity', 'ecommerce-all-in-price']) assert.equal(market.get(id), 'required', id)
    assert.equal(levels(profile({ type: 'blog' })).get('blog-article-schema'), 'required')
    assert.equal(levels(profile({ type: 'blog', capabilities: ['newsletter'] })).get('blog-feed'), 'required')
    assert.equal(levels(profile({ type: 'directory' })).get('directory-facets-crawl'), 'required')
    assert.equal(levels(profile({ type: 'portfolio' })).get('portfolio-client-permission'), 'required')
    assert.equal(levels(profile({ type: 'internal-app' })).get('internal-no-public-signup'), 'required')
  })
})

describe('usage billing ("RaaS")', () => {
  test('implies payments and a database, and brings its rules', () => {
    const p = profile({ type: 'saas', capabilities: ['usage-billing'] })
    assert.ok(p.capabilities.includes('payments'))
    assert.equal(p.signals.has_db, true)
    const l = levels(p)
    for (const id of ['usage-events-idempotent', 'usage-pricing-tiers', 'usage-spend-cap', 'usage-visible', 'usage-invoice-detail', 'usage-pricing-terms']) assert.equal(l.get(id), 'required', id)
  })
})

describe('operations', () => {
  test('uptime monitoring is required where an outage costs money, recommended elsewhere', () => {
    assert.equal(levels(profile({ type: 'saas' })).get('uptime-monitor'), 'required')
    assert.equal(levels(profile({ type: 'landing' })).get('uptime-monitor'), 'recommended')
    assert.equal(levels(profile({ type: 'landing', capabilities: ['payments'] })).get('uptime-monitor'), 'required')
  })
})

describe('sensitive data', () => {
  test('health data: HIPAA in USA, article 9 in the EU, consent in MX, and no tracking pixels', () => {
    const l = levels(profile({ type: 'saas', audience: ['sensitive-data-health'], markets: ['USA', 'EU:DE', 'MX'] }))
    for (const id of ['usa-hipaa', 'eu-health-explicit-consent', 'mx-sensitive-consent', 'health-no-tracking', 'sensitive-data-encryption']) assert.equal(l.get(id), 'required', id)
    const p = profile({ type: 'saas', audience: ['sensitive-data-health'] })
    const item = evaluate(p, real).filter(e => e.item.id === 'health-no-tracking')
    assert.equal(verifyItems(makeRepo({ 'app/layout.tsx': "fbq('init', '123')" }), p, item, 'fast')[0]!.status, 'fail')
    assert.equal(verifyItems(makeRepo({ 'app/layout.tsx': 'export default 1' }), p, item, 'fast')[0]!.status, 'pass')
  })
})
