// mep mods: gate, instant commands and status line, in one module (the engine follows `$`
// only within a file). They never verify anything themselves: they call the engine.
import type { EngineInterface, Register } from 'claude-code'
import { deployKind, mayDeploy, prToMain } from '../engine/src/deploy.ts'
import { guardCommand, guardFile } from '../engine/src/guard.ts'
import { findSecret, LOCAL_SECRET_FILE } from '../engine/src/secrets.ts'

async function runEngine($: EngineInterface, args: string[], timeoutMs = 600_000) {
  return $.process.run(['node', `${$.plugin.root}/engine/dist/mep.mjs`, ...args], { timeoutMs })
}

/** Nothing runs in a repo without .mep/profile.yaml. */
async function hasProfile($: EngineInterface): Promise<boolean> {
  const stat = await $.fs.stat('.mep/profile.yaml').catch(() => undefined)
  return stat?.kind === 'file'
}

function secretIn(path: string, text: string): string | undefined {
  if (LOCAL_SECRET_FILE.test(path)) return undefined
  const found = findSecret(text)
  return found ? `mep: ${path} recibiría un secreto (${found}). Los secretos van en .env local y en el gestor del hosting, nunca en archivos versionados.` : undefined
}

async function refreshStatus($: EngineInterface) {
  if (!(await hasProfile($))) return $.ui.status(undefined)
  const r = await runEngine($, ['status'], 30_000)
  $.ui.status(r.exitCode === 0 ? r.stdout.trim() || undefined : undefined)
}

export const register: Register = on => {
  // ── gate: deploys wait for the engine's gate; secrets never reach a versioned file ──
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const guarded = guardCommand(e.command)
    if (guarded && (await hasProfile($))) return { deny: guarded }
    if (!mayDeploy(e.command) || !(await hasProfile($))) return next(e)
    if (prToMain(e.command)) {
      const review = await runEngine($, ['pr-gate'], 30_000)
      return review.exitCode !== 0 ? { deny: review.stdout.trim() } : next(e)
    }
    const branch = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD']).catch(() => undefined)
    const kind = deployKind(e.command, branch?.stdout.trim())
    if (!kind) return next(e)
    const result = await runEngine($, ['verify', ...(kind === 'prod' ? ['--prod'] : [])])
    if (result.exitCode !== 0) return { deny: result.stdout.trim() || result.stderr.trim() }
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'mep: no se pudo verificar el deploy (¿node disponible?). Corre /mep:check.' }))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const deny = (await hasProfile($)) ? (guardFile(e.file_path) ?? secretIn(e.file_path, e.content)) : undefined
    return deny ? { deny } : next(e)
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = (await hasProfile($)) ? (guardFile(e.file_path) ?? secretIn(e.file_path, e.new_string)) : undefined
    return deny ? { deny } : next(e)
  })

  // ── human actions: these skills have disable-model-invocation, so only the person types them. The mod
  // answers without a Claude turn and passes the human channel the agent's Bash is denied. ──
  const HUMAN: Record<string, string[]> = { 'mep:confirm': ['confirm'], 'mep:override': ['override'], 'mep:threshold': ['threshold'], 'mep:resync': ['resync'] }
  for (const [command, engineArgs] of Object.entries(HUMAN)) {
    on('command.run', { command }, async ($, e, next) => {
      if (!(await hasProfile($))) return next(e)
      const args = (e.args ?? '').split(/\s+/).filter(Boolean)
      // Typing the command with its reason is the explicit confirmation.
      const yes = command === 'mep:override' || command === 'mep:threshold' ? ['--yes'] : []
      const r = await runEngine($, [...engineArgs, ...args, ...yes, '--human'], 30_000)
      return { text: (r.stdout || r.stderr).trim() }
    })
  }

  // ── commands: instant answers, no Claude turn. `/mep:phase close` goes on to the skill (audit + review). ──
  on('command.run', { command: 'mep:check' }, async ($, e, next) => {
    if (!(await hasProfile($))) return next(e)
    const r = await runEngine($, ['check', ...(e.args ?? '').split(/\s+/).filter(Boolean)])
    return { text: (r.stdout || r.stderr).trim() }
  })

  on('command.run', { command: 'mep:phase' }, async ($, e, next) => {
    if ((e.args ?? '').trim().startsWith('close') || !(await hasProfile($))) return next(e)
    const r = await runEngine($, ['phase'])
    return { text: (r.stdout || r.stderr).trim() }
  })

  // Manual quote: instant, but never automatic (the toggle lives in init and add --apply).
  on('command.run', { command: 'mep:quote' }, async ($, e, next) => {
    if (!(await hasProfile($))) return next(e)
    const r = await runEngine($, ['quote', ...(e.args ?? '').split(/\s+/).filter(Boolean)])
    return { text: (r.stdout || r.stderr).trim() }
  })

  // ── status: active sub-phase and pending 🔴/🟡, always visible ──
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refreshStatus($).catch(() => undefined)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refreshStatus($).catch(() => undefined)
    return result
  })
}
