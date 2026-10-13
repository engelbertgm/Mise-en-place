import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { evaluate, stack, stackGroups } from './evaluate.ts'
import { MEP_DIR } from './profile.ts'
import type { Quote } from './quote.ts'
import type { Catalog, Profile } from './types.ts'

export const EXPORTS_FILE = join(MEP_DIR, 'exports.yaml')

export type ExportRecord = { version: number; date: string; lang: string; items: string[]; capabilities: string[]; total?: [number, number]; files: string[] }

export function exportHistory(root: string): ExportRecord[] {
  const file = join(root, EXPORTS_FILE)
  return existsSync(file) ? ((parse(readFileSync(file, 'utf8')) ?? []) as ExportRecord[]) : []
}

/** Everything the client document needs, in structured form. Claude writes it in the client's language. */
export function exportData(root: string, profile: Profile, catalog: Catalog, lang: string, q?: Quote, priced = q !== undefined) {
  const evaluated = evaluate(profile, catalog)
  const active = evaluated.filter(e => e.state === 'active')
  const history = exportHistory(root)
  const previous = history[history.length - 1]
  const ids = active.map(e => e.item.id).sort()
  const changes = previous
    ? {
        since: `v${previous.version}`,
        added: ids.filter(id => !previous.items.includes(id)),
        removed: previous.items.filter(id => !ids.includes(id)),
        capabilities_added: profile.capabilities.filter(c => !previous.capabilities.includes(c)),
        capabilities_removed: previous.capabilities.filter(c => !profile.capabilities.includes(c)),
        total_before: previous.total,
      }
    : undefined
  const top = (phase: string) => phase.split('.')[0]
  return {
    version: (previous?.version ?? 0) + 1,
    lang,
    date: new Date().toISOString().slice(0, 10),
    project: profile.project,
    profile: { type: profile.type, capabilities: profile.capabilities, markets: profile.markets, audience: profile.audience, context: profile.context, counts: profile.counts },
    included: { capabilities: profile.capabilities, custom_work: profile.custom_work ?? [], optional_chosen: active.filter(e => e.level === 'optional').map(e => e.item.title) },
    out_of_scope: {
      capabilities_not_included: catalog.dimensions.capabilities.filter(c => !profile.capabilities.includes(c)),
      optional_not_chosen: evaluated.filter(e => e.state === 'offered').map(e => e.item.title),
      recommended_skipped: evaluated.filter(e => e.state === 'skipped').map(e => ({ title: e.item.title, reason: e.reason })),
    },
    compliance: active.filter(e => ['legal', 'security', 'accessibility', 'privacy', 'cookies'].includes(e.item.category)).map(e => ({ title: e.item.title, category: e.item.category, references: e.item.references ?? [] })),
    stack: stackGroups(stack(profile, catalog)).map(g => ({ decision: g.decisions.map(d => `${d.key}: ${d.value}`).join(', '), why: g.why })),
    deliverables: Object.fromEntries(['foundation', 'build', 'launch'].map(p => [p, active.filter(e => top(e.item.phase) === p && e.level !== 'optional').map(e => e.item.title)])),
    quote: q && priced ? { currency: q.currency, by_phase: q.byPhase, total: q.price, extras: q.extrasPrice, recurring: q.recurring, maintenance: q.maintenance } : undefined,
    // The schedule needs hours, not a rate: it is there even before prices are set.
    schedule: q ? { weeks_by_phase: q.schedule, total_weeks: q.weeks, weekly_hours_assumed: true } : undefined,
    acceptance_criteria: active.filter(e => e.level === 'required').map(e => ({ id: e.item.id, title: e.item.title, how: e.item.how })),
    legal_note: lang.startsWith('es') ? 'Checklist orientativo, no sustituye asesoría legal.' : 'Guidance checklist; not a substitute for legal advice.',
    changes,
  }
}

/** Records an export so the next version can list what changed. Exporting the same version again replaces it. */
export function recordExport(root: string, profile: Profile, catalog: Catalog, lang: string, files: string[], total?: [number, number], version?: number): ExportRecord {
  const all = exportHistory(root)
  const history = version === undefined ? all : all.filter(r => r.version !== version)
  const record: ExportRecord = {
    version: version ?? (history[history.length - 1]?.version ?? 0) + 1,
    date: new Date().toISOString().slice(0, 10),
    lang,
    items: evaluate(profile, catalog).filter(e => e.state === 'active').map(e => e.item.id).sort(),
    capabilities: [...profile.capabilities],
    total,
    files,
  }
  mkdirSync(dirname(join(root, EXPORTS_FILE)), { recursive: true })
  writeFileSync(join(root, EXPORTS_FILE), stringify([...history, record].sort((a, b) => a.version - b.version), { lineWidth: 0 }))
  return record
}
