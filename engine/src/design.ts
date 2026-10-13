import { matchFiles, readText } from './files.ts'
import { dependencies } from './framework.ts'
import type { Check, CheckResult } from './types.ts'

const UI = '**/*.{tsx,jsx,astro,vue,svelte,html}'
const CSS = '**/*.{css,scss}'
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'inherit', 'initial', 'unset', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'arial', 'helvetica', 'helvetica neue', 'apple color emoji', 'segoe ui emoji', 'noto color emoji'])

const norm = (name: string) => name.replace(/["']/g, '').replace(/[_-]variable$/i, '').replace(/_/g, ' ').trim().toLowerCase()

/** Families the project loads: next/font, @fontsource packages, @font-face and literal font-family declarations. */
export function fontFamilies(root: string): string[] {
  const out = new Set<string>()
  for (const f of matchFiles(root, '**/*.{ts,tsx,js,jsx,mjs}')) {
    const text = readText(root, f) ?? ''
    for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/g)) {
      for (const name of m[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]).filter(Boolean)) out.add(norm(name))
    }
    for (const m of text.matchAll(/localFont\(\s*\{[^}]*?src:\s*["'`][^"'`]*?\/([\w-]+?)(?:-(?:regular|bold|medium|light|variable|\w+))?\.(?:woff2?|ttf|otf)/gi)) out.add(norm(m[1]))
  }
  for (const dep of dependencies(root)) {
    const m = dep.match(/^@fontsource(?:-variable)?\/(.+)$/)
    if (m) out.add(norm(m[1].replace(/-/g, ' ')))
  }
  for (const f of matchFiles(root, CSS)) {
    const text = readText(root, f) ?? ''
    for (const m of text.matchAll(/@font-face\s*\{[^}]*?font-family:\s*([^;}]+)/g)) out.add(norm(m[1].split(',')[0]))
    for (const m of text.matchAll(/(?<![-\w])font-family:\s*([^;}]+)/g)) {
      const first = norm(m[1].split(',')[0])
      if (first && !first.startsWith('var(') && !GENERIC.has(first)) out.add(first)
    }
  }
  return [...out].sort()
}

const TW_WEIGHT: Record<string, string> = { thin: '100', extralight: '200', light: '300', normal: '400', medium: '500–600', semibold: '500–600', bold: '700', extrabold: '800', black: '900' }

function cssWeight(v: string): string {
  const n = v === 'bold' ? 700 : v === 'normal' ? 400 : Number(v)
  return n === 500 || n === 600 ? '500–600' : String(n)
}

/** Weights in use, with 500 and 600 counted as one "medium" step, as the spec allows. */
export function fontWeights(root: string): string[] {
  const out = new Set<string>()
  for (const f of matchFiles(root, UI)) {
    for (const m of (readText(root, f) ?? '').matchAll(/\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g)) out.add(TW_WEIGHT[m[1]])
  }
  for (const f of matchFiles(root, CSS)) {
    for (const m of (readText(root, f) ?? '').matchAll(/font-weight:\s*(\d{3}|bold|normal)\b/g)) out.add(cssWeight(m[1]))
  }
  return [...out].sort()
}

export function checkDesign(root: string, check: Extract<Check, { type: 'design' }>): CheckResult {
  const found = check.rule === 'font_families' ? fontFamilies(root) : fontWeights(root)
  const label = check.rule === 'font_families' ? 'familias' : 'pesos'
  return found.length <= check.max
    ? { ok: true, detail: `${found.length} ${label}${found.length ? `: ${found.join(', ')}` : ''}` }
    : { ok: false, detail: `${found.length} ${label} (máximo ${check.max}): ${found.join(', ')}` }
}
