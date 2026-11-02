import { matchFiles, readText } from './files.ts'
import type { CheckResult, Profile } from './types.ts'

export type QualityKey = 'complexity' | 'max_lines' | 'max_function_lines' | 'max_params'

/** Spec defaults. A lower number is stricter; a higher one needs a reason (`mep threshold`). */
export const QUALITY_DEFAULTS: Record<QualityKey, number> = { complexity: 10, max_lines: 300, max_function_lines: 50, max_params: 4 }

const ESLINT_RULE: Record<QualityKey, string> = { complexity: 'complexity', max_lines: 'max-lines', max_function_lines: 'max-lines-per-function', max_params: 'max-params' }

export function thresholds(profile: Profile): Record<QualityKey, number> {
  return { ...QUALITY_DEFAULTS, ...profile.quality }
}

/** Reads `rule: ['error', 10]` or `rule: ['error', { max: 10 }]` from an ESLint config (flat or legacy). */
function eslintValue(text: string, rule: string): number | undefined {
  const name = rule.replace(/-/g, '\\-')
  const m = text.match(new RegExp(`["']?${name}["']?\\s*:\\s*\\[\\s*["']?(?:error|warn|1|2)["']?\\s*,\\s*(?:\\{[^}]*?\\bmax\\s*:\\s*)?(\\d+)`))
  return m ? Number(m[1]) : undefined
}

/** The project's linter enforces the profile's thresholds (or stricter ones). */
export function checkThresholds(root: string, profile: Profile): CheckResult {
  const wanted = thresholds(profile)
  const eslint = matchFiles(root, '{eslint.config.{js,mjs,cjs,ts},.eslintrc,.eslintrc.{json,js,cjs,yml,yaml}}')[0]
  if (!eslint) {
    const biome = matchFiles(root, 'biome.{json,jsonc}')[0]
    if (!biome) return { ok: false, detail: 'sin config de ESLint ni Biome' }
    const max = Number((readText(root, biome) ?? '').match(/"maxAllowedComplexity"\s*:\s*(\d+)/)?.[1])
    if (!max) return { ok: false, detail: `${biome}: falta noExcessiveCognitiveComplexity con maxAllowedComplexity` }
    if (max > wanted.complexity) return { ok: false, detail: `${biome}: complejidad ${max} > ${wanted.complexity}` }
    return { ok: null, detail: 'Biome no tiene max-lines ni max-params: revisa el largo de archivos y funciones y el número de parámetros a mano' }
  }
  const text = readText(root, eslint) ?? ''
  const problems: string[] = []
  for (const key of Object.keys(ESLINT_RULE) as QualityKey[]) {
    const value = eslintValue(text, ESLINT_RULE[key])
    if (value === undefined) problems.push(`falta ${ESLINT_RULE[key]} (≤ ${wanted[key]})`)
    else if (value > wanted[key]) problems.push(`${ESLINT_RULE[key]} ${value} > ${wanted[key]}`)
  }
  return problems.length ? { ok: false, detail: `${eslint}: ${problems.join('; ')}` } : { ok: true, detail: `${eslint}: umbrales al día` }
}

// Ruff settings that carry the profile thresholds. Ruff has no max-lines for a module, so file length is counted here.
const RUFF_SETTING: Partial<Record<QualityKey, string>> = { complexity: 'max-complexity', max_params: 'max-args', max_function_lines: 'max-statements' }
const RUFF_RULE_SETS = ['C90', 'PLR', 'S'] // complexity, pylint refactor (args, statements), bandit security

/** Ruff in pyproject.toml enforces the profile's thresholds (or stricter) and the C90, PLR and S rule sets; no .py file is longer than max_lines. */
export function checkPythonThresholds(root: string, profile: Profile): CheckResult {
  const text = readText(root, 'pyproject.toml')
  if (text === undefined) return { ok: false, detail: 'falta pyproject.toml con la configuración de Ruff' }
  const wanted = thresholds(profile)
  const problems: string[] = []
  for (const [key, setting] of Object.entries(RUFF_SETTING) as [QualityKey, string][]) {
    const value = Number(text.match(new RegExp(`^\\s*${setting}\\s*=\\s*(\\d+)`, 'm'))?.[1])
    if (!value) problems.push(`falta ${setting} (≤ ${wanted[key]})`)
    else if (value > wanted[key]) problems.push(`${setting} ${value} > ${wanted[key]}`)
  }
  const selected = [...text.matchAll(/^\s*(?:extend-)?select\s*=\s*\[([^\]]*)\]/gm)].flatMap(m => [...m[1].matchAll(/["']([A-Z0-9]+)["']/g)].map(c => c[1]))
  const missing = RUFF_RULE_SETS.filter(set => !selected.some(code => code === 'ALL' || set.startsWith(code)))
  if (missing.length) problems.push(`Ruff no selecciona ${missing.join(', ')} (complejidad, refactor y seguridad: ${RUFF_RULE_SETS.join(', ')})`)
  const long = matchFiles(root, '**/*.py').filter(f => (readText(root, f) ?? '').split('\n').length > wanted.max_lines)
  if (long.length) problems.push(`archivos con más de ${wanted.max_lines} líneas: ${long.slice(0, 5).join(', ')}`)
  return problems.length ? { ok: false, detail: `pyproject.toml: ${problems.join('; ')}` } : { ok: true, detail: 'Ruff con los umbrales del perfil' }
}
