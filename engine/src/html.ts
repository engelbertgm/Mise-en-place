import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { listFiles, readText } from './files.ts'
import type { Check, CheckResult } from './types.ts'

/** Build output folders, in order of preference. HTML checks run on what the build produced, not on source. */
const OUTPUT_DIRS = ['out', '.vercel/output/static', '.next/server/app', '.next/server/pages', 'dist', 'build']

export type Page = { file: string; html: string }

export function buildOutputDir(root: string): string | undefined {
  if (process.env.MEP_BUILD_DIR) return process.env.MEP_BUILD_DIR
  return OUTPUT_DIRS.find(d => existsSync(join(root, d)))
}

export function loadPages(root: string): Page[] | undefined {
  const dir = buildOutputDir(root)
  if (!dir) return undefined
  const base = join(root, dir)
  return listFiles(base, { includeIgnored: true })
    .filter(f => f.endsWith('.html') && !/(^|\/)_(not-found|error|global-error)/.test(f))
    .map(f => ({ file: `${dir}/${f}`, html: readText(base, f) ?? '' }))
}

function isErrorPage(file: string): boolean {
  return /(^|\/)(404|500)(\/index)?\.html$/.test(file)
}

function isNoindex(html: string): boolean {
  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
}

function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
}

function tags(html: string, name: string): string[] {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(m => m[0])
}

function metaContent(html: string, key: 'name' | 'property', value: string): string | undefined {
  const tag = tags(html, 'meta').find(t => attr(t, key)?.toLowerCase() === value.toLowerCase())
  return tag ? attr(tag, 'content') || undefined : undefined
}

function title(html: string): string | undefined {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim()
}

function headingLevels(html: string): number[] {
  const body = html.replace(/<(script|style|template)[\s\S]*?<\/\1>/gi, '')
  return [...body.matchAll(/<h([1-6])\b/gi)].map(m => Number(m[1]))
}

type PageRule = (page: Page, check: Extract<Check, { type: 'html' }>) => string | undefined

const PAGE_RULES: Record<string, PageRule> = {
  meta: (p, c) => {
    const key = c.name ? 'name' : 'property'
    const value = (c.name ?? c.property)!
    return metaContent(p.html, key, value) ? undefined : `falta <meta ${key}="${value}">`
  },
  link: (p, c) => (tags(p.html, 'link').some(t => attr(t, 'rel')?.split(/\s+/).includes(c.rel!)) ? undefined : `falta <link rel="${c.rel}">`),
  html_lang: p => (tags(p.html, 'html').some(t => attr(t, 'lang')) ? undefined : 'falta lang en <html>'),
  charset: p => (tags(p.html, 'meta').some(t => /charset/i.test(t)) ? undefined : 'falta <meta charset>'),
  single_h1: p => {
    const count = headingLevels(p.html).filter(l => l === 1).length
    return count === 1 ? undefined : `${count} <h1> (debe haber exactamente 1)`
  },
  heading_order: p => {
    const levels = headingLevels(p.html)
    if (levels.length && levels[0] !== 1) return `el primer heading es h${levels[0]}, no h1`
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) return `salta de h${levels[i - 1]} a h${levels[i]}`
    }
    return undefined
  },
  absolute_og_image: p => {
    const url = metaContent(p.html, 'property', 'og:image')
    return url && url.startsWith('https://') ? undefined : `og:image no es una URL absoluta https:// (${url ?? 'ausente'})`
  },
  img_dimensions: p => {
    const bad = tags(p.html, 'img').filter(t => !attr(t, 'width') || !attr(t, 'height'))
    return bad.length ? `${bad.length} <img> sin width/height` : undefined
  },
  img_alt: p => {
    const bad = tags(p.html, 'img').filter(t => !/\salt\s*=/.test(t))
    return bad.length ? `${bad.length} <img> sin alt` : undefined
  },
}

function uniqueBy(pages: Page[], pick: (html: string) => string | undefined, label: string): CheckResult {
  const seen = new Map<string, string[]>()
  const missing: string[] = []
  for (const p of pages.filter(p => !isErrorPage(p.file) && !isNoindex(p.html))) {
    const value = pick(p.html)
    if (!value) missing.push(p.file)
    else seen.set(value, [...(seen.get(value) ?? []), p.file])
  }
  const repeated = [...seen.entries()].filter(([, files]) => files.length > 1)
  if (!missing.length && !repeated.length) return { ok: true, detail: `${label} único en ${pages.length} páginas` }
  const parts = [
    ...missing.slice(0, 3).map(f => `${f}: sin ${label}`),
    ...repeated.slice(0, 3).map(([v, files]) => `"${v.slice(0, 50)}" repetido en ${files.slice(0, 3).join(', ')}`),
  ]
  return { ok: false, detail: parts.join('; ') }
}

export function checkHtml(root: string, check: Extract<Check, { type: 'html' }>): CheckResult {
  const pages = loadPages(root)
  if (!pages || pages.length === 0) return { ok: null, detail: 'sin salida de build con HTML (corre el build primero)' }
  if (check.rule === 'unique_title') return uniqueBy(pages, title, '<title>')
  if (check.rule === 'unique_description') return uniqueBy(pages, h => metaContent(h, 'name', 'description'), 'meta description')
  const rule = PAGE_RULES[check.rule]
  const failures = pages
    .map(p => ({ file: p.file, error: rule(p, check) }))
    .filter((f): f is { file: string; error: string } => f.error !== undefined)
  if (!failures.length) return { ok: true, detail: `${pages.length} páginas cumplen` }
  return { ok: false, detail: failures.slice(0, 5).map(f => `${f.file}: ${f.error}`).join('; ') + (failures.length > 5 ? ` (+${failures.length - 5})` : '') }
}
