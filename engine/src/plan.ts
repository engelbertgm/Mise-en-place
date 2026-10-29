import { posix } from 'node:path'
import { exists, matchFiles, readText } from './files.ts'
import { pageRoutes } from './framework.ts'
import { scanMigrations, tableName } from './sql.ts'
import type { Check, CheckResult, Profile } from './types.ts'

// Planning documents in docs/plan/. Claude writes them from templates/plan/; the engine only checks them.
// Sections are found by a marker under each heading (<!-- mep:<key> -->), so headings can be in any language.

export type PlanDoc = 'prd' | 'trd' | 'flows' | 'schema' | 'implementation'
export type PlanRule = 'sections' | 'custom_work' | 'stack' | 'phases' | 'diagrams' | 'routes' | 'tables'
type PlanCheck = Extract<Check, { type: 'plan' }>

const DIR = 'docs/plan'
export const PLAN_FILES: Record<PlanDoc, string> = {
  prd: `${DIR}/PRD.md`,
  trd: `${DIR}/TRD.md`,
  flows: `${DIR}/FLOWS.md`,
  schema: `${DIR}/SCHEMA.md`,
  implementation: `${DIR}/IMPLEMENTATION.md`,
}

const list = (items: string[]) => items.slice(0, 5).join(', ') + (items.length > 5 ? ' …' : '')
const result = (missing: string[], what: string, ok: string): CheckResult => (missing.length ? { ok: false, detail: `${what}: ${list(missing)}` } : { ok: true, detail: ok })

/** Text from the `<!-- mep:<key> -->` marker to the next `## ` heading, or undefined without the marker. */
export function section(md: string, key: string): string | undefined {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(l => l.trim() === `<!-- mep:${key} -->`)
  if (start < 0) return undefined
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '))
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n')
}

/** Backticked names in `###` headings: `### \`orders\``. */
export function codeHeadings(text: string): string[] {
  return [...text.matchAll(/^###\s+`([^`]+)`/gm)].map(m => m[1])
}

function diagrams(root: string, md: string, check: PlanCheck, profile: Profile): CheckResult {
  const missing: string[] = []
  for (const m of md.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
    if (!exists(root, posix.join(DIR, m[1]))) missing.push(m[1])
  }
  const applies = !check.if_capabilities || check.if_capabilities.some(c => profile.capabilities.includes(c))
  for (const required of applies ? (check.required ?? []) : []) {
    const found = required.split('|').some(type => matchFiles(root, `${DIR}/diagrams/${check.doc}-${type}*.png`).length > 0)
    if (!found) missing.push(`diagrama ${required.replace(/\|/g, ' o ')}`)
  }
  return result(missing, 'faltan', 'diagramas al día')
}

export function checkPlan(root: string, check: PlanCheck, profile: Profile): CheckResult {
  const file = PLAN_FILES[check.doc]
  const raw = readText(root, file)
  if (raw === undefined) return { ok: false, detail: `falta ${file}` }
  const md = raw.replace(/\r\n/g, '\n')
  const lower = md.toLowerCase()
  switch (check.rule) {
    case 'sections':
      return result((check.sections ?? []).filter(k => section(md, k) === undefined), `${file} sin las secciones`, `${file} con sus secciones`)
    case 'custom_work':
      return result((profile.custom_work ?? []).map(w => w.title).filter(t => !lower.includes(t.toLowerCase())), `${file} no menciona`, 'trabajo a la medida incluido')
    case 'stack':
      return result(Object.values(profile.stack.decided).filter(v => !lower.includes(v.toLowerCase())), `${file} no menciona`, 'stack incluido')
    case 'phases': {
      const listed = new Set(codeHeadings(section(md, 'fases') ?? ''))
      const wanted = (check.phases ?? []).filter(p => p !== 'build.data' || profile.signals.has_db === true)
      return result(wanted.filter(p => !listed.has(p)), `${file} sin las fases`, 'una sección por sub-etapa')
    }
    case 'diagrams':
      return diagrams(root, md, check, profile)
    case 'routes': {
      const listed = new Set([...(section(md, 'pantallas') ?? '').matchAll(/`(\/[^`]*)`/g)].map(m => m[1]))
      return result(pageRoutes(root).filter(r => !listed.has(r)), `${file} sin las pantallas`, 'todas las pantallas en el inventario')
    }
    case 'tables': {
      const inCode = scanMigrations(root).tables
      const inDoc = new Set(codeHeadings(section(md, 'tablas') ?? '').map(tableName).filter((t): t is string => !!t))
      const problems = [...[...inCode].filter(t => !inDoc.has(t)).map(t => `falta ${t}`), ...[...inDoc].filter(t => !inCode.has(t)).map(t => `sobra ${t}`)]
      return result(problems, `${file} no coincide con las migraciones`, 'tablas iguales a las migraciones')
    }
  }
}
