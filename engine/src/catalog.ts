import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import type { Catalog, Check, Condition, Dimensions, Item, Leaf, Matcher, Profile, StackRule } from './types.ts'

const LEVELS = ['required', 'recommended', 'optional']
const SIZES = ['XS', 'S', 'M', 'L', 'XL']
const SCALES = ['pages', 'entities', 'languages', 'markets', 'integrations']
const CHECK_TYPES = ['file_exists', 'route_exists', 'grep', 'json_key', 'command', 'html', 'sql', 'maps', 'quality', 'design', 'build', 'robots', 'manual']

/** The catalog ships next to the engine: `<root>/catalog`, whether run from source or from the bundle. */
export function defaultCatalogDir(): string {
  if (process.env.MEP_CATALOG) return resolve(process.env.MEP_CATALOG)
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 4; i++) {
    if (existsSync(join(dir, 'catalog', 'dimensions.yaml'))) return join(dir, 'catalog')
    dir = dirname(dir)
  }
  throw new Error('mep: catalog not found (set MEP_CATALOG)')
}

function readYaml<T>(path: string): T {
  return parse(readFileSync(path, 'utf8')) as T
}

function readYamlDir<T>(dir: string): T[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith('.yaml'))
    .sort()
    .flatMap(f => readYaml<T[]>(join(dir, f)) ?? [])
}

export function loadCatalog(dir = defaultCatalogDir()): Catalog {
  const presetsDir = join(dir, 'presets')
  const presets: Catalog['presets'] = {}
  if (existsSync(presetsDir)) {
    for (const f of readdirSync(presetsDir).filter(f => f.endsWith('.yaml')).sort()) {
      presets[f.replace(/\.yaml$/, '')] = readYaml(join(presetsDir, f))
    }
  }
  const catalog: Catalog = {
    version: readFileSync(join(dir, 'VERSION'), 'utf8').trim(),
    dir,
    dimensions: readYaml<Dimensions>(join(dir, 'dimensions.yaml')),
    items: [...readYamlDir<Item>(join(dir, 'items')), ...readYamlDir<Item>(join(dir, 'markets'))],
    stackRules: readYaml<StackRule[]>(join(dir, 'stack-rules.yaml')) ?? [],
    presets,
    sensitivePaths: readYaml<{ paths: string[] }>(join(dir, 'sensitive.yaml')).paths,
  }
  const errors = validateCatalog(catalog)
  if (errors.length) throw new Error(`mep: invalid catalog\n- ${errors.join('\n- ')}`)
  return catalog
}

function dimensionValues(dims: Dimensions, key: keyof Leaf): string[] {
  if (key === 'markets') return [...dims.markets, ...Object.values(dims.market_sublevels).flat()]
  return (dims[key as 'type' | 'capabilities' | 'audience' | 'context'] as string[]) ?? []
}

function matcherValues(m: Matcher): string[] {
  if (typeof m === 'string') return [m]
  if (Array.isArray(m)) return m
  return [...(m.any ?? []), ...(m.all ?? []), ...(m.none ?? [])]
}

export function validateCondition(cond: Condition, dims: Dimensions, where: string): string[] {
  if ('all' in cond && Array.isArray(cond.all)) return cond.all.flatMap(c => validateCondition(c, dims, where))
  if ('any' in cond && Array.isArray(cond.any)) return cond.any.flatMap(c => validateCondition(c, dims, where))
  if ('not' in cond) return validateCondition(cond.not, dims, where)
  const errors: string[] = []
  for (const [key, matcher] of Object.entries(cond as Leaf)) {
    if (key === 'signals') {
      for (const [signal, value] of Object.entries(matcher as Record<string, unknown>)) {
        const def = dims.signals[signal]
        if (!def) errors.push(`${where}: unknown signal "${signal}"`)
        else if (!def.values.includes(value as string | boolean)) errors.push(`${where}: invalid value for ${signal}: ${value}`)
      }
      continue
    }
    if (!['type', 'capabilities', 'markets', 'audience', 'context'].includes(key)) {
      errors.push(`${where}: unknown dimension "${key}"`)
      continue
    }
    const valid = dimensionValues(dims, key as keyof Leaf)
    for (const v of matcherValues(matcher as Matcher)) {
      if (!valid.includes(v)) errors.push(`${where}: "${v}" is not a valid ${key}`)
    }
  }
  return errors
}

