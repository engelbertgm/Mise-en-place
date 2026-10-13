import { LEVEL_ICON } from './types.ts'
import type { Catalog, Evaluated, ItemResult, Profile } from './types.ts'
import { failingDetail } from './verify.ts'

const STATUS_ICON = { pass: '✅', fail: '❌', unknown: '❔' } as const

/** What /mep:scope shows: 🔴 / 🟡 / ⚪ grouped by category. */
export function formatProposal(evaluated: Evaluated[]): string {
  const out: string[] = []
  for (const level of ['required', 'recommended', 'optional'] as const) {
    const items = evaluated.filter(e => e.level === level)
    if (!items.length) continue
    const label = { required: 'Obligatorios', recommended: 'Recomendados', optional: 'Opcionales (elige)' }[level]
    out.push(`\n${LEVEL_ICON[level]} ${label} (${items.length})`)
    const categories = [...new Set(items.map(e => e.item.category))].sort()
    for (const cat of categories) {
      out.push(`  ${cat}`)
      for (const e of items.filter(i => i.item.category === cat)) {
        out.push(`    - ${e.item.id}${e.item.locked ? ' 🔒' : ''} — ${e.item.title}`)
      }
    }
  }
  return out.join('\n').trim()
}

function stateIcon(r: ItemResult): string {
  if (r.state === 'skipped') return '⏭️'
  if (r.state === 'overridden') return '⚠️'
  return STATUS_ICON[r.status]
}

/** What /mep:check shows: status by sub-phase. */
export function formatCheck(results: ItemResult[], profile: Profile, catalog: Catalog, { verbose = false } = {}): string {
  const out: string[] = []
  const shown = results.filter(r => r.state !== 'offered')
  for (const phase of catalog.dimensions.phases) {
    const items = shown.filter(r => r.item.phase === phase)
    if (!items.length) continue
    const req = items.filter(r => r.level === 'required' && r.state === 'active')
    const done = req.filter(r => r.status === 'pass').length
    const mark = profile.phase.closed.includes(phase) ? '🔒 cerrada' : phase === profile.phase.active ? '← activa' : ''
    out.push(`\n${phase}  🔴 ${done}/${req.length} ${mark}`.trimEnd())
    for (const r of items) {
      if (!verbose && r.status === 'pass' && r.state === 'active') continue
      const detail = r.state === 'active' ? failingDetail(r) : r.reason
      out.push(`  ${stateIcon(r)} ${LEVEL_ICON[r.level]} ${r.item.id}${detail ? ` — ${detail}` : ''}`)
    }
  }
  return out.join('\n').trim()
}

export function counts(results: ItemResult[]): { required: number; recommended: number } {
  const pending = results.filter(r => r.state === 'active' && r.status !== 'pass')
  return {
    required: pending.filter(r => r.level === 'required').length,
    recommended: pending.filter(r => r.level === 'recommended').length,
  }
}
