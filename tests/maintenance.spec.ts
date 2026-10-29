import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { describe, test } from 'node:test'
import { gapReport, inferProfile } from '../engine/src/audit.ts'
import { loadCatalog } from '../engine/src/catalog.ts'
import { loadImages, parseMarkdown, toDocx, toPdf } from '../engine/src/docs.ts'
import { exportData, recordExport } from '../engine/src/export.ts'
import { closePhase, gate } from '../engine/src/gate.ts'
import { recordReview } from '../engine/src/review.ts'
import { checkCodemap, checkRegistry, writeCodemap, writeRegistry } from '../engine/src/maps.ts'
import { loadProfile, saveProfile } from '../engine/src/profile.ts'
import { calibrate, formatClient, loadRates, logTime, quote } from '../engine/src/quote.ts'
import { applyUpdate, catalogUpdates } from '../engine/src/update.ts'
import { compareVersions } from '../engine/src/version.ts'
import { CLI, addFiles, item, makeRepo, profile, tempDir, testCatalog, withProfile } from './helpers.ts'

const real = loadCatalog()

describe('/mep:update', () => {
  const catalog = testCatalog([
    item({ id: 'old', since: '2026.10.1' }),
    item({ id: 'new-closed', since: '2026.11.1', phase: 'foundation.setup' }),
    item({ id: 'new-open', since: '2026.11.1', phase: 'launch.ops', level: 'recommended' }),
    item({ id: 'new-other', since: '2026.11.1', when: { capabilities: ['payments'] } }),
    item({ id: 'changed', since: '2026.10.1', updated: '2026.11.1', phase: 'build.data' }),
  ])

  test('versions compare by parts', () => {
    assert.equal(compareVersions('2026.11.1', '2026.10.12'), 1)
    assert.equal(compareVersions('2026.10.1', '2026.10.1'), 0)
  })

  test('shows only new or modified items that apply to this profile', () => {
    const p = profile(catalog, { catalog_version: '2026.10.1' })
    const ids = catalogUpdates(p, catalog).map(u => `${u.item.id}:${u.change}`).sort()
    assert.deepEqual(ids, ['changed:modified', 'new-closed:new', 'new-open:new'])
  })

  test('new required items in a closed sub-phase get grace: no Stop block, but production and the next close require them', () => {
    const root = makeRepo({ 'old.txt': '' })
    const p = withProfile(root, catalog, { catalog_version: '2026.10.1', phase: { closed: ['foundation.setup'], active: 'foundation.design' } })
    assert.equal(gate(root, catalog, 'stop').block, true)
    const { profile: next, graced } = applyUpdate(p, catalog)
    assert.deepEqual(graced, ['new-closed'])
    assert.equal(next.catalog_version, catalog.version)
    saveProfile(root, next)
    assert.equal(gate(root, catalog, 'stop').block, false)
    assert.ok(gate(root, catalog, 'prod').blockers.some(b => b.item.id === 'new-closed'))
    const close = closePhase(root, catalog, 'foundation.design')
    assert.equal(close.closed, false)
    assert.ok(close.pending.some(r => r.item.id === 'new-closed'))
    addFiles(root, { 'new-closed.txt': '' })
    recordReview(root, { sub: 'foundation.design', tool: 'mep', must_fix: 0, notes: '' })
    assert.equal(closePhase(root, catalog, 'foundation.design', { env: { MEP_PONYTAIL: '0' } }).closed, true)
    assert.deepEqual(loadProfile(root, catalog).selections.grace, [])
  })
})

