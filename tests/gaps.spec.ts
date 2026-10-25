// The gaps found when reviewing the spec against the implementation: each one, tested.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { loadCatalog } from '../engine/src/catalog.ts'
import { prToMain } from '../engine/src/deploy.ts'
import { checkDesign, fontFamilies, fontWeights } from '../engine/src/design.ts'
import { prReviewGate } from '../engine/src/gate.ts'
import { evaluate, stack } from '../engine/src/evaluate.ts'
import { inferProfile } from '../engine/src/audit.ts'
import { marketLocales } from '../engine/src/profile.ts'
import { checkThresholds } from '../engine/src/quality.ts'
import { formatClient, quote } from '../engine/src/quote.ts'
import { detectSignals } from '../engine/src/signals.ts'
import type { Rates } from '../engine/src/quote.ts'
import { CLI, makeRepo, profile, tempDir, withProfile } from './helpers.ts'

const real = loadCatalog()

describe('1. markets bring their languages', () => {
  test('MX + USA:CA activates es-MX, en-US and i18n; one language does not', () => {
    const p = profile(real, { markets: ['MX', 'USA:CA'] })
    assert.deepEqual(marketLocales(p, real), ['en-US', 'es-MX'])
    assert.equal(p.counts.languages, 2)
    assert.ok(p.capabilities.includes('i18n'))
    assert.ok(!profile(real, { markets: ['MX', 'EU:ES'] }).capabilities.includes('i18n'))
    assert.ok(profile(real, { markets: ['CA:QC'] }).capabilities.includes('i18n'))
  })

  test('a higher count given by the person is kept', () => {
    assert.equal(profile(real, { markets: ['MX'], counts: { languages: 3 } }).counts.languages, 3)
  })
})

describe('2. quality thresholds from the profile', () => {
  const eslint = (c: number, l: number, f: number) => `export default [{ rules: { complexity: ['error', ${c}], 'max-lines': ['error', { max: ${l} }], 'max-lines-per-function': ['error', ${f}] } }]`

  test('the linter must enforce the profile thresholds or stricter ones', () => {
    assert.equal(checkThresholds(makeRepo({ 'eslint.config.mjs': eslint(10, 300, 50) }), profile(real)).ok, true)
    assert.equal(checkThresholds(makeRepo({ 'eslint.config.mjs': eslint(8, 200, 40) }), profile(real)).ok, true)
    const lax = checkThresholds(makeRepo({ 'eslint.config.mjs': eslint(15, 300, 50) }), profile(real))
    assert.equal(lax.ok, false)
    assert.match(lax.detail, /complexity 15 > 10/)
    assert.equal(checkThresholds(makeRepo({ 'eslint.config.mjs': eslint(15, 300, 50) }), profile(real, { quality: { complexity: 15 } })).ok, true)
    assert.match(checkThresholds(makeRepo({ 'eslint.config.mjs': 'export default []' }), profile(real)).detail, /falta complexity/)
  })

  test('relaxing a threshold needs a reason and confirmation, and shows in the brief', () => {
    const root = makeRepo({ 'p.yaml': 'project: x\ntype: landing\n' })
    const run = (args: string[]) => spawnSync('node', [CLI, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, MEP_CONFIG_DIR: tempDir() } })
    run(['init', '--from', 'p.yaml'])
    assert.match(run(['threshold', 'complexity', '15']).stderr, /requiere una razón/)
    assert.equal(run(['threshold', 'complexity', '15', 'código', 'legado']).status, 2)
    assert.equal(run(['threshold', 'complexity', '15', 'código', 'legado', '--yes']).status, 0)
    assert.match(readFileSync(join(root, 'BRIEF.md'), 'utf8'), /⚠️ umbral `complexity` — complexity = 15 \(por defecto 10\): código legado/)
    assert.match(readFileSync(join(root, '.mep/log'), 'utf8'), /threshold complexity=15/)
    assert.equal(run(['threshold', 'max_lines', '200']).status, 0)
  })
})

