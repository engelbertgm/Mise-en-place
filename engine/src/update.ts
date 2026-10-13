import { evaluate } from './evaluate.ts'
import type { Catalog, Evaluated, Profile } from './types.ts'
import { compareVersions } from './version.ts'

export type UpdateEntry = Evaluated & { change: 'new' | 'modified'; inClosedPhase: boolean }

/** Items added or changed in the catalog after the profile's version that apply to this profile. */
export function catalogUpdates(profile: Profile, catalog: Catalog): UpdateEntry[] {
  const since = profile.catalog_version
  const closed = new Set(profile.phase.closed)
  return evaluate(profile, catalog)
    .filter(e => compareVersions(e.item.since, since) > 0 || (e.item.updated !== undefined && compareVersions(e.item.updated, since) > 0))
    .map(e => ({ ...e, change: compareVersions(e.item.since, since) > 0 ? ('new' as const) : ('modified' as const), inClosedPhase: closed.has(e.item.phase) }))
}

/**
 * Accepting an update moves the profile to the catalog's version. New required items that fall
 * in an already closed sub-phase get a grace period: they do not block until the next phase close
 * or a production deploy.
 */
export function applyUpdate(profile: Profile, catalog: Catalog): { profile: Profile; graced: string[] } {
  const graced = catalogUpdates(profile, catalog)
    .filter(u => u.inClosedPhase && u.level === 'required' && u.state === 'active')
    .map(u => u.item.id)
  return {
    profile: { ...profile, catalog_version: catalog.version, selections: { ...profile.selections, grace: [...new Set([...profile.selections.grace, ...graced])].sort() } },
    graced,
  }
}
