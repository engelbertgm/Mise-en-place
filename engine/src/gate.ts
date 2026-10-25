import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { evaluate } from './evaluate.ts'
import { MEP_DIR, hasProfile, loadProfile, log, saveProfile } from './profile.ts'
import { PR_REVIEW, reviewState } from './review.ts'
import { checkSeal, stateHash } from './seal.ts'
import { failingDetail, verifyItems } from './verify.ts'
import type { Mode } from './verify.ts'
import type { Catalog, ItemResult, Profile } from './types.ts'
import { LEVEL_ICON } from './types.ts'

export type GateKind = 'stop' | 'preview' | 'prod'

export type GateResult = {
  block: boolean
  blockers: ItemResult[]
  info: ItemResult[]
  bypassed: boolean
  message: string
}

const PASS: GateResult = { block: false, blockers: [], info: [], bypassed: false, message: '' }

export function formatItems(results: ItemResult[], max = 15): string {
  const lines = results.slice(0, max).map(r => `${LEVEL_ICON[r.level]} ${r.item.id} (${r.item.phase}) — ${r.item.how}\n   ↳ ${failingDetail(r) || 'pendiente'}`)
  if (results.length > max) lines.push(`… y ${results.length - max} más (/mep:check)`)
  return lines.join('\n')
}

/**
 * stop / preview: block on required items of closed sub-phases (regressions) and on locked violations.
 * prod: block on every required item that is not verified, in every sub-phase.
 */
export function gate(root: string, catalog: Catalog, kind: GateKind, env = process.env): GateResult {
  if (!hasProfile(root)) return PASS
  // State changed outside the CLI: nothing else counts until the person re-seals it. Never bypassable.
  const sealed = checkSeal(root)
  if (!sealed.ok) return { block: true, blockers: [], info: [], bypassed: false, message: `mep bloquea: ${sealed.detail}` }
  const profile = loadProfile(root, catalog)
  const mode: Mode = kind === 'prod' ? 'full' : 'fast'
  const results = verifyItems(root, profile, evaluate(profile, catalog), mode).filter(r => r.state === 'active')
  const closed = new Set(profile.phase.closed)

  const locked = results.filter(r => r.item.locked && r.violation)
  const required = results.filter(r => r.level === 'required')
  const grace = new Set(profile.selections.grace)
  const regressions =
    kind === 'prod'
      ? required.filter(r => r.status !== 'pass')
      : required.filter(r => closed.has(r.item.phase) && r.status === 'fail' && !grace.has(r.item.id))
  const blockers = uniq([...locked, ...regressions])
  const info = kind === 'prod' ? [] : required.filter(r => r.item.phase === profile.phase.active && r.status !== 'pass' && !blockers.includes(r))

  const bypassed = env.MEP_BYPASS === '1' && blockers.length > 0 && locked.length === 0
  if (bypassed) log(root, 'bypass', `${kind}: ${blockers.map(b => b.item.id).join(',')}`)
  const block = blockers.length > 0 && !bypassed

  const label = { stop: 'cerrar el trabajo', preview: 'el deploy de preview', prod: 'el deploy a producción' }[kind]
  const parts: string[] = []
  if (block) {
    parts.push(`mep bloquea ${label}: ${blockers.length} 🔴 pendiente(s).`)
    if (locked.length) parts.push('Ítems locked violados (no aceptan MEP_BYPASS):')
    parts.push(formatItems(blockers))
  } else if (bypassed) parts.push(`MEP_BYPASS=1: ${blockers.length} 🔴 omitidos para ${label} (registrado en .mep/log).`)
  if (info.length) parts.push(`Pendientes de ${profile.phase.active} (aún no bloquean):\n${formatItems(info, 5)}`)
  return { block, blockers, info, bypassed, message: parts.join('\n') }
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}

export type PhaseCloseResult = { closed: boolean; message: string; pending: ItemResult[]; profile: Profile }

/**
 * Closes a sub-phase when its required items pass and its quality review is recorded, current and without "must fix".
 * `review: false` only for adopting an existing repo (init --close-passing), and it is logged.
 */
