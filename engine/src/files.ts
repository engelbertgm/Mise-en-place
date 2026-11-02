import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', '.vercel', '.turbo', '.mep', 'dist', 'build', 'out', 'coverage', '.astro', '.svelte-kit', 'test-results', 'playwright-report', 'blob-report', 'storybook-static', '.venv', 'venv', '__pycache__', '.mypy_cache', '.ruff_cache', '.pytest_cache'])
const MAX_FILE_BYTES = 1_000_000

/** Minimal glob → RegExp: `**`, `*`, `?`, nested `{a,b}`. Paths use `/`. */
export function globToRegExp(glob: string): RegExp {
  return new RegExp(`^${globSource(glob)}$`)
}

function globSource(glob: string): string {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        const slash = glob[i + 2] === '/'
        re += slash ? '(?:.*/)?' : '.*'
        i += slash ? 2 : 1
      } else re += '[^/]*'
    } else if (c === '?') re += '[^/]'
    else if (c === '{') {
      const { end, parts } = braceParts(glob, i)
      re += `(?:${parts.map(globSource).join('|')})`
      i = end
    } else re += escape(c)
  }
  return re
}

/** Splits `{a,{b,c}}` at its top-level commas; `end` is the index of the closing brace. */
function braceParts(glob: string, start: number): { end: number; parts: string[] } {
  const parts: string[] = []
  let depth = 0
  let from = start + 1
  for (let i = start; i < glob.length; i++) {
    if (glob[i] === '{') depth++
    else if (glob[i] === '}' && --depth === 0) {
      parts.push(glob.slice(from, i))
      return { end: i, parts }
    } else if (glob[i] === ',' && depth === 1) {
      parts.push(glob.slice(from, i))
      from = i + 1
    }
  }
  throw new Error(`glob con llave sin cerrar: ${glob}`)
}

function escape(s: string): string {
  return s.replace(/[.+^$()|[\]\\]/g, '\\$&')
}

const walkCache = new Map<string, string[]>()

/** Every source file under root (relative, `/`-separated), skipping build output and dependencies. */
export function listFiles(root: string, { includeIgnored = false } = {}): string[] {
  const key = `${root}|${includeIgnored}`
  const cached = walkCache.get(key)
  if (cached) return cached
  const out: string[] = []
  const walk = (dir: string) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        if (!includeIgnored && IGNORED_DIRS.has(e.name)) continue
        walk(full)
      } else if (e.isFile()) out.push(relative(root, full).split(sep).join('/'))
    }
  }
  walk(root)
  out.sort()
  walkCache.set(key, out)
  return out
}

export function clearFileCache(): void {
  walkCache.clear()
}

export function matchFiles(root: string, glob: string, exclude?: string): string[] {
  const re = globToRegExp(glob)
  const ex = exclude ? globToRegExp(exclude) : undefined
  return listFiles(root).filter(f => re.test(f) && !(ex && ex.test(f)))
}

export function readText(root: string, file: string): string | undefined {
  const full = join(root, file)
  try {
    if (statSync(full).size > MAX_FILE_BYTES) return undefined
    return readFileSync(full, 'utf8')
  } catch {
    return undefined
  }
}

export function exists(root: string, file: string): boolean {
  return existsSync(join(root, file))
}

/** Reads JSON or JSONC (tsconfig): drops comments and trailing commas outside strings. */
export function parseJsonc(text: string): unknown {
  let out = ''
  let inString = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      out += c
      if (c === '\\') out += text[++i] ?? ''
      else if (c === '"') inString = false
    } else if (c === '"') {
      inString = true
      out += c
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2) + 1
      if (i === 0) break
    } else out += c
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}
