import { exists, listFiles, parseJsonc, readText } from './files.ts'

export type Framework = 'nextjs' | 'astro' | 'vite-react' | 'static'

export function readPackageJson(root: string): Record<string, any> | undefined {
  const text = readText(root, 'package.json')
  if (!text) return undefined
  try {
    return parseJsonc(text) as Record<string, any>
  } catch {
    return undefined
  }
}

export function dependencies(root: string): Set<string> {
  const pkg = readPackageJson(root)
  return new Set([...Object.keys(pkg?.dependencies ?? {}), ...Object.keys(pkg?.devDependencies ?? {})])
}

export function detectFramework(root: string): Framework {
  const deps = dependencies(root)
  if (deps.has('next')) return 'nextjs'
  if (deps.has('astro')) return 'astro'
  if (deps.has('vite') || deps.has('react')) return 'vite-react'
  return 'static'
}

const PAGE_EXT = '(tsx|jsx|ts|js|mdx|md)'

/** Normalizes a file-system route: drops `(group)` segments and `@slot`s, keeps `[param]`. */
function cleanSegments(path: string): string {
  return (
    '/' +
    path
      .split('/')
      .filter(s => s && !/^\(.*\)$/.test(s) && !s.startsWith('@'))
      .join('/')
  )
}

/** `/blog/[slug]` matches `/blog/hello`. */
function routeMatches(pattern: string, path: string): boolean {
  if (pattern === path) return true
  const p = pattern.split('/')
  const t = path.split('/')
  for (let i = 0; i < p.length; i++) {
    if (/^\[\[?\.\.\./.test(p[i])) return true
    if (i >= t.length) return false
    if (/^\[.*\]$/.test(p[i])) continue
    if (p[i] !== t[i]) return false
  }
  return p.length === t.length
}

function nextRoutes(files: string[]): string[] {
  const routes: string[] = []
  for (const f of files) {
    const app = f.match(new RegExp(`^(?:src/)?app/(.*?)/?(page|route)\\.${PAGE_EXT}$`))
    if (app) routes.push(cleanSegments(app[1]))
    const meta = f.match(/^(?:src\/)?app\/(.*?)(robots|sitemap|manifest)\.(ts|js)$/)
    if (meta) routes.push(cleanSegments(`${meta[1]}${meta[2]}.${meta[2] === 'manifest' ? 'webmanifest' : meta[2] === 'robots' ? 'txt' : 'xml'}`))
    if (/^(?:src\/)?app\/not-found\.(tsx|jsx|ts|js)$/.test(f)) routes.push('/404')
    if (/^(?:src\/)?app\/(global-)?error\.(tsx|jsx|ts|js)$/.test(f)) routes.push('/500')
    const pages = f.match(new RegExp(`^(?:src/)?pages/(.*?)(?:/index)?\\.${PAGE_EXT}$`))
    if (pages && !pages[1].startsWith('_')) routes.push(cleanSegments(pages[1] === 'index' ? '' : pages[1]))
    if (/^(?:src\/)?pages\/_error\.(tsx|jsx|ts|js)$/.test(f)) routes.push('/500')
  }
  return routes
}

function astroRoutes(files: string[]): string[] {
  return files
    .map(f => f.match(/^src\/pages\/(.*?)(?:\/?index)?\.(astro|md|mdx|ts|js|html)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(m => cleanSegments(m[1]))
}

function viteRoutes(root: string, files: string[]): string[] {
  const routes: string[] = []
  for (const f of files) {
    const tanstack = f.match(/^src\/routes\/(.*?)(?:\/?index)?\.(tsx|jsx)$/)
    if (tanstack && !tanstack[1].startsWith('__')) routes.push(cleanSegments(tanstack[1].replace(/\./g, '/').replace(/\$(\w+)/g, '[$1]')))
    if (!/\.(tsx|jsx|ts|js)$/.test(f) || !f.startsWith('src/')) continue
    const text = readText(root, f) ?? ''
    for (const m of text.matchAll(/path\s*[:=]\s*\{?\s*["'`]([^"'`]+)["'`]/g)) {
      routes.push(m[1] === '*' ? '/404' : cleanSegments(m[1].replace(/:(\w+)/g, '[$1]')))
    }
  }
  return routes
}

function staticRoutes(files: string[]): string[] {
  return files
    .map(f => f.match(/^(?:public\/|static\/|src\/)?(.*?)(?:\/?index)?\.html$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(m => cleanSegments(m[1]))
}

export function routes(root: string, framework = detectFramework(root)): string[] {
  const files = listFiles(root)
  const byFramework = {
    nextjs: () => nextRoutes(files),
    astro: () => astroRoutes(files),
    'vite-react': () => viteRoutes(root, files),
    static: () => staticRoutes(files),
  }[framework]()
  return [...new Set([...byFramework, ...staticRoutes(files)])].sort()
}

export function routeExists(root: string, path: string): boolean {
  const clean = path.replace(/\/$/, '') || '/'
  if (exists(root, `public${clean}`) || exists(root, `static${clean}`)) return true
  return routes(root).some(r => routeMatches(r, clean))
}
