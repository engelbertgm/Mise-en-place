import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { matchFiles, readText } from './files.ts'
import { dependencies } from './framework.ts'
import type { Catalog, Profile } from './types.ts'

/** grep: any match · count: at least `min` matches in one file · dependency · file. */
type Detector = { grep: string; glob: string } | { count: string; glob: string; min: number } | { dependency: string[] } | { file: string }

export function loadDetectors(catalog: Catalog, name = 'signals.yaml'): Record<string, Detector[]> {
  const file = join(catalog.dir, name)
  return existsSync(file) ? (parse(readFileSync(file, 'utf8')) as Record<string, Detector[]>) : {}
}

function fires(root: string, d: Detector, deps: Set<string>): string | undefined {
  if ('dependency' in d) return d.dependency.find(dep => deps.has(dep))
  if ('file' in d) return matchFiles(root, d.file)[0]
  if ('count' in d) {
    const re = new RegExp(d.count, 'g')
    const hit = matchFiles(root, d.glob).find(f => ((readText(root, f) ?? '').match(re)?.length ?? 0) >= d.min)
    return hit ? `${hit} (${d.min}+ coincidencias)` : undefined
  }
  const re = new RegExp(d.grep)
  return matchFiles(root, d.glob).find(f => re.test(readText(root, f) ?? ''))
}

/** Signals the code shows. Each value is the evidence (a file or a dependency). */
export function detectSignals(root: string, catalog: Catalog): Record<string, string> {
  return detect(root, loadDetectors(catalog))
}

/** Capabilities the code shows (catalog/detect.yaml), for /mep:audit. */
export function detectCapabilities(root: string, catalog: Catalog): Record<string, string> {
  return detect(root, loadDetectors(catalog, 'detect.yaml'))
}

function detect(root: string, table: Record<string, Detector[]>): Record<string, string> {
  const deps = dependencies(root)
  const out: Record<string, string> = {}
  for (const [signal, detectors] of Object.entries(table)) {
    for (const d of detectors) {
      const evidence = fires(root, d, deps)
      if (evidence) {
        out[signal] = evidence
        break
      }
    }
  }
  return out
}

/** Signals present in the code but missing in the profile: the plugin proposes updating the profile. */
export function missingSignals(root: string, profile: Profile, catalog: Catalog): { signal: string; evidence: string }[] {
  return Object.entries(detectSignals(root, catalog))
    .filter(([signal]) => profile.signals[signal] !== true)
    .map(([signal, evidence]) => ({ signal, evidence }))
}