describe('3. design checks that used to be manual', () => {
  test('font families from next/font, @fontsource and CSS', () => {
    const root = makeRepo({
      'package.json': JSON.stringify({ dependencies: { '@fontsource/lora': '5' } }),
      'app/layout.tsx': "import { Inter, Playfair_Display as Display } from 'next/font/google'",
      'app/globals.css': "body { font-family: var(--font-sans), system-ui; } h1 { font-family: 'Inter', sans-serif; }",
    })
    assert.deepEqual(fontFamilies(root), ['inter', 'lora', 'playfair display'])
    assert.equal(checkDesign(root, { type: 'design', rule: 'font_families', max: 2 }).ok, false)
  })

  test('font weights count 500 and 600 as one step', () => {
    const root = makeRepo({ 'app/page.tsx': '<h1 className="font-bold">a</h1><p className="font-medium">b</p><b className="font-semibold">c</b><span className="font-normal">d</span>' })
    assert.deepEqual(fontWeights(root), ['400', '500–600', '700'])
    assert.equal(checkDesign(root, { type: 'design', rule: 'font_weights', max: 3 }).ok, true)
    writeFileSync(join(root, 'app/x.tsx'), '<i className="font-light">e</i>')
    const fresh = makeRepo({ 'app/page.tsx': '<h1 className="font-bold font-medium font-normal font-light">a</h1>' })
    assert.equal(checkDesign(fresh, { type: 'design', rule: 'font_weights', max: 3 }).ok, false)
  })

  test('the catalog flags raw palette text colors and links without hover', () => {
    const items = new Map(real.items.map(i => [i.id, i]))
    const color = items.get('text-hierarchy')!.verify.find(v => v.type === 'grep' && v.pattern.includes('slate'))
    const hover = items.get('interactive-states')!.verify.find(v => v.type === 'grep' && v.expect === 'absent')
    assert.ok(color && color.type === 'grep' && new RegExp(color.pattern).test('<p className="text-gray-500">'))
    assert.ok(hover && hover.type === 'grep' && new RegExp(hover.pattern).test('<a href="/" className="text-primary">'))
    assert.ok(hover && hover.type === 'grep' && !new RegExp(hover.pattern).test('<a href="/" className="text-primary hover:underline">'))
  })
})

describe('4. responsive test template', () => {
  test('/mep:scope installs tests/responsive.spec.ts and its script, keeping what exists', () => {
    const root = makeRepo({ 'package.json': '{\n    "name": "x",\n    "scripts": { "dev": "next dev" }\n}\n', 'p.yaml': 'project: x\ntype: landing\n' })
    spawnSync('node', [CLI, 'init', '--from', 'p.yaml'], { cwd: root, env: { ...process.env, MEP_CONFIG_DIR: tempDir() } })
    assert.match(readFileSync(join(root, 'tests/responsive.spec.ts'), 'utf8'), /\[360, 768, 1280, 1920, 2560\]/)
    const pkg = readFileSync(join(root, 'package.json'), 'utf8')
    assert.match(pkg, /"test:responsive": "playwright test tests\/responsive\.spec\.ts"/)
    assert.match(pkg, /"dev": "next dev"/)
    assert.match(pkg, /^\{\n {4}"name"/)
  })
})

describe('5. estimated schedule', () => {
  test('weeks per phase from hours and weekly capacity, in the client view', () => {
    const rates: Rates = { currency: 'USD', hourly_rate: 40, pm_overhead: 0.1, risk_buffer: 0.2, rounding: 50, weekly_hours: 20, maintenance_plans: { basic: { price: 0, hours: 0 }, standard: { price: 0, hours: 0 }, premium: { price: 0, hours: 0 } } }
    const q = quote(profile(real, { type: 'landing' }), real, rates)
    assert.ok(q.weeks[0] >= 3 && q.weeks[1] >= q.weeks[0])
    assert.deepEqual(Object.keys(q.schedule).sort(), ['build', 'foundation', 'launch'])
    assert.match(formatClient(q), /Cronograma estimado:[\s\S]*Total: \d+–\d+ semanas/)
    const faster = quote(profile(real, { type: 'landing' }), real, { ...rates, weekly_hours: 40 })
    assert.ok(faster.weeks[1] < q.weeks[1])
  })
})

describe('6. has_long_forms is detected', () => {
  test('from an editor dependency or a form with 8+ fields', () => {
    assert.match(detectSignals(makeRepo({ 'package.json': '{"dependencies":{"@tiptap/react":"2"}}' }), real).has_long_forms, /tiptap/)
    const fields = Array.from({ length: 8 }, (_, i) => `<Input name="f${i}" />`).join('\n')
    assert.match(detectSignals(makeRepo({ 'app/form.tsx': fields }), real).has_long_forms ?? '', /app\/form\.tsx/)
    assert.equal(detectSignals(makeRepo({ 'app/form.tsx': '<Input /><Input />' }), real).has_long_forms, undefined)
  })
})

describe('7. review before a PR into main', () => {
  test('which commands count', () => {
    assert.equal(prToMain('gh pr create --fill'), true)
    assert.equal(prToMain('gh pr create --base main --title x'), true)
    assert.equal(prToMain('gh pr create -B develop'), false)
    assert.equal(prToMain('gh pr merge 12 --squash'), true)
    assert.equal(prToMain('gh pr view 12'), false)
  })

  test('held once per commit with the instructions, then let through', () => {
    const root = makeRepo()
    spawnSync('git', ['init', '-q'], { cwd: root })
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'a'], { cwd: root })
    assert.equal(prReviewGate(root).block, false)
    withProfile(root, real)
    const first = prReviewGate(root)
    assert.equal(first.block, true)
    assert.match(first.message, /ponytail-review branch/)
    assert.equal(prReviewGate(root).block, false)
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'b'], { cwd: root })
    assert.equal(prReviewGate(root).block, true)
    const hook = spawnSync('node', [CLI, 'hook', 'pre-bash'], { cwd: root, encoding: 'utf8', input: JSON.stringify({ cwd: root, tool_input: { command: 'gh pr create --fill' } }) })
    assert.equal(hook.stdout, '')
    assert.ok(existsSync(join(root, '.mep/.gitignore')))
  })
})

