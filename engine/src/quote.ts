import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { evaluate, stack } from './evaluate.ts'
import type { Catalog, Evaluated, Item, Profile, Size } from './types.ts'

/** Everything internal to the business lives outside the repo: rates, real hours, internal quotes. */
export function configDir(env = process.env): string {
  return env.MEP_CONFIG_DIR ?? join(homedir(), '.config', 'mep-check')
}

export const SIZE_HOURS: Record<Size, [number, number]> = { XS: [0.5, 1], S: [1, 3], M: [3, 8], L: [8, 20], XL: [20, 40] }

export type Rates = {
  currency: string
  hourly_rate: number
  pm_overhead: number
  risk_buffer: number
  rounding: number
  maintenance_plans: Record<'basic' | 'standard' | 'premium', { price: number; hours: number }>
}

const DEFAULT_RATES: Rates = {
  currency: 'USD',
  hourly_rate: 0,
  pm_overhead: 0.1,
  risk_buffer: 0.2,
  rounding: 50,
  maintenance_plans: { basic: { price: 0, hours: 0 }, standard: { price: 0, hours: 0 }, premium: { price: 0, hours: 0 } },
}

const RATES_TEMPLATE = `# Tarifas de mep. Fuera del repo: nunca se entregan al cliente.
currency: USD
hourly_rate: 0        # define tu tarifa por hora
pm_overhead: 0.10     # gestión de proyecto
risk_buffer: 0.20     # colchón de riesgo
rounding: 50          # redondear precios a múltiplos de 50
maintenance_plans:    # precio mensual; horas incluidas por mes
  basic:    { price: 0, hours: 0 }   # actualizaciones de seguridad + backups
  standard: { price: 0, hours: 0 }   # + cambios menores
  premium:  { price: 0, hours: 0 }   # + monitoreo y soporte prioritario
`

/** Reads rates.yaml; the first time, writes the template so the person can fill it in. */
export function loadRates(env = process.env): { rates: Rates; created: boolean; configured: boolean } {
  const file = join(configDir(env), 'rates.yaml')
  let created = false
  if (!existsSync(file)) {
    mkdirSync(configDir(env), { recursive: true })
    writeFileSync(file, RATES_TEMPLATE)
    created = true
  }
  const raw = (parse(readFileSync(file, 'utf8')) ?? {}) as Partial<Rates>
  const rates = { ...DEFAULT_RATES, ...raw, maintenance_plans: { ...DEFAULT_RATES.maintenance_plans, ...raw.maintenance_plans } }
  return { rates, created, configured: rates.hourly_rate > 0 }
}

export type Range = [number, number]
export type QuoteLine = { id: string; title: string; phase: string; hours: Range; multiplier: number; custom?: boolean }

export type Quote = {
  currency: string
  lines: QuoteLine[]
  extras: QuoteLine[]
  bySubphase: Record<string, Range>
  subtotal: Range
  pm: Range
  risk: Range
  total: Range
  price: Range
  byPhase: Record<string, Range>
  extrasPrice: { id: string; title: string; price: Range }[]
  recurring: { key: string; label: string; monthly: Range; note?: string }[]
  maintenance?: Rates['maintenance_plans']
}

const add = (a: Range, b: Range): Range => [a[0] + b[0], a[1] + b[1]]
const scale = (a: Range, k: number): Range => [a[0] * k, a[1] * k]
const round1 = (a: Range): Range => [Math.round(a[0] * 10) / 10, Math.round(a[1] * 10) / 10]

function multiplier(item: Item, profile: Profile): number {
  const dim = item.effort.scales_with
  if (!dim) return 1
  const value = dim === 'markets' ? profile.markets.length : profile.counts[dim]
  return Math.max(1, value ?? 1)
}

function line(e: Evaluated, profile: Profile): QuoteLine {
  const k = multiplier(e.item, profile)
  return { id: e.item.id, title: e.item.title, phase: e.item.phase, hours: scale(e.item.effort.hours, k), multiplier: k }
}

/** Rounds up to the configured multiple, so a quote never rounds work away. */
function money(hours: Range, rates: Rates): Range {
  const r = Math.max(1, rates.rounding)
  return [Math.ceil((hours[0] * rates.hourly_rate) / r) * r, Math.ceil((hours[1] * rates.hourly_rate) / r) * r]
}