describe('/mep:audit', () => {
  test('infers capabilities, signals, counts and stack from the code, with evidence', () => {
    const root = makeRepo({
      'package.json': JSON.stringify({ name: 'estudio', dependencies: { next: '15', react: '19', stripe: '17', '@supabase/supabase-js': '2', resend: '4', 'next-intl': '3' } }),
      'app/page.tsx': '<form><input type="email" /></form>',
      'app/precios/page.tsx': '',
      'app/blog/page.tsx': '',
      'app/[locale]/page.tsx': '',
      'messages/es.json': '{}',
      'messages/en.json': '{}',
      'lib/billing.ts': 'stripe.billingPortal.sessions.create()',
      'supabase/migrations/001.sql': 'create table public.classes (id uuid); create table bookings (id uuid);',
    })
    const { profile: p, evidence } = inferProfile(root, real)
    assert.ok(['payments', 'subscriptions', 'email', 'i18n'].every(c => p.capabilities.includes(c)), p.capabilities.join())
    assert.equal(p.type, 'saas')
    assert.equal(p.signals.has_db, true)
    assert.equal(p.counts.entities, 2)
    assert.equal(p.counts.languages, 2)
    assert.equal(p.stack.decided.db_provider, 'supabase')
    assert.equal(evidence['capabilities.payments'], 'lib/billing.ts')
  })

  test('the gap report changes nothing in the repo', () => {
    const root = makeRepo({ 'package.json': '{"dependencies":{"next":"15"}}' })
    const results = gapReport(root, profile(real, { type: 'landing' }), real)
    assert.ok(results.length > 0)
    assert.equal(existsSync(join(root, '.mep')), false)
    assert.equal(existsSync(join(root, 'BRIEF.md')), false)
  })
})

