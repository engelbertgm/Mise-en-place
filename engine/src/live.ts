import { execFileSync } from 'node:child_process'
import type { Check, CheckResult, Profile } from './types.ts'

// Checks against the deployed site and its DNS: what the code says it does, proved where it runs.
// The engine is synchronous, so each request runs in a short child process (Node's own fetch and dns).
// Without a site to check, a result is `skip`: it neither passes nor fails the item.

type LiveCheck = Extract<Check, { type: 'live' }>
type DnsCheck = Extract<Check, { type: 'dns' }>
type Mode = 'fast' | 'full'

export type Fetched = { status: number; headers: Record<string, string>; cookies: string[]; body: string; error?: string }

const FETCH = `
const [url, redirect] = process.argv.slice(1)
try {
  const r = await fetch(url, { redirect, headers: { 'accept-encoding': 'br, gzip', 'user-agent': 'mep-check' }, signal: AbortSignal.timeout(10000) })
  const body = redirect === 'manual' ? '' : (await r.text()).slice(0, 300000)
  process.stdout.write(JSON.stringify({ status: r.status, headers: Object.fromEntries(r.headers), cookies: r.headers.getSetCookie(), body }))
} catch (e) {
  process.stdout.write(JSON.stringify({ status: 0, headers: {}, cookies: [], body: '', error: String(e?.cause?.code ?? e?.message ?? e) }))
}`

const TXT = `
const [name] = process.argv.slice(1)
const { promises } = await import('node:dns')
promises.resolveTxt(name).then(r => process.stdout.write(JSON.stringify(r.map(x => x.join('')))), e => process.stdout.write(JSON.stringify({ error: e.code })))`

const cache = new Map<string, Fetched>()

/** One request per URL and redirect mode per run. */
export function fetchSync(url: string, redirect: 'follow' | 'manual' = 'follow'): Fetched {
  const key = `${redirect} ${url}`
  const hit = cache.get(key)
  if (hit) return hit
  let res: Fetched
  try {
    res = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', FETCH, url, redirect], { encoding: 'utf8', timeout: 15_000, stdio: ['ignore', 'pipe', 'ignore'] }))
  } catch (e) {
    res = { status: 0, headers: {}, cookies: [], body: '', error: (e as Error).message.split('\n')[0] }
  }
  cache.set(key, res)
  return res
}

function txtSync(name: string): string[] | { error: string } {
  try {
    return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', TXT, name], { encoding: 'utf8', timeout: 10_000, stdio: ['ignore', 'pipe', 'ignore'] }))
  } catch {
    return { error: 'TIMEOUT' }
  }
}

/** The site to check: MEP_URL wins (CI, a preview), then the profile's production, then its preview URL. */
export function liveTarget(profile: Profile, env = process.env): string | undefined {
  return (env.MEP_URL || profile.urls?.production || profile.urls?.preview)?.replace(/\/+$/, '')
}

const skip = (detail: string): CheckResult => ({ ok: null, detail, skip: true })
const NO_URL = 'sin URL del sitio: define urls.preview o urls.production en el perfil (/mep:add) o MEP_URL'