/** pm and risk are folded into a price, so the client view never shows them on their own. */
function loaded(hours: Range, rates: Rates): Range {
  return scale(hours, (1 + rates.pm_overhead) * (1 + rates.risk_buffer))
}

type Cost = { label: string; monthly: Range; note?: string }

function recurringCosts(profile: Profile, catalog: Catalog): Quote['recurring'] {
  const file = join(catalog.dir, 'costs.yaml')
  if (!existsSync(file)) return []
  const table = parse(readFileSync(file, 'utf8')) as { always?: Record<string, Cost>; stack?: Record<string, Cost> }
  const out: Quote['recurring'] = Object.entries(table.always ?? {}).map(([key, c]) => ({ key, ...c }))
  for (const d of stack(profile, catalog)) {
    const cost = table.stack?.[`${d.key}.${d.value}`]
    if (cost) out.push({ key: `${d.key}.${d.value}`, ...cost })
  }
  return out
}

/** Same profile, same rates, same quote. */
export function quote(profile: Profile, catalog: Catalog, rates: Rates): Quote {
  const evaluated = evaluate(profile, catalog)
  const lines = evaluated.filter(e => e.state === 'active').map(e => line(e, profile))
  for (const c of profile.custom_work ?? []) {
    lines.push({ id: `custom:${c.title}`, title: `${c.title} (estimación a revisar)`, phase: c.phase ?? 'build.features', hours: SIZE_HOURS[c.size], multiplier: 1, custom: true })
  }
  const extras = evaluated.filter(e => e.state === 'offered').map(e => line(e, profile))
  const bySubphase: Record<string, Range> = {}
  const byPhaseHours: Record<string, Range> = {}
  for (const l of lines) {
    bySubphase[l.phase] = add(bySubphase[l.phase] ?? [0, 0], l.hours)
    const top = l.phase.split('.')[0]
    byPhaseHours[top] = add(byPhaseHours[top] ?? [0, 0], l.hours)
  }
  const subtotal = lines.reduce<Range>((acc, l) => add(acc, l.hours), [0, 0])
  const pm = scale(subtotal, rates.pm_overhead)
  const risk = scale(add(subtotal, pm), rates.risk_buffer)
  const total = add(add(subtotal, pm), risk)
  const byPhase = Object.fromEntries(Object.entries(byPhaseHours).map(([k, v]) => [k, money(loaded(v, rates), rates)]))
  return {
    currency: rates.currency,
    lines,
    extras,
    bySubphase: Object.fromEntries(Object.entries(bySubphase).map(([k, v]) => [k, round1(v)])),
    subtotal: round1(subtotal),
    pm: round1(pm),
    risk: round1(risk),
    total: round1(total),
    // The total is the sum of the phase prices, so the client view always adds up.
    price: Object.values(byPhase).reduce<Range>((acc, r) => add(acc, r), [0, 0]),
    byPhase,
    extrasPrice: extras.map(x => ({ id: x.id, title: x.title, price: money(loaded(x.hours, rates), rates) })),
    recurring: recurringCosts(profile, catalog),
    maintenance: profile.context === 'client-project' ? rates.maintenance_plans : undefined,
  }
}

const fmtH = (r: Range) => `${r[0]}–${r[1]} h`
const fmtMoney = (r: Range, c: string) => `${r[0].toLocaleString('en-US')}–${r[1].toLocaleString('en-US')} ${c}`

const PHASE_LABEL: Record<string, string> = { foundation: 'Cimientos', build: 'Construcción', launch: 'Lanzamiento' }

/** Internal view: hours per item and sub-phase, rate, pm and buffer. */
export function formatInternal(q: Quote, rates: Rates, phases: string[]): string {
  const out = [`Cotización interna (${q.currency}, tarifa ${rates.hourly_rate}/h)`]
  for (const phase of phases) {
    const items = q.lines.filter(l => l.phase === phase)
    if (!items.length) continue
    out.push('', `${phase}  ${fmtH(q.bySubphase[phase])}`)
    for (const l of items) out.push(`  ${l.custom ? '✎' : '·'} ${l.id}  ${fmtH(round1(l.hours))}${l.multiplier > 1 ? ` (×${l.multiplier})` : ''}`)
  }
  out.push(
    '',
    `Subtotal          ${fmtH(q.subtotal)}`,
    `Gestión (${Math.round(rates.pm_overhead * 100)}%)     ${fmtH(q.pm)}`,
    `Colchón (${Math.round(rates.risk_buffer * 100)}%)     ${fmtH(q.risk)}`,
    `Total             ${fmtH(q.total)}  →  ${fmtMoney(q.price, q.currency)}`,
  )
  if (q.extrasPrice.length) out.push('', 'Extras opcionales:', ...q.extrasPrice.map(x => `  ⚪ ${x.id}  ${fmtMoney(x.price, q.currency)}`))
  return out.join('\n')
}

