import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { matchFiles, readText } from './files.ts'
import { dependencies } from './framework.ts'
import type { Catalog, Profile } from './types.ts'

type Detector = { grep: string; glob: string } | { dependency: string[] } | { file: string }

export function loadDetectors(catalog: Catalog): Record<string, Detector[]> {
  const file = join(catalog.dir, 'signals.yaml')
  return existsSync(file) ? (parse(readFileSync(file, 'utf8')) as Record<string, Detector[]>) : {}
}

function fires(root: string, d: Detector, deps: Set<string>): string | undefined {
  if ('dependency' in d) return d.dependency.find(dep => deps.has(dep))
  if ('file' in d) return matchFiles(root, d.file)[0]
  const re = new RegExp(d.grep)
  return matchFiles(root, d.glob).find(f => re.test(readText(root, f) ?? ''))
}

/** Signals the code shows. Each value is the evidence (a file or a dependency). */
export function detectSignals(root: string, catalog: Catalog): Record<string, string> {
  const deps = dependencies(root)
  const out: Record<string, string> = {}
  for (const [signal, detectors] of Object.entries(loadDetectors(catalog))) {
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
