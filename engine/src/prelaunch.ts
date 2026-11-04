// Pure module: imported by the engine and by the panel mod (no Node APIs here).
// The security review before going live: the person's own checklist, each line made of catalog items.
import type { ItemResult } from './types.ts'

export type PrelaunchCheck = { label: string; items: string[] }

export type PrelaunchRow = {
  label: string
  /** `na`: none of its items applies to this scope (or the domain is off). */
  state: 'pass' | 'fail' | 'unknown' | 'na'
  /** The first thing missing, when the line is not done. */
  detail: string
  items: { id: string; status: 'pass' | 'fail' | 'unknown' }[]
}

/** One row per line of the checklist, from the verification results. A line passes when every item that applies passes. */
export function prelaunch(checks: PrelaunchCheck[], results: ItemResult[], detail: (r: ItemResult) => string): PrelaunchRow[] {
  const byId = new Map(results.filter(r => r.state === 'active').map(r => [r.item.id, r]))
  return checks.map(c => {
    const mine = c.items.map(id => byId.get(id)).filter((r): r is ItemResult => r !== undefined)
    if (!mine.length) return { label: c.label, state: 'na' as const, detail: 'no aplica a este scope', items: [] }
    const failing = mine.find(r => r.status === 'fail')
    const unknown = mine.find(r => r.status === 'unknown')
    const state = failing ? 'fail' : unknown ? 'unknown' : 'pass'
    const pending = failing ?? unknown
    return {
      label: c.label,
      state,
      detail: pending ? `${pending.item.id}: ${detail(pending) || 'pendiente'}` : '',
      items: mine.map(r => ({ id: r.item.id, status: r.status })),
    }
  })
}

const ICON = { pass: '✅', fail: '❌', unknown: '❔', na: '⊘' } as const

export function formatPrelaunch(rows: PrelaunchRow[], full: boolean): string {
  const applies = rows.filter(r => r.state !== 'na')
  const done = applies.filter(r => r.state === 'pass').length
  const out = [`Antes de salir en vivo · seguridad: ${done} de ${applies.length} listas${rows.length - applies.length ? ` (${rows.length - applies.length} no aplican)` : ''}`]
  for (const r of rows) {
    out.push(`${ICON[r.state]} ${r.label}${r.state === 'pass' ? '' : ` — ${r.detail}`}`)
  }
  out.push('')
  if (!full && rows.some(r => r.state === 'unknown')) out.push('❔ = falta correr comandos o el build: `mep prelaunch --full` los corre.')
  out.push('Se puede correr en cualquier momento; `mep launch` exige estos mismos ítems junto con todo lo demás.')
  return out.join('\n')
}
