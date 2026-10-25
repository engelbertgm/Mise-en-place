import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// The seal: after every write through the CLI, the last state line of .mep/log holds the hash of mep's state.
// A state that no longer matches it was changed outside the CLI, and `mep verify` blocks until /mep:resync.

const DIR = '.mep'
const LOG = join(DIR, 'log')
const STATE_LINE = / state ([0-9a-f]{64})$/

function read(root: string, rel: string): string | undefined {
  try {
    return readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')
  } catch {
    return undefined
  }
}

function jsonFiles(root: string, sub: string): string[] {
  try {
    return readdirSync(join(root, DIR, sub)).filter(f => f.endsWith('.json')).sort().map(f => `${DIR}/${sub}/${f}`)
  } catch {
    return []
  }
}

function logLines(root: string): string[] {
  return (read(root, LOG) ?? '').split('\n').filter(Boolean)
}

/** Hash of mep's state: profile, security reports, reviews and the log without its seal lines. */
export function stateHash(root: string): string {
  const h = createHash('sha256')
  for (const rel of [`${DIR}/profile.yaml`, ...jsonFiles(root, 'security'), ...jsonFiles(root, 'reviews')]) {
    h.update(`${rel}\0${read(root, rel) ?? '<missing>'}\0`)
  }
  h.update(logLines(root).filter(l => !STATE_LINE.test(l)).join('\n'))
  return h.digest('hex')
}

function lastSeal(root: string): string | undefined {
  return logLines(root).reverse().map(l => l.match(STATE_LINE)?.[1]).find(Boolean)
}

function append(root: string, event: string, detail: string): void {
  mkdirSync(join(root, DIR), { recursive: true })
  appendFileSync(join(root, LOG), `${new Date().toISOString()} ${event} ${detail}\n`)
}

/** Seals the current state. Every writer of state calls it after writing. */
export function seal(root: string): void {
  append(root, 'state', stateHash(root))
}

export class SealBroken extends Error {}

const BROKEN = 'estado de mep modificado fuera de la CLI (.mep/profile.yaml, log, security/ o reviews/). Revisa el cambio y, si es tuyo, corre /mep:resync.'

export type SealState = { ok: boolean; detail: string }

/** A repo from 0.1.x has no seal yet: it is sealed once, and that event shows in the PR summary. */
export function checkSeal(root: string): SealState {
  if (!existsSync(join(root, DIR, 'profile.yaml')) && !existsSync(join(root, LOG))) return { ok: true, detail: 'sin estado todavía' }
  const sealed = lastSeal(root)
  if (!sealed) {
    append(root, 'seal-initial', 'repo sin sello (0.1.x): sellado por primera vez')
    seal(root)
    return { ok: true, detail: 'sellado por primera vez' }
  }
  return sealed === stateHash(root) ? { ok: true, detail: 'sellado' } : { ok: false, detail: BROKEN }
}

/** Before a writer changes state: otherwise it would seal someone else's edit as its own. */
export function assertSealed(root: string): void {
  if (!checkSeal(root).ok) throw new SealBroken(BROKEN)
}

/** The person accepts the current state as theirs and seals it again. */
export function resync(root: string, by: string): void {
  append(root, 'resync', by)
  seal(root)
}

/**
 * Markdown for the PR summary: every state event since `base` (overrides, confirmations, phase closes,
 * thresholds, bypasses, seals, reviews, audits). It does not block; it makes every shortcut visible before the merge.
 */
export function stateChanges(root: string, base: string): string {
  let before: string[] = []
  try {
    before = execSync(`git show ${base}:.mep/log`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  } catch {
    // The base has no log yet: everything is new.
  }
  const seen = new Set(before)
  const events = logLines(root)
    .filter(l => !seen.has(l) && !STATE_LINE.test(l))
    .map(l => l.match(/^(\S+) (\S+) ?(.*)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
  if (!events.length) return '### mep: sin cambios de estado en este PR\n'
  const cell = (s: string) => s.replace(/\|/g, '\\|')
  return [
    `### mep: ${events.length} cambio(s) de estado en este PR`,
    '',
    '| Fecha | Evento | Detalle |',
    '| --- | --- | --- |',
    ...events.map(([, date, event, detail]) => `| ${date.slice(0, 16).replace('T', ' ')} | ${cell(event)} | ${cell(detail)} |`),
    '',
  ].join('\n')
}

/** Writes an event and seals: the log is part of the state. */
export function logEvent(root: string, event: string, detail: string): void {
  assertSealed(root)
  append(root, event, detail)
  seal(root)
}
