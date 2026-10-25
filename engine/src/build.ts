import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { listFiles, matchFiles, readText } from './files.ts'
import { dependencies, detectFramework } from './framework.ts'
import type { Check, CheckResult } from './types.ts'

/** Where the browser's JavaScript lands after a build, per framework. */
const JS_DIRS = ['.next/static', 'out/_next/static', 'dist/assets', 'dist/_astro', 'build/static/js', '.vercel/output/static']
/** Folders served to the public as is: a .map there exposes the source. */
const PUBLIC_DIRS = ['out', 'dist', 'build', '.next/static', '.vercel/output/static']

function filesUnder(root: string, dirs: string[], ext: RegExp): string[] {
  return dirs
    .filter(d => existsSync(join(root, d)))
    .flatMap(d => listFiles(join(root, d), { includeIgnored: true }).filter(f => ext.test(f)).map(f => `${d}/${f}`))
}

/** SSR-capable setups on top of Vite + React. Without one, the HTML is an empty shell. */
const VITE_SSR = ['vike', 'vite-plugin-ssr', '@react-router/dev', '@tanstack/react-start', '@remix-run/dev', 'waku', 'vite-react-ssg', 'react-snap']

function serverRendered(root: string): CheckResult {
  const framework = detectFramework(root)
  if (framework !== 'vite-react') return { ok: true, detail: `${framework}: genera HTML en el servidor o en el build` }
  const deps = dependencies(root)
  const ssr = VITE_SSR.find(d => deps.has(d))
  return ssr
    ? { ok: true, detail: `Vite + React con ${ssr}` }
    : { ok: false, detail: 'SPA de Vite + React sin SSR/SSG: "ver código fuente" llega vacío. Usa Next.js o Astro, agrega SSR/SSG, o justifica la excepción con /mep:override.' }
}

function maxJsChunk(root: string, maxKb: number): CheckResult {
  const files = filesUnder(root, JS_DIRS, /\.m?js$/)
  if (!files.length) return { ok: null, detail: 'sin salida de build con JavaScript (corre el build primero)' }
  const sizes = files
    .filter(f => statSync(join(root, f)).size < 20_000_000)
    // Read the bytes directly: a giant bundle is exactly the file the text reader skips for size.
    .map(f => ({ f, kb: Math.round(gzipSync(readFileSync(join(root, f))).length / 1024) }))
    .sort((a, b) => b.kb - a.kb)
  const big = sizes.filter(s => s.kb > maxKb)
  return big.length
    ? { ok: false, detail: `${big.length} archivo(s) JS sobre ${maxKb} KB gzip: ${big.slice(0, 3).map(s => `${s.f} (${s.kb} KB)`).join(', ')}` }
    : { ok: true, detail: `el más grande: ${sizes[0].f} (${sizes[0].kb} KB gzip)` }
}

function noSourceMaps(root: string): CheckResult {
  const maps = filesUnder(root, PUBLIC_DIRS, /\.(js|css|mjs)\.map$/)
  return maps.length
    ? { ok: false, violation: true, detail: `source maps públicos: ${maps.slice(0, 3).join(', ')}${maps.length > 3 ? ` (+${maps.length - 3})` : ''}` }
    : { ok: true, detail: 'sin source maps en la salida pública' }
}

export function checkBuild(root: string, check: Extract<Check, { type: 'build' }>): CheckResult {
  if (check.rule === 'server_rendered') return serverRendered(root)
  if (check.rule === 'max_js_chunk') return maxJsChunk(root, check.max_kb ?? 200)
  return noSourceMaps(root)
}

/** Crawlers of AI assistants and search: blocking them hides the site from AI answers. */
export const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'meta-externalagent']

/** robots.txt groups that disallow the whole site for `*` or for an AI crawler. */
function blockedInTxt(text: string): string[] {
  const blocked: string[] = []
  let agents: string[] = []
  let inRules = false
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim()
    const [key, ...rest] = line.split(':')
    const value = rest.join(':').trim()
    if (/^user-agent$/i.test(key)) {
      if (inRules) agents = []
      agents.push(value)
      inRules = false
    } else if (/^(dis)?allow$/i.test(key)) {
      inRules = true
      if (/^disallow$/i.test(key) && value === '/') {
        for (const a of agents) if (a === '*' || AI_BOTS.some(b => b.toLowerCase() === a.toLowerCase())) blocked.push(a)
      }
    }
  }
  return blocked
}

export function checkRobots(root: string): CheckResult {
  const txt = ['public/robots.txt', 'static/robots.txt', 'out/robots.txt', 'dist/robots.txt', '.next/server/app/robots.txt.body'].find(f => existsSync(join(root, f)))
  if (txt) {
    const blocked = [...new Set(blockedInTxt(readText(root, txt) ?? ''))]
    return blocked.length
      ? { ok: false, detail: `${txt} bloquea el sitio a: ${blocked.join(', ')}` }
      : { ok: true, detail: `${txt}: buscadores y asistentes de IA pueden leer el sitio` }
  }
  const source = matchFiles(root, '{app,src/app}/robots.{ts,js}')[0]
  if (!source) return { ok: null, detail: 'sin robots.txt' }
  const text = readText(root, source) ?? ''
  const rules = text.match(/\{[^{}]*userAgent[^{}]*\}/g) ?? []
  const blocked = rules
    .filter(r => /disallow:\s*(\[\s*)?["'`]\/["'`]\s*(\]|,|\n|\})/.test(r))
    .flatMap(r => [...r.matchAll(/["'`]([\w*-]+)["'`]/g)].map(m => m[1]))
    .filter(a => a === '*' || AI_BOTS.some(b => b.toLowerCase() === a.toLowerCase()))
  return blocked.length
    ? { ok: false, detail: `${source} bloquea el sitio a: ${[...new Set(blocked)].join(', ')}` }
    : { ok: true, detail: `${source}: buscadores y asistentes de IA pueden leer el sitio` }
}
