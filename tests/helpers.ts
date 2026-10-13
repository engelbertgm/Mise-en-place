import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { stringify } from 'yaml'
import { loadCatalog } from '../engine/src/catalog.ts'
import { clearFileCache } from '../engine/src/files.ts'
import { normalizeProfile, saveProfile } from '../engine/src/profile.ts'
import type { Catalog, Item, Profile } from '../engine/src/types.ts'

export const REPO = resolve(import.meta.dirname, '..')
export const REAL_CATALOG = join(REPO, 'catalog')
export const CLI = join(REPO, 'engine', 'dist', 'mep.mjs')

export function tempDir(prefix = 'mep-'): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

/** A project folder with the given files. */
export function makeRepo(files: Record<string, string> = {}): string {
  const root = tempDir()
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  clearFileCache()
  return root
}

export function addFiles(root: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  clearFileCache()
}

export function item(partial: Partial<Item> & Pick<Item, 'id'>): Item {
  return {
    title: partial.id,
    category: 'base',
    level: 'required',
    phase: 'foundation.setup',
    since: '2026.10.1',
    effort: { size: 'XS', hours: [0.5, 1] },
    why: 'porque',
    how: 'así',
    verify: [{ type: 'file_exists', path: `${partial.id}.txt` }],
    ...partial,
  }
}

/** A catalog with the real dimensions and the given items: small, so tests control every item. */
export function testCatalog(items: Item[]): Catalog {
  const dir = tempDir('mep-catalog-')
  for (const f of ['dimensions.yaml', 'VERSION', 'sensitive.yaml', 'signals.yaml']) copyFileSync(join(REAL_CATALOG, f), join(dir, f))
  writeFileSync(join(dir, 'stack-rules.yaml'), '[]\n')
  mkdirSync(join(dir, 'items'))
  writeFileSync(join(dir, 'items', 'test.yaml'), stringify(items))
  return loadCatalog(dir)
}

export function profile(catalog: Catalog, partial: Partial<Profile> = {}): Profile {
  return normalizeProfile({ project: 'test', ...partial }, catalog)
}

export function withProfile(root: string, catalog: Catalog, partial: Partial<Profile> = {}): Profile {
  const p = profile(catalog, partial)
  saveProfile(root, p)
  return p
}