/** Client view: price per phase and total. No rate, margins or buffer. */
export function formatClient(q: Quote): string {
  const out = ['Cotización']
  for (const [phase, price] of Object.entries(q.byPhase)) out.push(`  ${PHASE_LABEL[phase] ?? phase}: ${fmtMoney(price, q.currency)}`)
  out.push(`  Total: ${fmtMoney(q.price, q.currency)}`)
  if (q.extrasPrice.length) out.push('', 'Extras opcionales:', ...q.extrasPrice.map(x => `  ${x.title}: ${fmtMoney(x.price, q.currency)}`))
  if (q.recurring.length) {
    out.push('', 'Costos recurrentes estimados (aparte del proyecto, mensuales, USD):')
    out.push(...q.recurring.map(r => `  ${r.label}: ${r.monthly[0]}–${r.monthly[1]}${r.note ? ` — ${r.note}` : ''}`))
  }
  if (q.maintenance) {
    out.push('', 'Planes de mantenimiento (mensual):')
    const names = { basic: 'Básico (seguridad + backups)', standard: 'Estándar (+ cambios menores)', premium: 'Premium (+ monitoreo y soporte prioritario)' }
    for (const [k, p] of Object.entries(q.maintenance)) out.push(`  ${names[k as keyof typeof names]}: ${p.price.toLocaleString('en-US')} ${q.currency}${p.hours ? `, ${p.hours} h incluidas` : ''}`)
    out.push('  Horas adicionales y features nuevas se cotizan aparte.')
  }
  return out.join('\n')
}

export function projectKey(profile: Profile): string {
  return (profile.project || 'proyecto').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto'
}

/** Internal quotes are kept outside the repo, one file per run. */
export function saveQuote(profile: Profile, q: Quote, rates: Rates, env = process.env): string {
  const dir = join(configDir(env), 'quotes', projectKey(profile))
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.yaml`)
  writeFileSync(file, stringify({ profile: profile.project, catalog_version: profile.catalog_version, rates, quote: q }, { lineWidth: 0 }))
  return file
}

// ── Calibration ───────────────────────────────────────────────────────────────

export function logTime(profile: Profile, id: string, hours: number, env = process.env): string {
  const dir = join(configDir(env), 'actuals')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${projectKey(profile)}.yaml`)
  appendFileSync(file, stringify([{ id, hours, date: new Date().toISOString().slice(0, 10), catalog_version: profile.catalog_version }]))
  return file
}

export type Suggestion = { id: string; samples: number; median: number; current: Range; suggested: Range }

/** With 3+ real measurements of an item, suggests a new range when the median falls outside the current one. */
export function calibrate(catalog: Catalog, env = process.env, minSamples = 3): Suggestion[] {
  const dir = join(configDir(env), 'actuals')
  if (!existsSync(dir)) return []
  const byId = new Map<string, number[]>()
  for (const f of readdirSync(dir).filter(f => f.endsWith('.yaml'))) {
    for (const row of (parse(readFileSync(join(dir, f), 'utf8')) ?? []) as { id: string; hours: number }[]) {
      byId.set(row.id, [...(byId.get(row.id) ?? []), row.hours])
    }
  }
  const out: Suggestion[] = []
  for (const [id, hours] of byId) {
    const item = catalog.items.find(i => i.id === id)
    if (!item || hours.length < minSamples) continue
    const sorted = [...hours].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const [lo, hi] = item.effort.hours
    if (median >= lo && median <= hi) continue
    const p25 = sorted[Math.floor((sorted.length - 1) * 0.25)]
    const p75 = sorted[Math.ceil((sorted.length - 1) * 0.75)]
    out.push({ id, samples: hours.length, median, current: [lo, hi], suggested: [p25, p75] })
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}
