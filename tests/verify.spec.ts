import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { evaluate } from '../engine/src/evaluate.ts'
import { globToRegExp } from '../engine/src/files.ts'
import { routeExists } from '../engine/src/framework.ts'
import { recordReport } from '../engine/src/security.ts'
import { runCheck, verifyItems } from '../engine/src/verify.ts'
import type { Check } from '../engine/src/types.ts'
import { addFiles, item, makeRepo, profile, testCatalog } from './helpers.ts'

const c = testCatalog([item({ id: 'x' })])
const p = profile(c)
const run = (root: string, check: Check, mode: 'fast' | 'full' = 'full', prof = p) => runCheck(root, check, prof, 'x', mode)

const NEXT = { 'package.json': JSON.stringify({ dependencies: { next: '15.0.0', react: '19.0.0' } }) }

describe('glob', () => {
  test('**, *, nested braces', () => {
    assert.ok(globToRegExp('**/*.{ts,tsx}').test('src/a/b.tsx'))
    assert.ok(globToRegExp('**/*.ts').test('a.ts'))
    assert.ok(globToRegExp('{next.config.{js,mjs},vercel.json}').test('next.config.mjs'))
    assert.ok(!globToRegExp('src/*.ts').test('src/a/b.ts'))
  })
})

describe('file_exists', () => {
  test('any of several paths, with globs', () => {
    const root = makeRepo({ 'public/favicon.ico': '' })
    assert.equal(run(root, { type: 'file_exists', path: ['app/favicon.ico', 'public/favicon.ico'] }).ok, true)
    assert.equal(run(root, { type: 'file_exists', path: 'public/*.ico' }).ok, true)
    assert.equal(run(root, { type: 'file_exists', path: 'public/favicon.{svg,ico}' }).ok, true)
    assert.equal(run(root, { type: 'file_exists', path: 'README.md' }).ok, false)
  })
})

describe('route_exists', () => {
  test('Next.js app router, route groups, dynamic segments and metadata routes', () => {
    const root = makeRepo({ ...NEXT, 'app/(marketing)/refunds/page.tsx': '', 'app/blog/[slug]/page.tsx': '', 'app/robots.ts': '', 'app/not-found.tsx': '' })
    assert.ok(routeExists(root, '/refunds'))
    assert.ok(routeExists(root, '/blog/hola'))
    assert.ok(routeExists(root, '/robots.txt'))
    assert.ok(routeExists(root, '/404'))
    assert.ok(!routeExists(root, '/terms'))
  })

  test('Next.js pages router, Astro, Vite + React Router, public files', () => {
    assert.ok(routeExists(makeRepo({ ...NEXT, 'pages/about/index.tsx': '' }), '/about'))
    assert.ok(routeExists(makeRepo({ 'package.json': '{"dependencies":{"astro":"5"}}', 'src/pages/contacto.astro': '' }), '/contacto'))
    const vite = makeRepo({ 'package.json': '{"dependencies":{"vite":"6","react":"19"}}', 'src/router.tsx': "<Route path=\"/pricing\" element={<P/>} />\n{ path: '*', element: <NotFound/> }" })
    assert.ok(routeExists(vite, '/pricing'))
    assert.ok(routeExists(vite, '/404'))
    assert.ok(routeExists(makeRepo({ 'public/robots.txt': '' }), '/robots.txt'))
  })
})

describe('grep', () => {
  const root = makeRepo({ 'src/a.tsx': 'const x = 1\n<div dangerouslySetInnerHTML={{__html: y}} />', 'src/b.ts': 'ok' })
  test('present', () => {
    assert.equal(run(root, { type: 'grep', pattern: 'const x', glob: '**/*.tsx' }).ok, true)
    assert.equal(run(root, { type: 'grep', pattern: 'nope', glob: '**/*.tsx' }).ok, false)
  })
  test('absent: a match is a violation, with file and line', () => {
    const r = run(root, { type: 'grep', pattern: 'dangerouslySetInnerHTML', glob: '**/*.tsx', expect: 'absent' })
    assert.equal(r.ok, false)
    assert.equal(r.violation, true)
    assert.match(r.detail, /src\/a\.tsx:2/)
  })
  test('exclude', () => {
    assert.equal(run(root, { type: 'grep', pattern: 'dangerously', glob: '**/*', exclude: '**/*.tsx', expect: 'absent' }).ok, true)
  })
})

describe('json_key', () => {
  const root = makeRepo({ 'tsconfig.json': '{\n  // comment\n  "compilerOptions": { "strict": true, },\n}' })
  test('reads JSONC, checks key and value', () => {
    assert.equal(run(root, { type: 'json_key', file: 'tsconfig.json', key: 'compilerOptions.strict', value: true }).ok, true)
    assert.equal(run(root, { type: 'json_key', file: 'tsconfig.json', key: 'compilerOptions.strict', value: false }).ok, false)
    assert.equal(run(root, { type: 'json_key', file: 'tsconfig.json', key: 'compilerOptions.noEmit' }).ok, false)
    assert.equal(run(root, { type: 'json_key', file: 'missing.json', key: 'a' }).ok, false)
  })
})

