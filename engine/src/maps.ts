import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { matchFiles, readText } from './files.ts'
import { detectFramework, routes } from './framework.ts'
import type { Catalog } from './types.ts'

export const REGISTRY_FILE = 'REGISTRY.md'
export const CODEMAP_FILE = 'CODEMAP.md'

/** Where reusable pieces live. Pages, layouts and route handlers are not reusable pieces. */
const REGISTRY_GLOB = '{src/,}{components,hooks,lib,utils,services,types,emails}/**/*.{ts,tsx,js,jsx}'
const REGISTRY_EXCLUDE = '**/*.{test,spec,stories,d}.{ts,tsx,js,jsx}'

export type Kind = 'Componentes' | 'Hooks' | 'Servicios' | 'Tipos' | 'Utilidades'
const KIND_ORDER: Kind[] = ['Componentes', 'Hooks', 'Servicios', 'Utilidades', 'Tipos']

export type Entry = {
  name: string
  path: string
  kind: Kind
  signature: string
  purpose?: string
  notFor?: string
  variants?: string
  example?: string
}

function kindOf(path: string, name: string, keyword: string): Kind {
  if (keyword === 'type' || keyword === 'interface' || keyword === 'enum') return 'Tipos'
  if (/^use[A-Z]/.test(name) || /(^|\/)hooks\//.test(path)) return 'Hooks'
  if (/(^|\/)services\//.test(path)) return 'Servicios'
  if (/(^|\/)(components|emails)\//.test(path) && /^[A-Z]/.test(name)) return 'Componentes'
  return 'Utilidades'
}

/** Reads the doc comment right above an export: "Para qué:", "No usar para:", "Variantes:", @example. */
function parseDoc(doc: string): Pick<Entry, 'purpose' | 'notFor' | 'variants' | 'example'> {
  const lines = doc
    .replace(/^\/\*\*|\*\/$/g, '')
    .split('\n')
    .map(l => l.replace(/^\s*\*\s?/, ''))
  const out: Pick<Entry, 'purpose' | 'notFor' | 'variants' | 'example'> = {}
  const free: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const field = line.match(/^(Para qué|No usar para|Variantes):\s*(.*)$/i)
    if (field) {
      const key = { 'para qué': 'purpose', 'no usar para': 'notFor', variantes: 'variants' }[field[1].toLowerCase()] as 'purpose' | 'notFor' | 'variants'
      out[key] = field[2]
    } else if (line.startsWith('@example')) {
      const rest = [line.slice(8).trim(), ...lines.slice(i + 1).filter(l => !l.trim().startsWith('@'))].filter(Boolean)
      out.example = rest.join(' ').replace(/\s+/g, ' ').trim()
      break
    } else if (line.startsWith('@')) break
    else if (line) free.push(line)
  }
  if (!out.purpose && free.length) out.purpose = free.join(' ')
  return out
}

const EXPORT_RE = /^export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(function\*?|const|let|class|type|interface|enum|abstract\s+class)\s+([A-Za-z_$][\w$]*)/

/** Public exports of the reusable folders, with what their doc comments say. */
export function scanExports(root: string): Entry[] {
  const entries: Entry[] = []
  for (const path of matchFiles(root, REGISTRY_GLOB, REGISTRY_EXCLUDE)) {
    const lines = (readText(root, path) ?? '').split('\n')
    lines.forEach((line, i) => {
      const m = line.match(EXPORT_RE)
      if (!m) return
      const [, keyword, name] = m
      let doc = ''
      let j = i - 1
      if (j >= 0 && lines[j].trim().endsWith('*/')) {
        const end = j
        while (j >= 0 && !lines[j].trim().startsWith('/**')) j--
        if (j >= 0) doc = lines.slice(j, end + 1).join('\n')
      }
      const signature = line.replace(/\s*[{=]\s*$/, '').replace(/\s*\{$/, '').trim().slice(0, 140)
      entries.push({ name, path, kind: kindOf(path, name, keyword.replace('abstract ', '')), signature, ...parseDoc(doc) })
    })
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path))
}

export function renderRegistry(entries: Entry[]): string {
  const out = [
    '<!-- Generado por mep (registry). No editar a mano: "Para qué", "No usar para", "Variantes" y @example se escriben en el comentario /** */ de cada export. -->',
    '# Registro de piezas reutilizables',
    '',
    'Antes de crear algo, busca aquí. Cada entrada apunta al código; nunca lo copia.',
  ]
  for (const kind of KIND_ORDER) {
    const group = entries.filter(e => e.kind === kind)
    if (!group.length) continue
    out.push('', `## ${kind}`)
    for (const e of group) {
      out.push('', `### ${e.name}`, `- Ruta: ${e.path}`, `- Para qué: ${e.purpose ?? '⚠️ sin descripción'}`, `- Firma: \`${e.signature}\``)
      if (e.variants) out.push(`- Variantes: ${e.variants}`)
      if (e.example) out.push(`- Ejemplo: \`${e.example}\``)
      if (e.notFor) out.push(`- No usar para: ${e.notFor}`)
    }
  }
  return out.join('\n') + '\n'
}

/** Entries listed in REGISTRY.md, as `path#name`. */
function listedEntries(text: string): Set<string> {
  const out = new Set<string>()
  let name: string | undefined
  for (const line of text.split('\n')) {
    const h = line.match(/^###\s+(.+?)\s*$/)
    if (h) name = h[1]
    const r = line.match(/^- Ruta:\s*(\S+)/)
    if (r && name) out.add(`${r[1]}#${name}`)
  }
  return out
}

/** `registry --check`: an export without entry or description, or an entry pointing to nothing, fails. */
export function checkRegistry(root: string): string[] {
  const entries = scanExports(root)
  if (!entries.length) return []
  const text = readText(root, REGISTRY_FILE)
  if (text === undefined) return [`falta ${REGISTRY_FILE} (corre: mep registry)`]
  const listed = listedEntries(text)
  const actual = new Set(entries.map(e => `${e.path}#${e.name}`))
  const errors: string[] = []
  for (const e of entries) {
    if (!listed.has(`${e.path}#${e.name}`)) errors.push(`${e.name} (${e.path}) no está en ${REGISTRY_FILE}`)
    if (!e.purpose) errors.push(`${e.name} (${e.path}) sin "Para qué" en su comentario`)
  }
  for (const key of listed) {
    if (!actual.has(key)) errors.push(`${REGISTRY_FILE} apunta a ${key.replace('#', ' → ')}, que ya no existe`)
  }
  return errors
}

export function writeRegistry(root: string): { entries: number; undocumented: number } {
  const entries = scanExports(root)
  writeFileSync(join(root, REGISTRY_FILE), renderRegistry(entries))
  return { entries: entries.length, undocumented: entries.filter(e => !e.purpose).length }
}

// ── CODEMAP.md ────────────────────────────────────────────────────────────────

type FolderInfo = { contains: string; notHere: string }
type CodemapData = { folders: Record<string, FolderInfo>; conventions: Record<string, string[]> }

function codemapData(catalog: Catalog): CodemapData {
  const file = join(catalog.dir, 'codemap.yaml')
  return existsSync(file) ? (parse(readFileSync(file, 'utf8')) as CodemapData) : { folders: {}, conventions: {} }
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.vercel', '.turbo', 'dist', 'build', 'out', 'coverage', '.astro', '.svelte-kit', '.mep'])

/** Top-level folders, and the children of src/ and app/: what a reader needs to place a file. */
function folders(root: string): string[] {
  const dirs = (dir: string) =>
    existsSync(join(root, dir))
      ? readdirSync(join(root, dir)).filter(d => !SKIP_DIRS.has(d) && !d.startsWith('.') && statSync(join(root, dir, d)).isDirectory())
      : []
  const top = dirs('.').sort()
  const nested = ['src', 'src/app', 'app'].flatMap(parent => (top.includes(parent.split('/')[0]) ? dirs(parent).map(d => `${parent}/${d}`) : []))
  return [...top, ...nested.sort()]
}

const MANUAL_START = '<!-- mep:manual -->'
const MANUAL_END = '<!-- /mep:manual -->'

function describe(folder: string, table: Record<string, FolderInfo>): FolderInfo {
  const last = folder.split('/').pop()!
  return table[folder] ?? table[last] ?? { contains: '—', notHere: '—' }
}

export function renderCodemap(root: string, catalog: Catalog): string {
  const previous = readText(root, CODEMAP_FILE) ?? ''
  const manual = previous.includes(MANUAL_START)
    ? previous.slice(previous.indexOf(MANUAL_START) + MANUAL_START.length, previous.indexOf(MANUAL_END)).trim()
    : '_Lo que el generador no puede inferir: decisiones, atajos, dónde vive algo poco obvio._'
  const { folders: table, conventions: byFramework } = codemapData(catalog)
  const framework = detectFramework(root)
  const allRoutes = routes(root, framework)
  const pages = allRoutes.filter(r => !r.startsWith('/api') && !/\.(txt|xml|webmanifest)$/.test(r))
  const api = allRoutes.filter(r => r.startsWith('/api'))
  const find = (glob: string) => matchFiles(root, glob)
  const entryPoints: [string, string[]][] = [
    ['Rutas', pages],
    ['API', api],
    ['Middleware', find('{src/,}middleware.{ts,js}')],
    ['Configuración', find('{next.config,astro.config,vite.config,tailwind.config,postcss.config,drizzle.config}.{js,mjs,ts,cjs}').concat(find('{tsconfig.json,vercel.json,components.json}'))],
    ['Tokens de diseño', find('**/{tokens,theme}.{ts,js,css,json}').concat(find('**/globals.css'))],
    ['Migraciones', find('{supabase/migrations,migrations,prisma,drizzle}/**/*').slice(0, 1).map(f => f.split('/').slice(0, -1).join('/') + '/')],
    ['Jobs / tareas programadas', find('{src/,}{app/api/cron,jobs,trigger,inngest}/**/*.{ts,js}').slice(0, 10)],
  ]
  const conventions = byFramework[framework] ?? []
  const out = [
    `<!-- Generado por mep (codemap). Edita solo la sección "Notas manuales"; el resto se regenera. -->`,
    '# Mapa del código',
    '',
    `Framework: ${framework}. Para piezas reutilizables, ver ${REGISTRY_FILE}.`,
    '',
    '## Carpetas',
    '',
    '| Carpeta | Contiene | No va aquí |',
    '| --- | --- | --- |',
    ...folders(root).map(f => {
      const info = describe(f, table)
      return `| \`${f}/\` | ${info.contains} | ${info.notHere} |`
    }),
    '',
    '## Puntos de entrada',
    '',
    ...entryPoints.filter(([, v]) => v.length).map(([k, v]) => `- **${k}:** ${v.slice(0, 40).map(x => `\`${x}\``).join(', ')}${v.length > 40 ? ` … (+${v.length - 40})` : ''}`),
    '',
    '## Convenciones',
    '',
    ...(conventions.length ? conventions.map(c => `- ${c}`) : ['- —']),
    '',
    '## Notas manuales',
    '',
    MANUAL_START,
    manual,
    MANUAL_END,
    '',
  ]
  return out.join('\n')
}

export function writeCodemap(root: string, catalog: Catalog): void {
  writeFileSync(join(root, CODEMAP_FILE), renderCodemap(root, catalog))
}

/** CODEMAP.md is current when it exists and lists every folder that exists now. */
export function checkCodemap(root: string): string[] {
  const text = readText(root, CODEMAP_FILE)
  if (text === undefined) return [`falta ${CODEMAP_FILE} (corre: mep codemap)`]
  return folders(root)
    .filter(f => !text.includes(`\`${f}/\``))
    .map(f => `${CODEMAP_FILE} no lista la carpeta ${f}/ (corre: mep codemap)`)
}
