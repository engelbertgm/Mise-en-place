// Pure module: imported by the engine and by the panel mod (no Node APIs here).
import type { Catalog, ItemResult } from './types.ts'

// ── braille bars: the engine's text output and the panel draw the same bar ──

export const BRAILLE_FILL = ['⣀', '⣄', '⣤', '⣦', '⣶', '⣷', '⣿']

/** A braille bar of `cells` cells: the done part and the rest, each drawn in its own color by the caller. */
export function meter(done: number, total: number, cells: number): { filled: string; rest: string } {
  const steps = BRAILLE_FILL.length - 1
  const units = total ? Math.round((done / total) * cells * steps) : 0
  const full = Math.floor(units / steps)
  const part = units % steps
  const cell = (i: number) => (i < full ? BRAILLE_FILL[steps]! : i === full ? BRAILLE_FILL[part]! : BRAILLE_FILL[0]!)
  const all = Array.from({ length: cells }, (_, i) => cell(i))
  const split = Math.min(cells, full + (part ? 1 : 0))
  return { filled: all.slice(0, split).join(''), rest: all.slice(split).join('') }
}

/** Red at 0, amber halfway, green at 1: a hex color, so a bar shifts smoothly with how OK it is. */
const STOPS = [[229, 72, 77], [245, 165, 36], [48, 164, 108]] as const
export function progressColor(ratio: number): string {
  const x = Math.min(1, Math.max(0, ratio)) * 2
  const i = Math.min(1, Math.floor(x))
  const [from, to] = [STOPS[i]!, STOPS[i + 1]!]
  const hex = from.map((c, k) => Math.round(c + (to[k]! - c) * (x - i)).toString(16).padStart(2, '0')).join('')
  return `#${hex}`
}

// ── domain summaries ──

export type DomainRow = {
  /** `security` or `security.abuse`. */
  path: string
  label: string
  /** Items that apply to the scope and are on (state active). */
  applies: number
  /** Required items that apply, and how many already pass. */
  required: number
  done: number
  /** Pending (not passing, not deferred). */
  pendingRequired: number
  pendingRecommended: number
  /** Optional items the person chose and that are not done. */
  pendingOptional: number
  /** Required items postponed until go-live. */
  deferred: number
  /** Why the domain is off, when it is. */
  off?: string
}

export type DomainTree = { row: DomainRow; subs: DomainRow[] }

function rowFor(path: string, label: string, results: ItemResult[], deferred: Set<string>, offReason?: string): DomainRow {
  const inside = results.filter(r => r.item.domain === path || r.item.domain?.startsWith(`${path}.`))
  const active = inside.filter(r => r.state === 'active')
  const required = active.filter(r => r.level === 'required')
  const pending = (level: 'required' | 'recommended' | 'optional') => active.filter(r => r.level === level && r.status !== 'pass' && !deferred.has(r.item.id)).length
  return {
    path,
    label,
    applies: active.length,
    required: required.length,
    done: required.filter(r => r.status === 'pass').length,
    pendingRequired: pending('required'),
    pendingRecommended: pending('recommended'),
    pendingOptional: pending('optional'),
    deferred: required.filter(r => r.status !== 'pass' && deferred.has(r.item.id)).length,
    off: offReason,
  }
}

/** Every domain with its subdomains; `off` lists the paths switched off (domain or subdomain) with their reasons. */
export function summarize(results: ItemResult[], catalog: Catalog, deferredIds: string[], off: { path: string; reason: string }[]): DomainTree[] {
  const deferred = new Set(deferredIds)
  const reasonOf = (path: string) => off.find(o => o.path === path || path.startsWith(`${o.path}.`))?.reason
  return catalog.domains.map(d => ({
    row: rowFor(d.key, d.label, results, deferred, reasonOf(d.key)),
    subs: d.subdomains.map(s => rowFor(`${d.key}.${s.key}`, s.label, results, deferred, reasonOf(`${d.key}.${s.key}`))),
  }))
}

