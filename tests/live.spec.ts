// 0.2.0 / catalog 2026.10.7: checks that prove behavior on the deployed site and in DNS, not text in the code.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { after, before, describe, test } from 'node:test'
import { checkHtml } from '../engine/src/html.ts'
import { checkLive, dmarcResult, spfResult } from '../engine/src/live.ts'
import { normalizeProfile } from '../engine/src/profile.ts'
import { verifyItems } from '../engine/src/verify.ts'
import { evaluate } from '../engine/src/evaluate.ts'
import { item, makeRepo, testCatalog } from './helpers.ts'

// A site in a process of its own (the checks fetch synchronously from a child process).
// `good` does everything right; `bad` does everything wrong.
const SERVER = String.raw`
const http = require('node:http'), zlib = require('node:zlib')
const good = process.argv[1] === 'good'
const page = body => '<!doctype html><html><head><script src="/_next/static/chunks/app-3f9a1c.js"></script></head><body>' + body + '</body></html>'
http.createServer((req, res) => {
  const send = (status, body, headers = {}) => {
    const gz = good && /gzip/.test(req.headers['accept-encoding'] || '')
    res.writeHead(status, { 'content-type': 'text/html', ...(gz ? { 'content-encoding': 'gzip' } : {}), ...headers })
    res.end(gz ? zlib.gzipSync(body) : body)
  }
  const secure = good ? { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'", 'strict-transport-security': 'max-age=63072000' } : {}
  if (req.url === '/') return send(200, page('<h1>Hola</h1>'), { ...secure, 'set-cookie': good ? 'session=abc; Path=/; Secure; HttpOnly; SameSite=Lax' : 'session=abc; Path=/' })
  if (req.url.startsWith('/_next/static/')) return send(200, 'x', { 'cache-control': good ? 'public, max-age=31536000, immutable' : 'no-cache' })
  if (req.url === '/sitemap.xml') return send(200, '<urlset><url><loc>https://example.com/about</loc></url>' + (good ? '' : '<url><loc>https://example.com/dashboard</loc></url><url><loc>https://example.com/draft</loc></url>') + '</urlset>')
  if (req.url === '/about') return send(200, page('about'))
  if (req.url === '/draft') return send(200, page('<meta name="robots" content="noindex">'))
  return good ? send(404, page('No encontrado')) : send(200, 'Error: boom\n    at handler (/app/node_modules/x/index.js:1:1)')
}).listen(0, '127.0.0.1', function () { process.stdout.write(String(this.address().port) + '\n') })
`

const servers: ChildProcess[] = []
const urls: Record<'good' | 'bad', string> = { good: '', bad: '' }

function start(kind: 'good' | 'bad'): Promise<string> {
  const child = spawn(process.execPath, ['-e', SERVER, kind], { stdio: ['ignore', 'pipe', 'inherit'] })
  servers.push(child)
  return new Promise(resolve => child.stdout!.once('data', d => resolve(`http://127.0.0.1:${String(d).trim()}`)))
}

const profile = (url?: string) => normalizeProfile({ project: 'x', type: 'saas', ...(url ? { urls: { preview: url } } : {}) }, testCatalog([]))
const live = (url: string, rule: string, extra: object = {}) => checkLive(profile(url), { type: 'live', rule, ...extra } as never, 'full', {})