/** Error pages that leak how the app is built. */
const LEAK = /\bat [\w.<>]+ \(|node_modules\/|Traceback \(most recent|SQLSTATE|PrismaClient\w*Error|stack":|ECONNREFUSED/

/** Paths a sitemap must never list. */
const PRIVATE = /\/(dashboard|account|cuenta|checkout|carrito|cart|login|iniciar-sesion|signin|signup|registro|admin|api|settings|ajustes)(\/|$)|[?&](q|s|search|query)=/i

function headerPresent(res: Fetched, name: string): boolean {
  if (name === 'frame-ancestors') return /frame-ancestors/i.test(res.headers['content-security-policy'] ?? '')
  return res.headers[name.toLowerCase()] !== undefined
}

function checkHeaders(home: Fetched, names: string[]): CheckResult {
  // An entry with `|` passes when any of its alternatives is present.
  const missing = names.filter(entry => !entry.split('|').some(alt => headerPresent(home, alt)))
  return missing.length ? { ok: false, detail: `el sitio no envía: ${missing.join(', ')}`, all: missing } : { ok: true, detail: `encabezados presentes: ${names.join(', ')}` }
}

function checkHsts(home: Fetched): CheckResult {
  const value = home.headers['strict-transport-security']
  const age = Number(value?.match(/max-age=(\d+)/i)?.[1] ?? 0)
  if (!value) return { ok: false, detail: 'el sitio no envía Strict-Transport-Security' }
  return age >= 15_552_000 ? { ok: true, detail: `HSTS max-age=${age}` } : { ok: false, detail: `HSTS max-age=${age}: menos de 180 días` }
}

function checkCompression(base: string, home: Fetched): CheckResult {
  const encoding = home.headers['content-encoding'] ?? ''
  if (!/br|gzip|zstd/.test(encoding)) return { ok: false, detail: 'el HTML se sirve sin compresión (falta Brotli o gzip)' }
  const asset = home.body.match(/["'](\/(?:_next\/static|assets|_astro|build)\/[^"'?#\s]+\.(?:js|css))["']/)?.[1]
  if (!asset) return { ok: true, detail: `HTML con ${encoding}; no se encontró un asset con hash que revisar` }
  const cache = fetchSync(base + asset).headers['cache-control'] ?? ''
  const maxAge = Number(cache.match(/max-age=(\d+)/)?.[1] ?? 0)
  return /immutable/.test(cache) || maxAge >= 31_536_000
    ? { ok: true, detail: `HTML con ${encoding}; ${asset} con Cache-Control "${cache}"` }
    : { ok: false, detail: `${asset} sin caché larga: Cache-Control "${cache || 'ausente'}" (se espera max-age=31536000, immutable)` }
}

/** Every cookie the pages set: Secure and SameSite always; HttpOnly for anything that looks like a session. */
function checkCookies(base: string, home: Fetched, paths: string[]): CheckResult {
  const cookies = [...home.cookies, ...paths.flatMap(p => fetchSync(base + p).cookies)]
  if (!cookies.length) return { ok: true, detail: `sin cookies en ${['/', ...paths].join(', ')}` }
  const problems = [...new Set(cookies)].flatMap(c => {
    const name = c.split('=')[0]!.trim()
    const flags = c.toLowerCase()
    const missing = [!/;\s*secure/.test(flags) && 'Secure', !/;\s*samesite=/.test(flags) && 'SameSite', /sess|auth|token|sid|jwt/i.test(name) && !/;\s*httponly/.test(flags) && 'HttpOnly'].filter(Boolean)
    return missing.length ? [`${name} sin ${missing.join(', ')}`] : []
  })
  return problems.length ? { ok: false, detail: problems.slice(0, 5).join('; '), all: problems } : { ok: true, detail: `${cookies.length} cookie(s) con Secure, SameSite y HttpOnly donde aplica` }
}

function checkErrorPage(base: string): CheckResult {
  const res = fetchSync(`${base}/mep-check-404-${Date.now().toString(36)}`)
  if (res.status === 200) return { ok: false, detail: 'una ruta inexistente responde 200 (404 suave): debe responder 404' }
  const leak = res.body.match(LEAK)?.[0]
  return leak ? { ok: false, detail: `la página de error muestra detalles internos ("${leak}")` } : { ok: true, detail: `ruta inexistente → ${res.status}, sin detalles internos` }
}

function checkCanonicalRedirect(base: string): CheckResult {
  const url = new URL(base)
  if (url.protocol !== 'https:') return skip('la URL del sitio no es https://')
  const problems: string[] = []
  const http = fetchSync(`http://${url.host}/`, 'manual')
  if (http.status && !(http.status >= 300 && http.status < 400 && /^https:/.test(http.headers.location ?? ''))) problems.push(`http:// responde ${http.status} sin redirigir a https://`)
  const other = url.host.startsWith('www.') ? url.host.slice(4) : `www.${url.host}`
  const alt = fetchSync(`https://${other}/`, 'manual')
  // A variant with no DNS record is fine: nothing to redirect.
  if (alt.status && !(alt.status >= 300 && alt.status < 400 && (alt.headers.location ?? '').includes(url.host))) problems.push(`${other} responde ${alt.status} sin redirigir a ${url.host}`)
  return problems.length ? { ok: false, detail: problems.join('; ') } : { ok: true, detail: `http:// y ${other} llevan a ${url.origin}` }
}

/** The sitemap lists only public, indexable pages. Production URLs are checked on the target's origin. */
function checkSitemap(base: string): CheckResult {
  const res = fetchSync(`${base}/sitemap.xml`)
  if (res.status !== 200) return { ok: false, detail: `/sitemap.xml responde ${res.status}` }
  const locs = [...res.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]!)
  if (!locs.length) return { ok: false, detail: 'el sitemap no lista ninguna URL' }
  const problems: string[] = []
  for (const loc of locs.slice(0, 30)) {
    let path = loc
    try {
      const u = new URL(loc)
      path = u.pathname + u.search
    } catch {
      // A relative <loc> is checked as it is.
    }
    if (PRIVATE.test(path)) {
      problems.push(`${path}: página privada o de búsqueda`)
      continue
    }
    const page = fetchSync(base + path)
    if (page.status !== 200) problems.push(`${path}: responde ${page.status}`)
    else if (/noindex/i.test(page.headers['x-robots-tag'] ?? '') || /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(page.body)) problems.push(`${path}: es noindex`)
  }
  return problems.length ? { ok: false, detail: problems.slice(0, 5).join('; '), all: problems } : { ok: true, detail: `${Math.min(locs.length, 30)} URL(s) del sitemap públicas e indexables` }
}

export function checkLive(profile: Profile, check: LiveCheck, mode: Mode, env = process.env): CheckResult {
  if (mode === 'fast') return skip('se verifica contra el sitio desplegado en /mep:check')
  const base = liveTarget(profile, env)
  if (!base) return skip(NO_URL)
  const home = fetchSync(`${base}/`)
  if (!home.status) return { ok: null, detail: `no se pudo abrir ${base}: ${home.error ?? 'sin respuesta'}` }
  switch (check.rule) {
    case 'headers':
      return checkHeaders(home, check.names ?? [])
    case 'hsts':
      return checkHsts(home)
    case 'compression':
      return checkCompression(base, home)
    case 'cookies':
      return checkCookies(base, home, check.paths ?? [])
    case 'error_page':
      return checkErrorPage(base)
    case 'canonical_redirect':
      return checkCanonicalRedirect(base)
    case 'sitemap':
      return checkSitemap(base)
  }
}

/** SPF: exactly one v=spf1 record, not ending in +all. */
export function spfResult(records: string[]): CheckResult {
  const spf = records.filter(r => /^v=spf1\b/i.test(r))
  if (!spf.length) return { ok: false, detail: 'sin registro SPF (v=spf1)' }
  if (spf.length > 1) return { ok: false, detail: `${spf.length} registros SPF: debe haber uno solo` }
  return /\+all\b/.test(spf[0]!) ? { ok: false, detail: 'SPF con +all: autoriza a cualquiera a enviar' } : { ok: true, detail: spf[0]! }
}

/** DMARC: a v=DMARC1 record with a policy. p=none passes (it is what bulk-sender rules ask) and says so. */
export function dmarcResult(records: string[]): CheckResult {
  const dmarc = records.find(r => /^v=DMARC1\b/i.test(r))
  if (!dmarc) return { ok: false, detail: 'sin registro DMARC en _dmarc' }
  const policy = dmarc.match(/;\s*p=(\w+)/i)?.[1]?.toLowerCase()
  if (!policy) return { ok: false, detail: 'DMARC sin política (p=)' }
  return { ok: true, detail: policy === 'none' ? 'DMARC p=none: solo monitorea; sube a quarantine o reject cuando el envío esté estable' : `DMARC p=${policy}` }
}

const DKIM_SELECTORS = ['resend', 'google', 'default', 'selector1', 'selector2', 's1', 's2', 'k1', 'mail', 'smtp', 'dkim', 'pm', 'mandrill', 'zoho']

export function checkDns(profile: Profile, check: DnsCheck, mode: Mode, env = process.env): CheckResult {
  if (mode === 'fast') return skip('se verifica en el DNS en /mep:check')
  const target = liveTarget(profile, env)
  const domain = profile.email_domain ?? (target ? new URL(target).hostname.replace(/^www\./, '') : undefined)
  if (!domain) return skip('sin dominio: define email_domain o urls.production en el perfil (/mep:add)')
  const lookup = (name: string) => {
    const r = txtSync(name)
    return Array.isArray(r) ? r : []
  }
  if (check.rule === 'spf') return spfResult(lookup(domain))
  if (check.rule === 'dmarc') return dmarcResult(lookup(`_dmarc.${domain}`))
  const selectors = [...(profile.email_dkim_selector ? [profile.email_dkim_selector] : []), ...(check.selectors ?? DKIM_SELECTORS)]
  const found = selectors.find(s => lookup(`${s}._domainkey.${domain}`).some(r => /\bp=\S/.test(r)))
  return found
    ? { ok: true, detail: `DKIM en ${found}._domainkey.${domain}` }
    : { ok: false, detail: `sin DKIM en los selectores comunes de ${domain}; si tu proveedor usa otro, ponlo en email_dkim_selector del perfil` }
}
