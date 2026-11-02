import { matchFiles, readText } from './files.ts'
import type { Check, CheckResult } from './types.ts'

const DEFAULT_GLOB = '{supabase/migrations,migrations,db/migrations,prisma/migrations,drizzle}/**/*.sql'
const SYSTEM_SCHEMAS = new Set(['auth', 'storage', 'extensions', 'realtime', 'supabase_functions', 'graphql', 'vault'])
const OPERATIONS = ['select', 'insert', 'update', 'delete'] as const

export function tableName(raw: string): string | undefined {
  const parts = raw.replace(/"/g, '').toLowerCase().split('.')
  if (parts.length === 2 && SYSTEM_SCHEMAS.has(parts[0])) return undefined
  return parts.length === 2 && parts[0] === 'public' ? parts[1] : parts.join('.')
}

const NAME = '((?:"?[\\w]+"?\\.)?"?[\\w]+"?)'

/** Reads every migration in order: tables created, tables with RLS on, policies per operation. */
export function scanMigrations(root: string, glob = DEFAULT_GLOB) {
  const sql = matchFiles(root, glob)
    .map(f => (readText(root, f) ?? '').replace(/--.*$/gm, ''))
    .join('\n')
  const tables = new Set<string>()
  const rls = new Set<string>()
  const policies = new Map<string, Set<string>>()
  for (const m of sql.matchAll(new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${NAME}`, 'gi'))) {
    const t = tableName(m[1])
    if (t) tables.add(t)
  }
  for (const m of sql.matchAll(new RegExp(`drop\\s+table\\s+(?:if\\s+exists\\s+)?${NAME}`, 'gi'))) {
    const t = tableName(m[1])
    if (t) tables.delete(t)
  }
  for (const m of sql.matchAll(new RegExp(`alter\\s+table\\s+(?:only\\s+)?${NAME}\\s+enable\\s+row\\s+level\\s+security`, 'gi'))) {
    const t = tableName(m[1])
    if (t) rls.add(t)
  }
  for (const m of sql.matchAll(new RegExp(`create\\s+policy\\s+(?:"[^"]*"|\\w+)\\s+on\\s+${NAME}([\\s\\S]*?);`, 'gi'))) {
    const t = tableName(m[1])
    if (!t) continue
    const op = m[2].match(/\bfor\s+(all|select|insert|update|delete)\b/i)?.[1].toLowerCase() ?? 'all'
    const set = policies.get(t) ?? new Set<string>()
    for (const o of op === 'all' ? OPERATIONS : [op]) set.add(o)
    policies.set(t, set)
  }
  return { files: matchFiles(root, glob).length, tables, rls, policies }
}

export function checkSql(root: string, check: Extract<Check, { type: 'sql' }>): CheckResult {
  const { files, tables, rls, policies } = scanMigrations(root, check.glob)
  if (files === 0) return { ok: null, detail: 'sin migraciones SQL versionadas' }
  if (check.rule === 'rls_enabled') {
    const missing = [...tables].filter(t => !rls.has(t)).sort()
    return missing.length
      ? { ok: false, violation: true, detail: `tablas sin RLS: ${missing.join(', ')}` }
      : { ok: true, detail: `RLS activo en ${tables.size} tablas` }
  }
  const incomplete = [...tables]
    .filter(t => rls.has(t))
    .map(t => ({ t, missing: OPERATIONS.filter(o => !policies.get(t)?.has(o)) }))
    .filter(x => x.missing.length)
  return incomplete.length
    ? { ok: false, detail: incomplete.slice(0, 5).map(x => `${x.t}: sin política ${x.missing.join('/')}`).join('; ') }
    : { ok: true, detail: 'políticas por operación en todas las tablas' }
}
