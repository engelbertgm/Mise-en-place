import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import type { Catalog, Profile } from './types.ts'

export const MEP_DIR = '.mep'
export const PROFILE_FILE = join(MEP_DIR, 'profile.yaml')

export function hasProfile(root: string): boolean {
  return existsSync(join(root, PROFILE_FILE))
}

export function emptyProfile(catalog: Catalog): Profile {
  const signals: Profile['signals'] = {}
  for (const [k, def] of Object.entries(catalog.dimensions.signals)) signals[k] = def.default
  return {
    version: 1,
    catalog_version: catalog.version,
    project: '',
    phase: { closed: [], active: catalog.dimensions.phases[0] },
    type: 'landing',
    capabilities: [],
    markets: [],
    audience: [],
    context: 'own-product',
    counts: {},
    signals,
    selections: { optional_added: [], recommended_skipped: [], overrides: [], manual_confirmed: [], grace: [] },
    stack: { decided: {} },
  }
}

/** Fills every missing field so the rest of the engine never checks for undefined. */
export function normalizeProfile(raw: Partial<Profile>, catalog: Catalog): Profile {
  const base = emptyProfile(catalog)
  const profile: Profile = {
    ...base,
    ...raw,
    phase: { ...base.phase, ...raw.phase },
    counts: { ...raw.counts },
    signals: { ...base.signals, ...raw.signals },
    selections: { ...base.selections, ...raw.selections },
    stack: { decided: { ...raw.stack?.decided } },
    capabilities: [...(raw.capabilities ?? [])],
    markets: [...(raw.markets ?? [])],
    audience: [...(raw.audience ?? [])],
  }
  profile.phase.closed = [...(profile.phase.closed ?? [])]
  for (const key of ['optional_added', 'recommended_skipped', 'overrides', 'manual_confirmed', 'grace'] as const) {
    profile.selections[key] = [...((profile.selections[key] as unknown[]) ?? [])] as never
  }
  return applyImplications(profile, catalog)
}

/** `auth` implies forms, a database and personal data; more than one language implies i18n. */
export function applyImplications(profile: Profile, catalog: Catalog): Profile {
  if ((profile.counts.languages ?? 1) > 1 && !profile.capabilities.includes('i18n')) {
    profile.capabilities.push('i18n')
  }
  const implies = catalog.dimensions.implies
  let changed = true
  while (changed) {
    changed = false
    for (const cap of [...profile.capabilities]) {
      const rule = implies[cap]
      if (!rule) continue
      for (const extra of rule.capabilities ?? []) {
        if (!profile.capabilities.includes(extra)) {
          profile.capabilities.push(extra)
          changed = true
        }
      }
      for (const [signal, value] of Object.entries(rule.signals ?? {})) {
        // An implied signal only turns things on; an explicit `true` from the user is never lowered.
        if (value === true && profile.signals[signal] !== true) profile.signals[signal] = true
      }
    }
  }
  return profile
}

export function loadProfile(root: string, catalog: Catalog): Profile {
  const raw = parse(readFileSync(join(root, PROFILE_FILE), 'utf8')) as Partial<Profile>
  return normalizeProfile(raw, catalog)
}

export function saveProfile(root: string, profile: Profile): void {
  mkdirSync(join(root, MEP_DIR), { recursive: true })
  writeFileSync(join(root, PROFILE_FILE), stringify(profile, { lineWidth: 0 }))
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** `.mep/log`: one line per override, bypass or phase change. Versioned with the repo. */
export function log(root: string, event: string, detail: string): void {
  mkdirSync(join(root, MEP_DIR), { recursive: true })
  appendFileSync(join(root, MEP_DIR, 'log'), `${new Date().toISOString()} ${event} ${detail}\n`)
}