function validateCheck(check: Check, where: string): string[] {
  if (!CHECK_TYPES.includes(check.type)) return [`${where}: unknown verify type "${check.type}"`]
  const required: Record<string, string[]> = {
    file_exists: ['path'],
    route_exists: ['path'],
    grep: ['pattern', 'glob'],
    json_key: ['file', 'key'],
    command: ['run'],
    html: ['rule'],
    sql: ['rule'],
    maps: ['rule'],
    quality: ['rule'],
    design: ['rule', 'max'],
    build: ['rule'],
    robots: ['rule'],
    manual: ['prompt'],
  }
  const errors = required[check.type]
    .filter(f => (check as Record<string, unknown>)[f] === undefined)
    .map(f => `${where}: verify ${check.type} needs "${f}"`)
  if (check.type === 'grep') {
    try {
      new RegExp(check.pattern, check.flags)
    } catch {
      errors.push(`${where}: invalid regex ${check.pattern}`)
    }
  }
  return errors
}

export function validateCatalog(catalog: Catalog): string[] {
  const { dimensions: dims } = catalog
  const errors: string[] = []
  const ids = new Set<string>()
  for (const item of catalog.items) {
    const where = `item ${item.id ?? '(no id)'}`
    if (!item.id) errors.push(`${where}: missing id`)
    if (ids.has(item.id)) errors.push(`${where}: duplicate id`)
    ids.add(item.id)
    for (const f of ['title', 'category', 'why', 'how', 'since'] as const) {
      if (!item[f]) errors.push(`${where}: missing ${f}`)
    }
    if (!LEVELS.includes(item.level)) errors.push(`${where}: invalid level ${item.level}`)
    if (!dims.phases.includes(item.phase)) errors.push(`${where}: invalid phase ${item.phase}`)
    if (!item.effort || !SIZES.includes(item.effort.size) || item.effort.hours?.length !== 2) {
      errors.push(`${where}: invalid effort`)
    } else if (item.effort.scales_with && !SCALES.includes(item.effort.scales_with)) {
      errors.push(`${where}: invalid scales_with`)
    }
    if (!Array.isArray(item.verify) || item.verify.length === 0) errors.push(`${where}: needs at least one verify`)
    else item.verify.forEach(c => errors.push(...validateCheck(c, where)))
    if (item.when) errors.push(...validateCondition(item.when, dims, where))
    for (const o of item.level_overrides ?? []) {
      if (!LEVELS.includes(o.level)) errors.push(`${where}: invalid override level`)
      errors.push(...validateCondition(o.when, dims, where))
    }
  }
  for (const item of catalog.items) {
    for (const ref of [...(item.depends_on ?? []), ...(item.conflicts_with ?? [])]) {
      if (!ids.has(ref)) errors.push(`item ${item.id}: references unknown item ${ref}`)
    }
  }
  for (const rule of catalog.stackRules) {
    if (!rule.why) errors.push(`stack rule ${rule.id}: missing why`)
    if (rule.when) errors.push(...validateCondition(rule.when, dims, `stack rule ${rule.id}`))
  }
  return errors
}

/** Profile values must come from dimensions.yaml. */
export function validateProfile(profile: Profile, catalog: Catalog): string[] {
  const dims = catalog.dimensions
  const errors: string[] = []
  const markets = dimensionValues(dims, 'markets')
  if (!dims.type.includes(profile.type)) errors.push(`type "${profile.type}" is not valid`)
  if (!dims.context.includes(profile.context)) errors.push(`context "${profile.context}" is not valid`)
  for (const c of profile.capabilities) if (!dims.capabilities.includes(c)) errors.push(`capability "${c}" is not valid`)
  for (const a of profile.audience) if (!dims.audience.includes(a)) errors.push(`audience "${a}" is not valid`)
  for (const m of profile.markets) if (!markets.includes(m)) errors.push(`market "${m}" is not valid`)
  for (const [k, v] of Object.entries(profile.signals)) {
    const def = dims.signals[k]
    if (!def) errors.push(`signal "${k}" is not valid`)
    else if (!def.values.includes(v)) errors.push(`signal ${k}: "${v}" is not valid`)
  }
  for (const p of [...profile.phase.closed, profile.phase.active]) {
    if (!dims.phases.includes(p)) errors.push(`phase "${p}" is not valid`)
  }
  return errors
}