describe('CODEMAP.md and REGISTRY.md', () => {
  const button = '/**\n * Para qué: acción principal o secundaria\n * No usar para: navegación (usar Link)\n * @example <Button>Guardar</Button>\n */\nexport function Button() {\n  return null\n}\n'

  test('registry --check fails on an export without entry, without description, or an entry pointing to nothing', () => {
    const root = makeRepo({ 'components/ui/button.tsx': button })
    assert.match(checkRegistry(root)[0], /falta REGISTRY\.md/)
    writeRegistry(root)
    assert.deepEqual(checkRegistry(root), [])
    const md = readFileSync(join(root, 'REGISTRY.md'), 'utf8')
    assert.match(md, /### Button\n- Ruta: components\/ui\/button\.tsx\n- Para qué: acción principal o secundaria/)
    assert.match(md, /- No usar para: navegación/)
    assert.doesNotMatch(md, /return null/)
    addFiles(root, { 'lib/slug.ts': 'export const slugify = (s: string) => s\n' })
    const errors = checkRegistry(root)
    assert.ok(errors.some(e => /slugify .* no está en REGISTRY\.md/.test(e)))
    assert.ok(errors.some(e => /slugify .* sin "Para qué"/.test(e)))
    addFiles(root, { 'components/ui/button.tsx': '' })
    assert.ok(checkRegistry(root).some(e => /apunta a components\/ui\/button\.tsx → Button, que ya no existe/.test(e)))
  })

  test('codemap lists folders and keeps manual notes', () => {
    const root = makeRepo({ 'package.json': '{"dependencies":{"next":"15"}}', 'app/page.tsx': '', 'components/x.tsx': '' })
    assert.match(checkCodemap(root)[0], /falta CODEMAP\.md/)
    writeCodemap(root, real)
    assert.deepEqual(checkCodemap(root), [])
    const file = join(root, 'CODEMAP.md')
    writeFileSync(file, readFileSync(file, 'utf8').replace(/(<!-- mep:manual -->\n)[\s\S]*?(\n<!-- \/mep:manual -->)/, '$1Los precios viven en lib/pricing.ts$2'))
    addFiles(root, { 'services/a.ts': '' })
    assert.match(checkCodemap(root)[0], /services\//)
    writeCodemap(root, real)
    assert.match(readFileSync(file, 'utf8'), /Los precios viven en lib\/pricing\.ts/)
    assert.match(readFileSync(file, 'utf8'), /\| `components\/` \| Componentes reutilizables/)
  })
})

describe('quote', () => {
  const config = tempDir('mep-config-')
  writeFileSync(join(config, 'rates.yaml'), 'currency: USD\nhourly_rate: 40\npm_overhead: 0.1\nrisk_buffer: 0.2\nrounding: 50\nmaintenance_plans:\n  basic: { price: 80, hours: 1 }\n')
  const env = { MEP_CONFIG_DIR: config }
  const catalog = testCatalog([
    item({ id: 'a', effort: { size: 'S', hours: [1, 3] } }),
    item({ id: 'per-lang', effort: { size: 'S', hours: [2, 4], scales_with: 'languages' } }),
    item({ id: 'opt', level: 'optional', effort: { size: 'M', hours: [3, 8] } }),
  ])

  test('same profile and rates, same quote; scales_with multiplies; custom work is marked', () => {
    const { rates } = loadRates(env)
    const p = profile(catalog, { context: 'client-project', counts: { languages: 2 }, custom_work: [{ title: 'Agenda por instructor', size: 'M' }] })
    const q = quote(p, catalog, rates)
    assert.deepEqual(q, quote(structuredClone(p), catalog, rates))
    assert.deepEqual(q.lines.find(l => l.id === 'per-lang')?.hours, [4, 8])
    assert.ok(q.lines.some(l => l.custom && l.title.includes('estimación a revisar')))
    assert.deepEqual(q.subtotal, [8, 19])
    assert.equal(q.price[0], Object.values(q.byPhase).reduce((s, r) => s + r[0], 0))
    assert.equal(q.extrasPrice[0].id, 'opt')
  })

  test('the client view shows no rate, margins or buffer', () => {
    const { rates } = loadRates(env)
    const text = formatClient(quote(profile(catalog, { context: 'client-project' }), catalog, rates))
    assert.doesNotMatch(text, /40\/h|tarifa|Gestión|Colchón|10%|20%/i)
    assert.match(text, /Total:/)
    assert.match(text, /Planes de mantenimiento/)
  })

  test('log-time stays outside the repo; calibrate suggests a range with 3+ measurements', () => {
    const root = makeRepo()
    const p = profile(real, { project: 'Demo' })
    for (const h of [6, 7, 9]) logTime(p, 'robots-txt', h, env)
    const file = join(config, 'actuals', 'demo.yaml')
    assert.ok(existsSync(file))
    assert.equal(existsSync(join(root, '.mep')), false)
    const s = calibrate(real, env).find(x => x.id === 'robots-txt')
    assert.equal(s?.median, 7)
    assert.deepEqual(s?.current, [0.5, 1])
  })

  test('/mep:add shows the impact in hours and price', () => {
    const root = makeRepo({ 'p.yaml': 'project: x\ntype: saas\ncapabilities: [auth]\n', 'c.yaml': 'capabilities: [auth, payments]\n' })
    const run = (args: string[]) => spawnSync('node', [CLI, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } }).stdout
    assert.match(run(['init', '--from', 'p.yaml']), /Cotización: .* USD/)
    assert.match(run(['add', '--from', 'c.yaml']), /Impacto: \+[\d.]+ a \+[\d.]+ h · \+[\d,]+ a \+[\d,]+ USD/)
  })
})

describe('/mep:export', () => {
  const md = '# Brief — Estudio\n\n**Versión 1**\n\n## Alcance\n- Reservas\n- Pagos y **suscripciones**\n\n| Fase | Precio |\n| --- | --- |\n| Cimientos | 450 USD |\n\n> Checklist orientativo, no sustituye asesoría legal.\n'

  test('the Markdown subset parses into blocks', () => {
    const kinds = parseMarkdown(md).map(b => b.kind)
    assert.deepEqual(kinds, ['heading', 'paragraph', 'heading', 'list', 'table', 'quote'])
  })

  test('produces a valid .docx (zip with the document) and a .pdf', () => {
    const blocks = parseMarkdown(md)
    const docx = toDocx(blocks)
    assert.equal(docx.subarray(0, 2).toString(), 'PK')
    assert.ok(docx.includes(Buffer.from('word/document.xml')))
    assert.ok(docx.includes(Buffer.from('Pagos y ')))
    const pdf = toPdf(blocks)
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
    assert.match(pdf.toString('latin1'), /\/Count 1/)
    assert.match(pdf.toString('latin1'), /%%EOF\n$/)
  })

  test('versions and changes against the previous export', () => {
    const root = makeRepo()
    const p1 = profile(real, { project: 'x', type: 'saas', capabilities: ['auth'] })
    assert.equal(exportData(root, p1, real, 'es').version, 1)
    recordExport(root, p1, real, 'es', ['docs/client/brief-v1.pdf'])
    const p2 = profile(real, { project: 'x', type: 'saas', capabilities: ['auth', 'payments'] })
    const data = exportData(root, p2, real, 'es')
    assert.equal(data.version, 2)
    assert.deepEqual(data.changes?.capabilities_added, ['payments'])
    assert.ok(data.changes?.added.includes('hosted-checkout'))
    assert.ok(data.out_of_scope.capabilities_not_included.includes('ugc'))
    assert.ok(data.acceptance_criteria.length > 0)
    recordExport(root, p2, real, 'es', [], undefined, 1)
    assert.equal(exportData(root, p2, real, 'es').version, 2)
  })
})

describe('images in the client documents', () => {
  // A valid w×h PNG, RGB (color type 2) or RGBA (6), every row with filter 0.
  function png(w: number, h: number, alpha: boolean): Buffer {
    const crcTable = Array.from({ length: 256 }, (_, n) => {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      return c >>> 0
    })
    const crc = (b: Buffer) => {
      let c = 0xffffffff
      for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8)
      return (c ^ 0xffffffff) >>> 0
    }
    const chunk = (type: string, data: Buffer) => {
      const td = Buffer.concat([Buffer.from(type), data])
      const len = Buffer.alloc(4)
      len.writeUInt32BE(data.length)
      const c = Buffer.alloc(4)
      c.writeUInt32BE(crc(td))
      return Buffer.concat([len, td, c])
    }
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(w, 0)
    ihdr.writeUInt32BE(h, 4)
    ihdr[8] = 8
    ihdr[9] = alpha ? 6 : 2
    const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * (alpha ? 4 : 3), 200)])
    const raw = Buffer.concat(Array.from({ length: h }, () => row))
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
  }
  const dir = () => {
    const root = makeRepo()
    writeFileSync(join(root, 'rgb.png'), png(2, 2, false))
    writeFileSync(join(root, 'rgba.png'), png(2, 2, true))
    return root
  }
  const md = '# Plan\n\n![Gantt](rgb.png)\n\n![Recorrido](rgba.png)\n'

  test('markdown image line becomes an image block', () => {
    assert.deepEqual(parseMarkdown('![Gantt](diagrams/implementation-gantt.png)'), [{ kind: 'image', alt: 'Gantt', path: 'diagrams/implementation-gantt.png' }])
  })

  test('docx embeds the PNG', () => {
    const docx = toDocx(loadImages(parseMarkdown(md), dir()))
    assert.ok(docx.includes(Buffer.from('word/media/image1.png')))
    assert.ok(docx.includes(Buffer.from('word/media/image2.png')))
    assert.ok(docx.includes(Buffer.from('Extension="png"')))
    assert.ok(docx.includes(Buffer.from('r:embed="rIdImg1"')))
  })

  test('pdf embeds RGB and RGBA PNGs', () => {
    const pdf = toPdf(loadImages(parseMarkdown(md), dir())).toString('latin1')
    assert.equal(pdf.match(/\/Subtype \/Image/g)?.length, 3) // two images and one alpha mask
    assert.match(pdf, /\/SMask/)
    assert.match(pdf, /\/XObject << \/Im1 \d+ 0 R \/Im2 \d+ 0 R >>/)
  })

  test('missing image fails with its path', () => {
    assert.throws(() => loadImages(parseMarkdown('![x](diagrams/x.png)'), makeRepo()), /falta la imagen diagrams\/x\.png/)
    assert.throws(() => loadImages(parseMarkdown('![x](x.jpg)'), makeRepo({ 'x.jpg': 'x' })), /solo PNG: x\.jpg/)
  })

  test('mep export stops on a missing image and names it', () => {
    const root = makeRepo({ 'docs/client/implementation-v1.md': '# Plan\n\n![Gantt](missing.png)\n' })
    withProfile(root, real, { project: 'x', type: 'saas' })
    const r = spawnSync('node', [CLI, 'export', '--in', 'docs/client/implementation-v1.md'], { cwd: root, encoding: 'utf8' })
    assert.notEqual(r.status, 0)
    assert.match(r.stdout + r.stderr, /falta la imagen missing\.png/)
  })
})
