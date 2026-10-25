import type { CommandRunInput, On } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'

const PENDING = 'mep bloquea el deploy a producción: 2 🔴 pendiente(s).'

/** Beneath the plugin: a repo with .mep/, a git branch, and an engine that answers by its arguments. */
function repo(on: On, opts: { profile?: boolean; branch?: string; verifyExit?: number } = {}) {
  const calls: string[][] = []
  on('fs.stat', () => {
    if (opts.profile === false) return { deny: 'ENOENT' }
    return { value: { kind: 'file', size: 1, mtimeMs: 0, isLink: false } }
  })
  on('process.run', ($, e) => {
    calls.push([...e.argv])
    if (e.argv[0] === 'git') return { value: { exitCode: 0, stdout: `${opts.branch ?? 'feature'}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    const cmd = e.argv[2]
    const stdout = cmd === 'verify' ? (opts.verifyExit ? PENDING : '') : cmd === 'check' ? 'foundation.setup  🔴 3/9 ← activa' : cmd === 'phase' ? 'Sub-etapa activa: foundation.setup' : cmd === 'quote' ? 'Cotización interna (USD, tarifa 40/h)' : cmd === 'pr-gate' ? 'mep: antes del PR a main, revisión de calidad de la rama.' : 'mep · foundation.setup · 🔴 6 · 🟡 2'
    const code = cmd === 'verify' ? (opts.verifyExit ?? 0) : cmd === 'pr-gate' ? 1 : 0
    return { value: { exitCode: code, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('tool.call', () => ({ result: 'ran' }))
  on('command.run', ($, e) => ({ text: 'skill' }))
  return calls
}

describe('gate', () => {
  test('a production deploy with pending 🔴 is denied with the engine message', async ($, on) => {
    const calls = repo(on, { verifyExit: 1 })
    const r = await $.tool.call({ tool: 'Bash', command: 'vercel deploy --prod' })
    expect(r.deny).toContain('bloquea el deploy a producción')
    expect(calls.some(a => a.includes('verify') && a.includes('--prod'))).toBe(true)
  })

  test('a preview deploy runs the stop rules (verify without --prod) and passes when clean', async ($, on) => {
    const calls = repo(on, { verifyExit: 0 })
    const r = await $.tool.call({ tool: 'Bash', command: 'vercel deploy' })
    expect(r.result).toBe('ran')
    expect(calls.some(a => a.includes('verify') && !a.includes('--prod'))).toBe(true)
  })

  test('other commands and repos without .mep/ are never checked', async ($, on) => {
    const calls = repo(on, { profile: false, verifyExit: 1 })
    expect((await $.tool.call({ tool: 'Bash', command: 'vercel --prod' })).result).toBe('ran')
    expect((await $.tool.call({ tool: 'Bash', command: 'pnpm test' })).result).toBe('ran')
    expect(calls.some(a => a.includes('verify'))).toBe(false)
  })

  test('a PR into main is held for the quality review', async ($, on) => {
    repo(on)
    const r = await $.tool.call({ tool: 'Bash', command: 'gh pr create --fill' })
    expect(r.deny).toContain('revisión de calidad')
  })

  test('writing a secret into a versioned file is refused; .env.local is allowed', async ($, on) => {
    repo(on)
    const key = 'sk_live_' + 'x'.repeat(24)
    const bad = await $.tool.call({ tool: 'Write', file_path: 'src/stripe.ts', content: `const k = "${key}"` })
    expect(bad.deny).toContain('Stripe secret key')
    expect((await $.tool.call({ tool: 'Write', file_path: '.env.local', content: `STRIPE_SECRET_KEY=${key}` })).result).toBe('ran')
  })

  test("mep's state changes only through the CLI; human actions are not the agent's", async ($, on) => {
    repo(on)
    expect((await $.tool.call({ tool: 'Edit', file_path: '.mep/profile.yaml', old_string: 'closed: []', new_string: 'closed: [x]' })).deny).toContain('solo cambia con la CLI')
    expect((await $.tool.call({ tool: 'Bash', command: 'echo x >> .mep/log' })).deny).toContain('solo cambia con la CLI')
    expect((await $.tool.call({ tool: 'Bash', command: 'node mep.mjs confirm git-protected-main' })).deny).toContain('esta acción es tuya')
    expect((await $.tool.call({ tool: 'Bash', command: 'MEP_BYPASS=1 vercel --prod' })).deny).toContain('MEP_BYPASS')
    expect((await $.tool.call({ tool: 'Bash', command: 'cat .mep/log' })).result).toBe('ran')
  })
})

// The kit fills in the fields the engine stamps (origin, presentation).
const cmd = (command: string, args = '') => ({ command, args }) as CommandRunInput

describe('human actions', () => {
  test('/mep:override, /mep:confirm and /mep:resync reach the engine with the human channel', async ($, on) => {
    const calls = repo(on)
    await $.command.run(cmd('mep:override', 'readme el cliente no lo quiere'))
    expect(calls.some(a => a.includes('override') && a.includes('--yes') && a.includes('--human'))).toBe(true)
    await $.command.run(cmd('mep:confirm', 'git-protected-main'))
    expect(calls.some(a => a.includes('confirm') && a.includes('--human') && !a.includes('--yes'))).toBe(true)
    await $.command.run(cmd('mep:resync'))
    expect(calls.some(a => a.includes('resync') && a.includes('--human'))).toBe(true)
  })
})

describe('commands', () => {
  test('/mep:check answers from the engine, without a Claude turn', async ($, on) => {
    repo(on)
    const r = await $.command.run(cmd('mep:check'))
    expect(r.text).toContain('foundation.setup')
  })

  test('/mep:phase answers directly; /mep:phase close goes on to the skill', async ($, on) => {
    repo(on)
    expect((await $.command.run(cmd('mep:phase'))).text).toContain('Sub-etapa activa')
    expect((await $.command.run(cmd('mep:phase', 'close foundation.setup'))).text).toBe('skill')
  })

  test('/mep:quote answers from the engine only when asked', async ($, on) => {
    const calls = repo(on)
    expect((await $.command.run(cmd('mep:quote'))).text).toContain('Cotización interna')
    expect(calls.filter(a => a.includes('quote')).length).toBe(1)
  })
})
