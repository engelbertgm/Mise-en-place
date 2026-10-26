import { execSync } from 'node:child_process'
import { parseJsonc, exists, matchFiles, readText } from './files.ts'
import { routeExists } from './framework.ts'
import { checkHtml } from './html.ts'
import { checkCodemap, checkRegistry } from './maps.ts'
import { checkSql } from './sql.ts'
import { checkThresholds } from './quality.ts'
import { checkDesign } from './design.ts'
import { checkBuild, checkRobots } from './build.ts'
import { checkDns, checkLive } from './live.ts'
import { reportState } from './security.ts'
import type { Check, CheckResult, Evaluated, ItemResult, ItemStatus, Profile } from './types.ts'

/**
 * `fast` runs only the cheap checks (Stop hook, preview deploy, status line).
 * `full` also runs commands and HTML checks on the build (check, phase close, production, CI).
 */
export type Mode = 'fast' | 'full'

function getKey(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj)
}

function grep(root: string, check: Extract<Check, { type: 'grep' }>): CheckResult {
  const re = new RegExp(check.pattern, check.flags?.replace('g', ''))
  const hits: string[] = []
  for (const file of matchFiles(root, check.glob, check.exclude)) {
    const lines = (readText(root, file) ?? '').split('\n')
    lines.forEach((line, i) => {
      if (re.test(line)) hits.push(`${file}:${i + 1}`)
    })
    if (hits.length >= 200) break
  }
  if ((check.expect ?? 'present') === 'present') {
    return hits.length ? { ok: true, detail: `encontrado en ${hits[0]}` } : { ok: false, detail: `no se encontró /${check.pattern}/ en ${check.glob}` }
  }
  return hits.length
    ? { ok: false, violation: true, detail: `no permitido: ${hits.slice(0, 5).join(', ')}${hits.length > 5 ? ' …' : ''}`, all: hits }
    : { ok: true, detail: 'sin coincidencias' }
}

export function runCheck(root: string, check: Check, profile: Profile, itemId: string, mode: Mode): CheckResult {
  switch (check.type) {
    case 'file_exists': {
      const paths = Array.isArray(check.path) ? check.path : [check.path]
      const found = paths.find(p => (/[*{]/.test(p) ? matchFiles(root, p).length > 0 : exists(root, p)))
      return found ? { ok: true, detail: found } : { ok: false, detail: `falta ${paths.join(' o ')}` }
    }
    case 'route_exists':
      return routeExists(root, check.path) ? { ok: true, detail: `ruta ${check.path}` } : { ok: false, detail: `falta la ruta ${check.path}` }
    case 'grep':
      return grep(root, check)
    case 'json_key': {
      const text = readText(root, check.file)
      if (text === undefined) return { ok: false, detail: `falta ${check.file}` }
      let value: unknown
      try {
        value = getKey(parseJsonc(text), check.key)
      } catch {
        return { ok: false, detail: `${check.file} no es JSON válido` }
      }
      if (value === undefined) return { ok: false, detail: `${check.file}: falta ${check.key}` }
      if (check.value !== undefined && JSON.stringify(value) !== JSON.stringify(check.value)) {
        return { ok: false, detail: `${check.file}: ${check.key} es ${JSON.stringify(value)}, se espera ${JSON.stringify(check.value)}` }
      }
      return { ok: true, detail: `${check.file}: ${check.key}` }
    }
    case 'command': {
      if (mode === 'fast') return { ok: null, detail: `se verifica en /mep:check: ${check.run}` }
      try {
        execSync(check.run, { cwd: root, stdio: 'pipe', timeout: (check.timeout ?? 300) * 1000 })
        return { ok: true, detail: `${check.run} ✓` }
      } catch (err) {
        const out = String((err as { stdout?: Buffer }).stdout ?? '') + String((err as { stderr?: Buffer }).stderr ?? '')
        return { ok: false, detail: `${check.run} falló: ${out.trim().split('\n').slice(-3).join(' ').slice(0, 300)}` }
      }
    }
    case 'html':
      if (mode === 'fast') return { ok: null, detail: 'se verifica sobre el build en /mep:check' }
      return checkHtml(root, check)
    case 'sql':
      return checkSql(root, check)
    case 'maps': {
      const errors = check.rule === 'registry' ? checkRegistry(root) : checkCodemap(root)
      return errors.length ? { ok: false, detail: errors.slice(0, 5).join('; ') + (errors.length > 5 ? ` (+${errors.length - 5})` : ''), all: errors } : { ok: true, detail: `${check.rule} al día` }
    }
    case 'quality':
      return checkThresholds(root, profile)
    case 'design':
      return checkDesign(root, check)
    case 'build':
      // Build output checks need a build; the framework check reads package.json and runs anywhere.
      if (mode === 'fast' && check.rule !== 'server_rendered') return { ok: null, detail: 'se verifica sobre el build en /mep:check' }
      return checkBuild(root, check)
    case 'robots':
      return checkRobots(root)
    case 'live':
      return checkLive(profile, check, mode)
    case 'dns':
      return checkDns(profile, check, mode)
    case 'manual': {
      const confirmed = profile.selections.manual_confirmed.find(c => c.id === itemId)
      return confirmed ? { ok: true, detail: `confirmado por ${confirmed.by} (${confirmed.date})` } : { ok: null, detail: `manual: ${check.prompt}` }
    }
  }
}

function statusOf(all: CheckResult[]): ItemStatus {
  // A check that could not run here does not count; an item with nothing else to go on stays unknown.
  const results = all.filter(r => !r.skip)
  if (results.some(r => r.ok === false)) return 'fail'
  if (!results.length || results.some(r => r.ok === null)) return 'unknown'
  return 'pass'
}

export function isSecurityItem(e: Evaluated): boolean {
  return e.item.category === 'security'
}

/** Runs the checks of every active item. Skipped, overridden and offered items are not verified. */
export function verifyItems(root: string, profile: Profile, evaluated: Evaluated[], mode: Mode): ItemResult[] {
  return evaluated.map(e => {
    if (e.state !== 'active') return { ...e, status: 'unknown' as const, checks: [], violation: false }
    const security = isSecurityItem(e)
    // A security item's manual check is satisfied by the mep-security audit below, not by a person.
    const checks = e.item.verify
      .filter(check => !(security && check.type === 'manual'))
      .map(check => ({ check, result: runCheck(root, check, profile, e.item.id, mode) }))
    const violation = checks.some(c => c.result.ok === false && c.result.violation === true)
    let status = statusOf(checks.map(c => c.result))
    if (security && status !== 'fail') {
      const audit = reportState(root, e.item.id)
      checks.push({ check: { type: 'manual', prompt: 'auditoría mep-security' }, result: { ok: audit.valid, detail: audit.detail } })
      if (!audit.valid) status = 'fail'
    }
    return { ...e, status, checks, violation }
  })
}

export function failingDetail(r: ItemResult): string {
  return r.checks
    .filter(c => c.result.ok !== true)
    .map(c => c.result.detail)
    .join('; ')
}
