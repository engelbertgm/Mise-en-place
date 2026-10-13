import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readText } from './files.ts'
import { MEP_DIR, today } from './profile.ts'

export const SECURITY_DIR = join(MEP_DIR, 'security')

export type SecurityReport = {
  id: string
  result: 'pass' | 'fail' | 'risk'
  files: string[]
  hash: string
  notes: string
  date: string
  by: 'mep-security'
}

/** Hash of the files the audit read. When any of them changes, the report expires. */
export function hashFiles(root: string, files: string[]): string {
  const h = createHash('sha256')
  for (const f of [...files].sort()) {
    h.update(`${f}\0${readText(root, f) ?? '<missing>'}\0`)
  }
  return h.digest('hex')
}

export function readReport(root: string, id: string): SecurityReport | undefined {
  const text = readText(root, join(SECURITY_DIR, `${id}.json`))
  if (!text) return undefined
  try {
    return JSON.parse(text) as SecurityReport
  } catch {
    return undefined
  }
}

export type ReportState = { valid: boolean; detail: string }

export function reportState(root: string, id: string): ReportState {
  const report = readReport(root, id)
  if (!report) return { valid: false, detail: 'sin auditoría de mep-security' }
  if (report.result !== 'pass') return { valid: false, detail: `auditoría: ${report.result} — ${report.notes}` }
  if (hashFiles(root, report.files) !== report.hash) return { valid: false, detail: 'auditoría vencida: cambiaron los archivos revisados' }
  return { valid: true, detail: `auditado ${report.date}` }
}

export function recordReport(root: string, input: Omit<SecurityReport, 'hash' | 'date' | 'by'>): SecurityReport {
  const report: SecurityReport = { ...input, hash: hashFiles(root, input.files), date: today(), by: 'mep-security' }
  mkdirSync(join(root, SECURITY_DIR), { recursive: true })
  writeFileSync(join(root, SECURITY_DIR, `${input.id}.json`), JSON.stringify(report, null, 2) + '\n')
  return report
}
