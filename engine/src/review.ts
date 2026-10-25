import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { listFiles, readText } from './files.ts'
import { MEP_DIR, today } from './profile.ts'

export const REVIEWS_DIR = join(MEP_DIR, 'reviews')

export type ReviewTool = 'ponytail' | 'mep'

export type Review = {
  sub: string
  tool: ReviewTool
  must_fix: number
  notes: string
  hash: string
  date: string
}

function readJson(file: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

/**
 * Is the Ponytail plugin installed and enabled? Project settings win over user settings;
 * installed but not mentioned in any settings counts as enabled. MEP_PONYTAIL=1|0 forces the answer.
 */
export function ponytailInstalled(root: string, env = process.env): boolean {
  if (env.MEP_PONYTAIL === '1') return true
  if (env.MEP_PONYTAIL === '0') return false
  const claudeDir = env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
  const settings = [join(root, '.claude', 'settings.local.json'), join(root, '.claude', 'settings.json'), join(claudeDir, 'settings.json')]
  for (const file of settings) {
    const enabled = readJson(file)?.enabledPlugins as Record<string, boolean> | undefined
    const key = Object.keys(enabled ?? {}).find(k => k.startsWith('ponytail@'))
    if (key) return enabled![key] === true
  }
  const installed = join(claudeDir, 'plugins', 'installed_plugins.json')
  return existsSync(installed) && /"ponytail@/.test(readFileSync(installed, 'utf8'))
}

/** Files mep regenerates on its own: they are not code and must not expire a review. */
const GENERATED = new Set(['SCOPE.md', 'BRIEF.md', 'REGISTRY.md', 'CODEMAP.md'])

/** The project's files: what git tracks or would track (respects .gitignore), or the walk without git. */
function projectFiles(root: string): string[] {
  try {
    const out = execSync('git ls-files -co --exclude-standard', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
    return out.split('\n').filter(f => f && !f.startsWith(`${MEP_DIR}/`)).sort()
  } catch {
    return listFiles(root)
  }
}

/** Hash of the project's code (.mep and mep's generated files excluded). When the code changes, the review expires. */
export function hashProject(root: string): string {
  const h = createHash('sha256')
  for (const f of projectFiles(root).filter(f => !GENERATED.has(f))) {
    let content: Buffer | string
    try {
      content = readFileSync(join(root, f))
    } catch {
      content = '<missing>'
    }
    h.update(`${f}\0`).update(content).update('\0')
  }
  return h.digest('hex')
}

export function readReview(root: string, sub: string): Review | undefined {
  const text = readText(root, join(REVIEWS_DIR, `${sub}.json`))
  if (!text) return undefined
  try {
    return JSON.parse(text) as Review
  } catch {
    return undefined
  }
}

export function recordReview(root: string, input: Omit<Review, 'hash' | 'date'>): Review {
  const review: Review = { ...input, hash: hashProject(root), date: today() }
  mkdirSync(join(root, REVIEWS_DIR), { recursive: true })
  writeFileSync(join(root, REVIEWS_DIR, `${input.sub}.json`), JSON.stringify(review, null, 2) + '\n')
  return review
}

/** What closing `sub` needs from the quality review. With Ponytail installed, only /ponytail-review counts. */
export function reviewState(root: string, sub: string, env = process.env): { valid: boolean; detail: string } {
  const ponytail = ponytailInstalled(root, env)
  const how = ponytail
    ? `corre /ponytail-review y registra el resultado: mep review record --sub ${sub} --tool ponytail --must-fix <n>`
    : `haz la revisión propia (duplicados, nombres, complejidad, reutilización contra REGISTRY.md) y regístrala: mep review record --sub ${sub} --tool mep --must-fix <n>`
  const review = readReview(root, sub)
  if (!review) return { valid: false, detail: `sin revisión de calidad: ${how}` }
  if (ponytail && review.tool !== 'ponytail') return { valid: false, detail: `Ponytail está instalado y la revisión no es de /ponytail-review: ${how}` }
  if (review.must_fix > 0) return { valid: false, detail: `la revisión tiene ${review.must_fix} "must fix" pendiente(s)${review.notes ? ` — ${review.notes}` : ''}. Arréglalos y vuelve a revisar.` }
  if (hashProject(root) !== review.hash) return { valid: false, detail: `revisión vencida: el código cambió después de revisarlo. Vuelve a revisar: ${how}` }
  return { valid: true, detail: `revisado con ${review.tool} el ${review.date}` }
}