describe('live checks against the deployed site', () => {
  before(async () => {
    urls.good = await start('good')
    urls.bad = await start('bad')
  })
  after(() => servers.forEach(s => s.kill()))

  test('a site that does it right passes every rule', () => {
    const names = ['x-content-type-options', 'referrer-policy', 'x-frame-options|frame-ancestors', 'content-security-policy']
    assert.equal(live(urls.good, 'headers', { names }).ok, true)
    assert.equal(live(urls.good, 'hsts').ok, true)
    assert.equal(live(urls.good, 'compression').ok, true, live(urls.good, 'compression').detail)
    assert.equal(live(urls.good, 'cookies').ok, true)
    assert.equal(live(urls.good, 'error_page').ok, true)
    assert.equal(live(urls.good, 'sitemap').ok, true, live(urls.good, 'sitemap').detail)
  })

  test('a site that does it wrong fails each rule, saying what is wrong', () => {
    assert.match(live(urls.bad, 'headers', { names: ['x-content-type-options', 'x-frame-options|frame-ancestors'] }).detail, /no envía: x-content-type-options, x-frame-options\|frame-ancestors/)
    assert.match(live(urls.bad, 'hsts').detail, /no envía Strict-Transport-Security/)
    assert.match(live(urls.bad, 'compression').detail, /sin compresión/)
    assert.match(live(urls.bad, 'cookies').detail, /session sin Secure, SameSite, HttpOnly/)
    assert.match(live(urls.bad, 'error_page').detail, /404 suave/)
    const sitemap = live(urls.bad, 'sitemap')
    assert.equal(sitemap.ok, false)
    assert.deepEqual(sitemap.all, ['/dashboard: página privada o de búsqueda', '/draft: es noindex'])
  })

  test('without a site to check, live checks are skipped: they never pass or fail an item alone', () => {
    const r = checkLive(profile(), { type: 'live', rule: 'hsts' }, 'full', {})
    assert.equal(r.skip, true)
    assert.match(r.detail, /sin URL del sitio/)
    const c = testCatalog([
      item({ id: 'only-live', verify: [{ type: 'live', rule: 'hsts' }] }),
      item({ id: 'code-and-live', verify: [{ type: 'file_exists', path: 'a.txt' }, { type: 'live', rule: 'hsts' }] }),
    ])
    const p = normalizeProfile({ project: 'x' }, c)
    const results = new Map(verifyItems(makeRepo({ 'a.txt': 'x' }), p, evaluate(p, c), 'full').map(r => [r.item.id, r.status]))
    assert.equal(results.get('only-live'), 'unknown')
    assert.equal(results.get('code-and-live'), 'pass')
  })

  test('MEP_URL overrides the profile (CI against a preview)', () => {
    assert.equal(checkLive(profile(), { type: 'live', rule: 'hsts' }, 'full', { MEP_URL: urls.good }).ok, true)
  })
})

describe('DNS for email', () => {
  test('SPF: one record, never +all', () => {
    assert.equal(spfResult(['v=spf1 include:_spf.resend.com ~all']).ok, true)
    assert.match(spfResult([]).detail, /sin registro SPF/)
    assert.match(spfResult(['v=spf1 ~all', 'v=spf1 -all']).detail, /uno solo/)
    assert.match(spfResult(['v=spf1 +all']).detail, /\+all/)
  })

  test('DMARC: a record with a policy; p=none passes and says so', () => {
    assert.equal(dmarcResult(['v=DMARC1; p=reject; rua=mailto:d@x.com']).ok, true)
    assert.match(dmarcResult(['v=DMARC1; p=none']).detail, /solo monitorea/)
    assert.equal(dmarcResult(['v=DMARC1; rua=mailto:d@x.com']).ok, false)
    assert.equal(dmarcResult([]).ok, false)
  })
})

describe('clean internal links (build output)', () => {
  test('uppercase, underscores, .php and bare IDs are flagged', () => {
    const html = (links: string) => `<!doctype html><html><body>${links}</body></html>`
    const ok = makeRepo({ 'out/index.html': html('<a href="/precios">a</a><a href="/blog/mi-post">b</a><a href="/_next/static/x.js">c</a>') })
    assert.equal(checkHtml(ok, { type: 'html', rule: 'clean_links' }).ok, true)
    const bad = makeRepo({ 'out/index.html': html('<a href="/Precios">a</a><a href="/user_profile">b</a><a href="/p/1234567">c</a>') })
    assert.match(checkHtml(bad, { type: 'html', rule: 'clean_links' }).detail, /\/Precios, \/user_profile, \/p\/1234567/)
  })
})
