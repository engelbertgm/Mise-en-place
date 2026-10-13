import type { Condition, Leaf, Matcher, Profile } from './types.ts'

/** `EU` covers `EU:DE`; `EU:DE` covers only itself. */
export function marketCovers(wanted: string, chosen: string): boolean {
  return chosen === wanted || chosen.startsWith(`${wanted}:`)
}

function hasValue(values: string[], wanted: string, isMarket: boolean): boolean {
  return values.some(v => (isMarket ? marketCovers(wanted, v) : v === wanted))
}

function matchList(values: string[], matcher: Matcher, isMarket = false): boolean {
  const has = (w: string) => hasValue(values, w, isMarket)
  if (typeof matcher === 'string') return has(matcher)
  if (Array.isArray(matcher)) return matcher.every(has)
  if (matcher.all && !matcher.all.every(has)) return false
  if (matcher.any && !matcher.any.some(has)) return false
  if (matcher.none && matcher.none.some(has)) return false
  return true
}

function matchScalar(value: string, matcher: Matcher): boolean {
  if (typeof matcher === 'string') return value === matcher
  if (Array.isArray(matcher)) return matcher.includes(value)
  if (matcher.any && !matcher.any.includes(value)) return false
  if (matcher.all && !matcher.all.every(m => m === value)) return false
  if (matcher.none && matcher.none.includes(value)) return false
  return true
}

function matchLeaf(leaf: Leaf, profile: Profile): boolean {
  if (leaf.type !== undefined && !matchScalar(profile.type, leaf.type)) return false
  if (leaf.context !== undefined && !matchScalar(profile.context, leaf.context)) return false
  if (leaf.capabilities !== undefined && !matchList(profile.capabilities, leaf.capabilities)) return false
  if (leaf.audience !== undefined && !matchList(profile.audience, leaf.audience)) return false
  if (leaf.markets !== undefined && !matchList(profile.markets, leaf.markets, true)) return false
  if (leaf.signals) {
    for (const [key, wanted] of Object.entries(leaf.signals)) {
      if (profile.signals[key] !== wanted) return false
    }
  }
  return true
}

export function matches(condition: Condition | undefined, profile: Profile): boolean {
  if (condition === undefined) return true
  if ('all' in condition && Array.isArray(condition.all)) return condition.all.every(c => matches(c, profile))
  if ('any' in condition && Array.isArray(condition.any)) return condition.any.some(c => matches(c, profile))
  if ('not' in condition) return !matches(condition.not, profile)
  return matchLeaf(condition as Leaf, profile)
}
