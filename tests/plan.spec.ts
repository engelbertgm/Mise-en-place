// 0.3.0 / catalog 2026.10.9: planning documents in docs/plan/, checked by the engine.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { checkPlan } from '../engine/src/plan.ts'
import type { Check, Profile } from '../engine/src/types.ts'
import { loadCatalog } from '../engine/src/catalog.ts'
import { renderCodemap } from '../engine/src/maps.ts'
import { REAL_CATALOG, makeRepo, profile, testCatalog } from './helpers.ts'

type PlanCheck = Extract<Check, { type: 'plan' }>
const catalog = testCatalog([])
const prof = (partial: Partial<Profile> = {}) => profile(catalog, { type: 'saas', ...partial })
const run = (files: Record<string, string>, check: Omit<PlanCheck, 'type'>, p = prof()) => checkPlan(makeRepo(files), { type: 'plan', ...check }, p)

describe('plan documents', () => {
  test('missing document fails with its path', () => {
    const r = run({}, { doc: 'prd', rule: 'sections', sections: ['resumen'] })
    assert.equal(r.ok, false)
    assert.match(r.detail, /falta docs\/plan\/PRD\.md/)
  })

  test('sections are found by marker, in any language, with CRLF', () => {
    const files = { 'docs/plan/PRD.md': '# PRD\r\n\r\n## Summary\r\n<!-- mep:resumen -->\r\ntext\r\n' }
    assert.equal(run(files, { doc: 'prd', rule: 'sections', sections: ['resumen'] }).ok, true)
    const r = run(files, { doc: 'prd', rule: 'sections', sections: ['resumen', 'metas'] })
    assert.equal(r.ok, false)
    assert.match(r.detail, /metas/)
  })

  test('custom_work titles must appear (case-insensitive)', () => {
    const p = prof({ custom_work: [{ title: 'Agenda de clases por instructor', size: 'L' }] })
    assert.equal(run({ 'docs/plan/PRD.md': 'Incluye la agenda de clases por instructor.' }, { doc: 'prd', rule: 'custom_work' }, p).ok, true)
    const r = run({ 'docs/plan/PRD.md': 'Nada.' }, { doc: 'prd', rule: 'custom_work' }, p)
    assert.equal(r.ok, false)
    assert.match(r.detail, /Agenda de clases por instructor/)
  })

  test('stack decisions must appear in TRD', () => {
    const p = prof({ stack: { decided: { framework: 'Next.js' } } })
    assert.equal(run({ 'docs/plan/TRD.md': 'Usamos next.js con App Router.' }, { doc: 'trd', rule: 'stack' }, p).ok, true)
    const r = run({ 'docs/plan/TRD.md': 'Usamos Astro.' }, { doc: 'trd', rule: 'stack' }, p)
    assert.equal(r.ok, false)
    assert.match(r.detail, /Next\.js/)
  })

  test('phases: every listed phase as a code heading in the fases section; build.data only with has_db', () => {
    const files = { 'docs/plan/IMPLEMENTATION.md': '## Fases\n<!-- mep:fases -->\n### `foundation.setup`\nx\n### `build.ux`\ny\n## Hitos\n<!-- mep:hitos -->\n### `build.data`\n' }
    const check = { doc: 'implementation', rule: 'phases', phases: ['foundation.setup', 'build.data', 'build.ux'] } satisfies Omit<PlanCheck, 'type'>
    assert.equal(run(files, check, prof({ signals: { has_db: false } })).ok, true)
    const r = run(files, check, prof({ signals: { has_db: true } }))
    assert.equal(r.ok, false)
    assert.match(r.detail, /build\.data/)
  })

  test('diagrams: required types by file name, linked images must exist', () => {
    const doc = { 'docs/plan/PRD.md': '![j](diagrams/prd-journey.png)\n' }
    const png = { 'docs/plan/diagrams/prd-journey.png': 'png' }
    assert.equal(run({ ...doc, ...png }, { doc: 'prd', rule: 'diagrams', required: ['journey|story-map'] }).ok, true)
    const missing = run(doc, { doc: 'prd', rule: 'diagrams', required: [] })
    assert.equal(missing.ok, false)
    assert.match(missing.detail, /diagrams\/prd-journey\.png/)
    const arch = run({ ...doc, ...png }, { doc: 'prd', rule: 'diagrams', required: ['architecture'] })
    assert.equal(arch.ok, false)
    assert.match(arch.detail, /architecture/)
  })

  test('diagrams: if_capabilities skips the requirement when no capability matches', () => {
    const files = { 'docs/plan/FLOWS.md': 'flujos' }
    const check = { doc: 'flows', rule: 'diagrams', required: ['sequence'], if_capabilities: ['auth', 'payments'] } satisfies Omit<PlanCheck, 'type'>
    assert.equal(run(files, check, prof({ capabilities: [] })).ok, true)
    assert.equal(run(files, check, prof({ capabilities: ['auth'] })).ok, false)
  })
})

describe('plan drift against the code', () => {
  const app = {
    'package.json': '{"dependencies":{"next":"15.0.0"}}',
    'app/page.tsx': 'export default function P() {}',
    'app/(marketing)/precios/page.tsx': 'export default function P() {}',
    'app/blog/[slug]/page.tsx': 'export default function P() {}',
    'app/api/x/route.ts': 'export function GET() {}',
  }
  const flows = (screens: string[]) => ({ 'docs/plan/FLOWS.md': `## Pantallas\n<!-- mep:pantallas -->\n${screens.map(s => `- \`${s}\`: algo`).join('\n')}\n## Flujos\n<!-- mep:flujos -->\n` })

  test('routes: every page route appears in code in the pantallas section', () => {
    assert.equal(run({ ...app, ...flows(['/', '/precios', '/blog/[slug]']) }, { doc: 'flows', rule: 'routes' }).ok, true)
    const r = run({ ...app, ...flows(['/', '/precios']) }, { doc: 'flows', rule: 'routes' })
    assert.equal(r.ok, false)
    assert.match(r.detail, /\/blog\/\[slug\]/)
    assert.doesNotMatch(r.detail, /api/)
  })

  test('tables: migrations and SCHEMA list the same tables, normalized', () => {
    const migration = { 'supabase/migrations/001.sql': 'create table public."Orders" (id int);\ncreate table profiles (id int);\n' }
    const schema = (names: string[]) => ({ 'docs/plan/SCHEMA.md': `## Tablas\n<!-- mep:tablas -->\n${names.map(n => `### \`${n}\`\n`).join('')}## Relaciones\n<!-- mep:relaciones -->\n` })
    assert.equal(run({ ...migration, ...schema(['orders', 'profiles']) }, { doc: 'schema', rule: 'tables' }).ok, true)
    const extra = run({ ...migration, ...schema(['orders', 'profiles', 'invoices']) }, { doc: 'schema', rule: 'tables' })
    assert.equal(extra.ok, false)
    assert.match(extra.detail, /sobra invoices/)
    const missing = run({ ...migration, ...schema(['orders']) }, { doc: 'schema', rule: 'tables' })
    assert.equal(missing.ok, false)
    assert.match(missing.detail, /falta profiles/)
  })

  test('codemap lists the same pages after the pageRoutes refactor', () => {
    const md = renderCodemap(makeRepo(app), loadCatalog(REAL_CATALOG))
    for (const r of ['`/`', '`/precios`', '`/blog/[slug]`']) assert.ok(md.includes(r), r)
  })
})