/** One line per domain: `security  ⣿⣷⣀⣀⣀⣀ 12/30 · ● 3 ● 6`. */
export function formatDomains(tree: DomainTree[], stage: string, only?: string): string {
  const out: string[] = [`Dominios · stage: ${stage === 'live' ? 'live (en vivo)' : 'building (en construcción)'}`]
  const rows = tree.filter(t => !only || t.row.path === only || only.startsWith(`${t.row.path}.`))
  const width = Math.max(...rows.flatMap(t => [t.row.path.length, ...t.subs.map(s => s.path.length - t.row.path.length - 1 + 2)]), 8)
  const line = (r: DomainRow, indent: string, name: string) => {
    if (r.off) return `${indent}${name.padEnd(width)}  apagado: ${r.off}`
    if (!r.applies) return `${indent}${name.padEnd(width)}  no aplica a este scope`
    const m = meter(r.done, r.required, 6)
    const bar = r.required ? `${m.filled}${m.rest} ${r.done}/${r.required}` : 'sin obligatorios'
    const pend = `● ${r.pendingRequired}  ● ${r.pendingRecommended}`
    return `${indent}${name.padEnd(width)}  ${bar} · ${pend}${r.deferred ? ` · ⏳ ${r.deferred}` : ''}`
  }
  for (const t of rows) {
    out.push(line(t.row, '', t.row.path))
    if (only) for (const s of t.subs) if (!only.includes('.') || s.path === only) out.push(line(s, '  ', s.path.slice(t.row.path.length + 1)))
  }
  if (!only) out.push('', 'Detalle de un dominio: mep domains <dominio> · pendientes: mep focus <dominio[.subdominio]>')
  return out.join('\n')
}

/** `mep focus`: the pending items of a domain or subdomain, plus those linked to it from elsewhere (↗). */
export function formatFocus(path: string, results: ItemResult[], deferredIds: string[]): string {
  const deferred = new Set(deferredIds)
  const home = (r: ItemResult) => r.item.domain === path || r.item.domain?.startsWith(`${path}.`)
  const linked = (r: ItemResult) => !home(r) && (r.item.links ?? []).some(l => l === path || l.startsWith(`${path}.`))
  const pending = (r: ItemResult) => r.state === 'active' && r.status !== 'pass' && r.level !== 'optional'
  const rank = { required: 0, recommended: 1, optional: 2 } as const
  const mine = results.filter(r => home(r) && pending(r)).sort((a, b) => rank[a.level] - rank[b.level])
  const also = results.filter(r => linked(r) && pending(r)).sort((a, b) => rank[a.level] - rank[b.level])
  const dot = { required: '●', recommended: '●', optional: '○' } as const
  const row = (r: ItemResult, from?: string) =>
    `  ${dot[r.level]} ${r.item.id}${r.status === 'fail' ? ' ✗' : ''}${deferred.has(r.item.id) ? ' ⏳' : ''}${from ? `  ↗ viene de ${from}` : ''} — ${r.item.title}`
  const out = [`${path}: ${mine.length} pendientes${also.length ? ` · ${also.length} enlazados` : ''}`]
  out.push(...mine.map(r => row(r)))
  if (also.length) out.push('', 'También aplican aquí (su hogar está en otro lado):', ...also.map(r => row(r, r.item.domain)))
  if (!mine.length && !also.length) out.push('  Nada pendiente.')
  return out.join('\n')
}

/** `security 8 · payments 5`: where the blockers are. */
export function blockersByDomain(blockers: ItemResult[]): string {
  const by = new Map<string, number>()
  for (const b of blockers) by.set((b.item.domain ?? b.item.category).split('.')[0]!, (by.get((b.item.domain ?? b.item.category).split('.')[0]!) ?? 0) + 1)
  return [...by.entries()].sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d} ${n}`).join(' · ')
}