describe('command', () => {
  const root = makeRepo()
  test('exit 0 passes, other codes fail, fast mode defers', () => {
    assert.equal(run(root, { type: 'command', run: 'true' }).ok, true)
    assert.equal(run(root, { type: 'command', run: 'echo boom >&2; exit 3' }).ok, false)
    assert.equal(run(root, { type: 'command', run: 'true' }, 'fast').ok, null)
  })
})

describe('html (on the build output)', () => {
  const page = (title: string, body: string, head = '') =>
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title}</title><meta name="description" content="${title} desc">${head}</head><body>${body}</body></html>`

  test('without a build it is unknown, not a pass', () => {
    assert.equal(run(makeRepo(), { type: 'html', rule: 'single_h1' }).ok, null)
  })

  test('single_h1, heading_order, unique_title, meta, absolute og:image', () => {
    const root = makeRepo({
      'out/index.html': page('Inicio', '<h1>A</h1><h2>B</h2><h3>C</h3>', '<meta property="og:image" content="https://x.com/og.png">'),
      'out/about.html': page('Inicio', '<h1>A</h1><h3>salta</h3>', '<meta property="og:image" content="/og.png">'),
      'out/404.html': page('Inicio', '<h1>No existe</h1>'),
    })
    const single = run(root, { type: 'html', rule: 'single_h1' })
    assert.equal(single.ok, true)
    const order = run(root, { type: 'html', rule: 'heading_order' })
    assert.equal(order.ok, false)
    assert.match(order.detail, /about\.html: salta de h1 a h3/)
    const unique = run(root, { type: 'html', rule: 'unique_title' })
    assert.equal(unique.ok, false)
    assert.match(unique.detail, /repetido/)
    assert.equal(run(root, { type: 'html', rule: 'charset' }).ok, true)
    assert.equal(run(root, { type: 'html', rule: 'meta', property: 'og:image' }).ok, false)
    assert.match(run(root, { type: 'html', rule: 'absolute_og_image' }).detail, /about\.html/)
    assert.equal(run(root, { type: 'html', rule: 'single_h1' }, 'fast').ok, null)
  })

  test('two h1 fail', () => {
    const root = makeRepo({ 'dist/index.html': page('A', '<h1>a</h1><h1>b</h1>') })
    assert.match(run(root, { type: 'html', rule: 'single_h1' }).detail, /2 <h1>/)
  })
})

describe('sql (RLS in migrations)', () => {
  test('a table without RLS is a violation; policies per operation', () => {
    const root = makeRepo({
      'supabase/migrations/001.sql': `create table public.projects (id uuid);\nalter table public.projects enable row level security;\ncreate policy "read" on public.projects for select using (true);\ncreate table notes (id uuid);`,
    })
    const rls = run(root, { type: 'sql', rule: 'rls_enabled' })
    assert.equal(rls.ok, false)
    assert.equal(rls.violation, true)
    assert.match(rls.detail, /notes/)
    addFiles(root, { 'supabase/migrations/002.sql': 'alter table notes enable row level security;\ncreate policy p on notes for all using (true);' })
    assert.equal(run(root, { type: 'sql', rule: 'rls_enabled' }).ok, true)
    const pol = run(root, { type: 'sql', rule: 'policies_per_operation' })
    assert.equal(pol.ok, false)
    assert.match(pol.detail, /projects: sin política insert\/update\/delete/)
    assert.equal(run(makeRepo(), { type: 'sql', rule: 'rls_enabled' }).ok, null)
  })
})

describe('manual', () => {
  test('pending until a person confirms it', () => {
    const root = makeRepo()
    assert.equal(run(root, { type: 'manual', prompt: '¿revisado?' }).ok, null)
    const confirmed = profile(c, { selections: { optional_added: [], recommended_skipped: [], overrides: [], manual_confirmed: [{ id: 'x', by: 'Engel', date: '2026-10-13' }], grace: [] } })
    assert.equal(run(root, { type: 'manual', prompt: '¿revisado?' }, 'full', confirmed).ok, true)
  })
})

describe('security items need a valid mep-security report', () => {
  const sc = testCatalog([item({ id: 'sec', category: 'security', verify: [{ type: 'file_exists', path: 'auth.ts' }, { type: 'manual', prompt: 'revisado' }] })])
  const sp = profile(sc)

  test('verify passing is not enough; a report ties it to the files it read and expires when they change', () => {
    const root = makeRepo({ 'auth.ts': 'v1' })
    const status = () => verifyItems(root, sp, evaluate(sp, sc), 'fast')[0].status
    assert.equal(status(), 'fail')
    recordReport(root, { id: 'sec', result: 'pass', files: ['auth.ts'], notes: 'ok' })
    assert.equal(status(), 'pass')
    addFiles(root, { 'auth.ts': 'v2' })
    assert.equal(status(), 'fail')
    recordReport(root, { id: 'sec', result: 'risk', files: ['auth.ts'], notes: 'x' })
    assert.equal(status(), 'fail')
  })
})
