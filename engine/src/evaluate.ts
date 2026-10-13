import { matches } from './conditions.ts'
import { LEVEL_RANK } from './types.ts'
import type { Catalog, Evaluated, Item, Level, Profile } from './types.ts'

export function effectiveLevel(item: Item, profile: Profile): Level {
  let level = item.level
  for (const o of item.level_overrides ?? []) {
    if (matches(o.when, profile) && LEVEL_RANK[o.level] > LEVEL_RANK[level]) level = o.level
  }
  return level
}

/** Profile + catalog → applicable items. Pure and deterministic: same input, same output. */
export function evaluate(profile: Profile, catalog: Catalog): Evaluated[] {
  const phaseOrder = catalog.dimensions.phases
  const skipped = new Map(profile.selections.recommended_skipped.map(s => [s.id, s.reason]))
  const overridden = new Map(profile.selections.overrides.map(s => [s.id, s.reason]))
  const optional = new Set(profile.selections.optional_added)

  const result: Evaluated[] = []
  for (const item of catalog.items) {
    if (!matches(item.when, profile)) continue
    const level = effectiveLevel(item, profile)
    let state: Evaluated['state'] = 'active'
    let reason: string | undefined
    if (level === 'optional' && !optional.has(item.id)) state = 'offered'
    else if (level === 'recommended' && skipped.has(item.id)) {
      state = 'skipped'
      reason = skipped.get(item.id)
    } else if (level === 'required' && overridden.has(item.id) && !item.locked) {
      state = 'overridden'
      reason = overridden.get(item.id)
    }
    result.push({ item, level, state, reason })
  }
  return result.sort(
    (a, b) =>
      phaseOrder.indexOf(a.item.phase) - phaseOrder.indexOf(b.item.phase) ||
      LEVEL_RANK[b.level] - LEVEL_RANK[a.level] ||
      a.item.id.localeCompare(b.item.id),
  )
}

export type Warning = { kind: 'conflict' | 'dependency'; message: string }

export function warnings(evaluated: Evaluated[]): Warning[] {
  const active = new Map(evaluated.filter(e => e.state === 'active').map(e => [e.item.id, e]))
  const out: Warning[] = []
  for (const e of active.values()) {
    for (const other of e.item.conflicts_with ?? []) {
      if (active.has(other) && e.item.id < other) {
        out.push({ kind: 'conflict', message: `${e.item.id} y ${other} son incompatibles: desactiva uno con razón` })
      }
    }
    for (const dep of e.item.depends_on ?? []) {
      if (!active.has(dep)) out.push({ kind: 'dependency', message: `${e.item.id} depende de ${dep}, que no está activo` })
    }
  }
  return out
}

export type StackDecision = { key: string; value: string; why: string; rule: string; decided: boolean }

export type StackGroup = { rule: string; why: string; decisions: StackDecision[] }

/** Decisions that come from the same rule share one reason and one ADR. */
export function stackGroups(decisions: StackDecision[]): StackGroup[] {
  const groups = new Map<string, StackGroup>()
  for (const d of decisions) {
    const g = groups.get(d.rule) ?? { rule: d.rule, why: d.why, decisions: [] }
    g.decisions.push(d)
    groups.set(d.rule, g)
  }
  return [...groups.values()]
}

/** Stack rules give a recommendation with its reason; a decision in the profile wins. */
export function stack(profile: Profile, catalog: Catalog): StackDecision[] {
  const out = new Map<string, StackDecision>()
  for (const rule of catalog.stackRules) {
    if (!matches(rule.when, profile)) continue
    for (const [key, value] of Object.entries(rule.recommend)) {
      if (!out.has(key)) out.set(key, { key, value, why: rule.why, rule: rule.id, decided: false })
    }
  }
  for (const [key, value] of Object.entries(profile.stack.decided)) {
    const rec = out.get(key)
    out.set(key, {
      key,
      value,
      why: rec && rec.value === value ? rec.why : rec ? `Decidido en el perfil (la regla ${rec.rule} recomendaba ${rec.value}).` : 'Decidido en el perfil.',
      rule: rec?.rule ?? 'profile',
      decided: true,
    })
  }
  return [...out.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export type DiffEntry = { id: string; title: string; change: 'new' | 'raised' | 'lowered' | 'removed'; from?: Level; to?: Level }

/** What `/mep:add` shows: only what changed between two profiles. */
export function diff(before: Profile, after: Profile, catalog: Catalog): DiffEntry[] {
  const a = new Map(evaluate(before, catalog).map(e => [e.item.id, e]))
  const b = new Map(evaluate(after, catalog).map(e => [e.item.id, e]))
  const out: DiffEntry[] = []
  for (const [id, e] of b) {
    const prev = a.get(id)
    if (!prev) out.push({ id, title: e.item.title, change: 'new', to: e.level })
    else if (LEVEL_RANK[e.level] > LEVEL_RANK[prev.level]) out.push({ id, title: e.item.title, change: 'raised', from: prev.level, to: e.level })
    else if (LEVEL_RANK[e.level] < LEVEL_RANK[prev.level]) out.push({ id, title: e.item.title, change: 'lowered', from: prev.level, to: e.level })
  }
  for (const [id, e] of a) if (!b.has(id)) out.push({ id, title: e.item.title, change: 'removed', from: e.level })
  return out
}