describe('8. no database by default; payment links are not an integrated checkout', () => {
  const ids = (p: ReturnType<typeof profile>) => new Set(evaluate(p, real).map(e => e.item.id))

  test('a landing that sells with a payment link: no database, no checkout security, but the consumer rules', () => {
    const p = profile(real, { type: 'landing', capabilities: ['payment-links', 'analytics'], markets: ['MX'], signals: { has_forms: true, has_personal_data: true } })
    assert.equal(p.signals.has_db, false)
    const items = ids(p)
    for (const id of ['payment-links-setup', 'refund-policy', 'terms-of-service', 'mx-consumer-ecommerce']) assert.ok(items.has(id), id)
    for (const id of ['webhook-signature', 'webhook-idempotency', 'server-side-prices', 'hosted-checkout', 'rls-all-tables', 'no-sql-injection', 'data-view-states', 'migrations-backups']) assert.ok(!items.has(id), id)
    const db = stack(p, real).find(d => d.key === 'db')
    assert.equal(db?.value, 'none')
    assert.equal(stack(p, real).find(d => d.key === 'payments')?.value, 'stripe-payment-links')
  })

  test('integrated payments no longer imply a database; storing orders is explicit', () => {
    const p = profile(real, { type: 'landing', capabilities: ['payments'] })
    assert.equal(p.signals.has_db, false)
    assert.equal(stack(p, real).find(d => d.key === 'db')?.value, 'none')
    assert.ok(ids(p).has('webhook-signature'))
    const withOrders = profile(real, { type: 'ecommerce', capabilities: ['payments'], signals: { has_db: true } })
    assert.equal(stack(withOrders, real).find(d => d.key === 'db')?.value, 'postgresql')
    assert.equal(profile(real, { capabilities: ['uploads', 'realtime'] }).signals.has_db, false)
    assert.equal(profile(real, { capabilities: ['auth'] }).signals.has_db, true)
    assert.equal(profile(real, { ...real.presets.ecommerce }).signals.has_db, true)
  })

  test('/mep:audit: the stripe dependency alone is not payments; a buy link is payment-links', () => {
    const links = makeRepo({
      'package.json': JSON.stringify({ dependencies: { next: '15', stripe: '17' } }),
      'app/page.tsx': '<a href="https://buy.stripe.com/test_123">Comprar</a>',
    })
    const caps = inferProfile(links, real).profile.capabilities
    assert.ok(caps.includes('payment-links'))
    assert.ok(!caps.includes('payments'))
    assert.equal(inferProfile(links, real).profile.signals.has_db, false)
    const checkout = makeRepo({ 'package.json': '{"dependencies":{"stripe":"17"}}', 'app/api/checkout/route.ts': 'await stripe.checkout.sessions.create({ mode: "payment" })' })
    assert.ok(inferProfile(checkout, real).profile.capabilities.includes('payments'))
  })
})

describe('9. launch rules: legal, privacy and conversion', () => {
  test('a landing that sells by link and collects emails gets every rule it needs', () => {
    const p = profile(real, { type: 'landing', capabilities: ['payment-links', 'analytics', 'email'], markets: ['MX', 'EU:ES'], signals: { has_forms: true, has_personal_data: true } })
    const levels = new Map(evaluate(p, real).map(e => [e.item.id, e.level]))
    const required = ['privacy-policy', 'terms-of-service', 'eu-gdpr', 'marketing-consent', 'data-subject-requests', 'data-retention', 'data-processing-agreements', 'third-party-disclosure', 'breach-response-plan', 'intellectual-property', 'open-source-licenses', 'refund-policy', 'error-pages', 'cta-above-fold', 'unique-title', 'unique-description', 'og-image-default', 'favicon', 'sitemap-xml', 'robots-txt', 'a11y-alt-text', 'mobile-first', 'sticky-mobile-cta', 'a11y-form-errors', 'form-thank-you', 'analytics-installed']
    for (const id of required) assert.equal(levels.get(id), 'required', id)
    assert.equal(levels.has('consent-banner'), false)
    const withCookies = profile(real, { ...p, signals: { ...p.signals, has_nonessential_cookies: true } })
    assert.ok(evaluate(withCookies, real).some(e => e.item.id === 'consent-banner'))
  })

  test('outside the EU, DPAs are recommended; sticky CTA is required only on landings', () => {
    const mx = profile(real, { type: 'corporate', markets: ['MX'], signals: { has_personal_data: true } })
    const levels = new Map(evaluate(mx, real).map(e => [e.item.id, e.level]))
    assert.equal(levels.get('data-processing-agreements'), 'recommended')
    assert.equal(levels.get('sticky-mobile-cta'), 'recommended')
  })
})
