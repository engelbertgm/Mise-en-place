import { matches } from './conditions.ts'
import { effectiveLevel } from './evaluate.ts'
import type { Catalog, Condition, Item, Leaf, Matcher, Profile } from './types.ts'

const DIM_LABEL: Record<string, string> = { type: 'tipo', capabilities: 'capacidades', markets: 'mercados', audience: 'audiencia', context: 'contexto', signals: 'señales' }

function matcherText(m: Matcher): string {
  if (typeof m === 'string') return m
  if (Array.isArray(m)) return m.join(' y ')
  return [m.all && `todas de [${m.all.join(', ')}]`, m.any && `alguna de [${m.any.join(', ')}]`, m.none && `ninguna de [${m.none.join(', ')}]`].filter(Boolean).join(', ')
}

function leafText(leaf: Leaf): string {
  return Object.entries(leaf)
    .map(([k, v]) => (k === 'signals' ? Object.entries(v as Record<string, unknown>).map(([s, val]) => `${s} = ${val}`).join(', ') : `${DIM_LABEL[k] ?? k}: ${matcherText(v as Matcher)}`))
    .join(' · ')
}

/** The condition tree with ✓ / ✗ on each branch, so the person sees exactly why a rule applies or not. */
export function explainCondition(cond: Condition, profile: Profile, depth = 0): string[] {
  const pad = '  '.repeat(depth)
  const mark = matches(cond, profile) ? '✓' : '✗'
  if ('all' in cond && Array.isArray(cond.all)) return [`${pad}${mark} todas:`, ...cond.all.flatMap(c => explainCondition(c, profile, depth + 1))]
  if ('any' in cond && Array.isArray(cond.any)) return [`${pad}${mark} alguna:`, ...cond.any.flatMap(c => explainCondition(c, profile, depth + 1))]
  if ('not' in cond) return [`${pad}${mark} no:`, ...explainCondition(cond.not, profile, depth + 1)]
  // A leaf with several fields (or several signals) is split, so each one shows its own ✓ / ✗.
  const parts = Object.entries(cond as Leaf).flatMap(([k, v]) =>
    k === 'signals' ? Object.entries(v as Record<string, string | boolean>).map(([s, val]) => ({ signals: { [s]: val } }) as Leaf) : [{ [k]: v } as Leaf],
  )
  if (parts.length === 1) return [`${pad}${mark} ${leafText(cond as Leaf)}`]
  return [`${pad}${mark} todas:`, ...parts.map(p => `${pad}  ${matches(p, profile) ? '✓' : '✗'} ${leafText(p)}`)]
}

export function explainItem(item: Item, profile: Profile): string {
  const applies = matches(item.when, profile)
  const lines = [`${item.id} — ${item.title}`, '', applies ? '✅ Aplica a este scope.' : '➖ No aplica a este scope.']
  lines.push(item.when ? 'Condición:' : 'Condición: ninguna (aplica a todo proyecto).')
  if (item.when) lines.push(...explainCondition(item.when, profile, 1))
  if (applies) {
    const level = effectiveLevel(item, profile)
    lines.push('', `Nivel: ${level}${level !== item.level ? ` (base ${item.level}, sube por el scope)` : ''}`)
    for (const o of item.level_overrides ?? []) lines.push(`  ${matches(o.when, profile) ? '✓' : '✗'} → ${o.level} si ${explainCondition(o.when, profile).join(' ').replace(/\s+/g, ' ').trim()}`)
  }
  lines.push('', `Por qué: ${item.why}`)
  return lines.join('\n')
}

export type Applicability = { applies: number; byLevel: Record<string, number>; notApplying: string[]; total: number }

export function applicability(profile: Profile, catalog: Catalog): Applicability {
  const byLevel: Record<string, number> = { required: 0, recommended: 0, optional: 0 }
  const notApplying: string[] = []
  for (const item of catalog.items) {
    if (matches(item.when, profile)) byLevel[effectiveLevel(item, profile)]++
    else notApplying.push(item.id)
  }
  return { applies: catalog.items.length - notApplying.length, byLevel, notApplying, total: catalog.items.length }
}