export function closePhase(root: string, catalog: Catalog, sub: string, { review = true, env = process.env } = {}): PhaseCloseResult {
  const profile = loadProfile(root, catalog)
  const phases = catalog.dimensions.phases
  if (!phases.includes(sub)) return { closed: false, message: `sub-etapa desconocida: ${sub}. Válidas: ${phases.join(', ')}`, pending: [], profile }
  if (profile.phase.closed.includes(sub)) return { closed: false, message: `${sub} ya está cerrada`, pending: [], profile }

  // Items still in their grace period (from /mep:update) must be met at the next close.
  const grace = new Set(profile.selections.grace)
  // Only this sub-phase's items (and graced ones) are verified: closing never runs other phases' commands.
  const relevant = evaluate(profile, catalog).filter(e => e.item.phase === sub || grace.has(e.item.id))
  // The review is checked before the verification commands run, so files they create do not expire it.
  const quality = review ? reviewState(root, sub, env) : { valid: true, detail: '' }
  const results = verifyItems(root, profile, relevant, 'full')
  const pending = results.filter(
    r => r.state === 'active' && r.level === 'required' && (r.item.phase === sub || grace.has(r.item.id)) && r.status !== 'pass',
  )
  if (pending.length || !quality.valid) {
    const parts = [`No se puede cerrar ${sub}:`]
    if (pending.length) parts.push(`${pending.length} 🔴 sin cumplir.\n${formatItems(pending)}`)
    if (!quality.valid) parts.push(`Revisión de calidad: ${quality.detail}`)
    return { closed: false, message: parts.join('\n'), pending, profile }
  }
  profile.phase.closed = phases.filter(p => p === sub || profile.phase.closed.includes(p))
  profile.phase.active = phases.find(p => !profile.phase.closed.includes(p)) ?? sub
  profile.selections.grace = []
  saveProfile(root, profile)
  log(root, 'phase-close', review ? sub : `${sub} (adopción, sin revisión de calidad)`)
  return { closed: true, message: `✅ ${sub} cerrada. Sus 🔴 quedan protegidos contra regresiones. Sub-etapa activa: ${profile.phase.active}.`, pending: [], profile }
}

const CACHE_TTL_MS = 120_000

function gitState(root: string): string {
  try {
    return execSync('git rev-parse HEAD && git status --porcelain -- . ":!.mep"', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
  } catch {
    return 'no-git'
  }
}

/**
 * The same deploy may be checked twice in a row (the gate mod, then the backup hook).
 * A result for the same repo state is reused for two minutes, so a full verification runs once.
 */
export function cachedGate(root: string, catalog: Catalog, kind: GateKind, env = process.env): Pick<GateResult, 'block' | 'message'> {
  if (!hasProfile(root)) return PASS
  const key = createHash('sha256')
    .update(`${kind}\0${env.MEP_BYPASS ?? ''}\0${gitState(root)}\0${readFileSync(join(root, MEP_DIR, 'profile.yaml'), 'utf8')}\0${stateHash(root)}`)
    .digest('hex')
  const dir = join(root, MEP_DIR, '.cache')
  const file = join(dir, `gate-${kind}.json`)
  if (existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, 'utf8')) as { key: string; time: number; block: boolean; message: string }
    if (cached.key === key && Date.now() - cached.time < CACHE_TTL_MS) return cached
  }
  const { block, message } = gate(root, catalog, kind, env)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(root, MEP_DIR, '.gitignore'), '.cache/\n')
  writeFileSync(file, JSON.stringify({ key, time: Date.now(), block, message }))
  return { block, message }
}

/**
 * Before a PR into main: a quality review of the branch, recorded and current for the code as it is now
 * (/ponytail-review branch, or mep's own review), with no "must fix". CI asks for the same one (verify --pr).
 */
export function prReviewGate(root: string, env = process.env): { block: boolean; message: string } {
  if (!hasProfile(root)) return { block: false, message: '' }
  const state = reviewState(root, PR_REVIEW, env)
  return state.valid ? { block: false, message: '' } : { block: true, message: `mep: antes del PR a main, revisión de calidad de la rama: ${state.detail}` }
}
