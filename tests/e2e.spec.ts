// Phase 8: the whole flow on the test project (examples/estudio-saas): a fictitious SaaS with auth and
// payments for MX, USA:CA and EU:DE. Each step runs the bundled CLI, as skills, hooks and CI do.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { before, describe, test } from 'node:test'
import { parse } from 'yaml'
import { seal } from '../engine/src/seal.ts'
import { CLI, REPO, tempDir } from './helpers.ts'

const root = tempDir('mep-e2e-')
const config = tempDir('mep-e2e-config-')

function mep(args: string[], opts: { input?: string; env?: Record<string, string> } = {}) {
  const r = spawnSync('node', [CLI, ...args], {
    cwd: root,
    input: opts.input,
    encoding: 'utf8',
    env: { ...process.env, MEP_BYPASS: '', MEP_CONFIG_DIR: config, MEP_PONYTAIL: '1', ...opts.env },
  })
  return { code: r.status, out: r.stdout, err: r.stderr }
}

const hook = (name: string, input: Record<string, unknown> = {}, env?: Record<string, string>) => {
  const out = mep(['hook', name], { input: JSON.stringify({ cwd: root, ...input }), env }).out
  return out ? JSON.parse(out) : {}
}

const profileFile = () => parse(readFileSync(join(root, '.mep/profile.yaml'), 'utf8'))

before(() => {
  cpSync(join(REPO, 'examples', 'estudio-saas'), root, { recursive: true })
  spawnSync('git', ['init', '-q'], { cwd: root })
  writeFileSync(join(config, 'rates.yaml'), 'currency: MXN\nhourly_rate: 600\npm_overhead: 0.1\nrisk_buffer: 0.2\nrounding: 500\nmaintenance_plans:\n  basic: { price: 2500, hours: 2 }\n  standard: { price: 5000, hours: 5 }\n  premium: { price: 9000, hours: 10 }\n')
})

describe('test project: Estudio (SaaS, auth + payments, MX + USA:CA + EU:DE)', () => {
  test('1. /mep:audit infers the profile from the code without writing anything', () => {
    const r = mep(['audit', '--json'])
    const { profile, evidence } = JSON.parse(r.out)
    assert.equal(profile.type, 'saas')
    for (const c of ['auth', 'payments', 'subscriptions', 'email']) assert.ok(profile.capabilities.includes(c), c)
    assert.equal(evidence['capabilities.payments'], 'lib/billing.ts')
    assert.equal(existsSync(join(root, '.mep')), false)
  })

  test('2. /mep:scope: profile, brief, ADRs, CLAUDE.md, CI and the first quote', () => {
    const r = mep(['init', '--from', 'scope.yaml'])
    assert.equal(r.code, 0, r.err)
    assert.match(r.out, /Cotización: .* MXN/)
    const brief = readFileSync(join(root, 'BRIEF.md'), 'utf8')
    for (const id of ['rls-all-tables', 'hosted-checkout', 'mx-privacy-notice', 'gpc-signal', 'eu-de-impressum', 'eu-withdrawal-right', 'i18n-hreflang']) {
      assert.match(brief, new RegExp('`' + id + '`'), id)
    }
    assert.match(readFileSync(join(root, 'CLAUDE.md'), 'utf8'), /Mantra de código/)
    assert.ok(existsSync(join(root, '.github/workflows/mep.yml')))
    assert.equal(profileFile().phase.active, 'foundation.setup')
    assert.equal(mep(['registry']).code, 0)
    assert.equal(mep(['codemap']).code, 0)
  })

  test('3. nothing blocks Stop while foundation.setup is the active sub-phase', () => {
    const out = hook('stop')
    // Nothing blocks, so the chat hears nothing: pending items live in the status line and the panel.
    assert.equal(out.decision, undefined)
    assert.equal(out.systemMessage, undefined)
  })

  test('4. closing foundation.setup needs the mep-security audit and the manual confirmations', () => {
    const fail = mep(['phase', 'close', 'foundation.setup'])
    assert.equal(fail.code, 1)
    assert.match(fail.out, /sin auditoría de mep-security/)
    assert.match(fail.out, /git-protected-main/)

    // The person confirms what only they can know; mep-security audits each security item.
    assert.equal(mep(['confirm', 'git-protected-main']).code, 3)
    assert.equal(mep(['confirm', 'git-protected-main', '--human']).code, 0)
    // pnpm audit needs the network: the test turns it off the way a person would, with a reason.
    assert.equal(mep(['override', 'no-critical-vulnerabilities', 'el e2e corre sin red; el CI del proyecto lo cubre', '--yes', '--human']).code, 0)
    assert.equal(mep(['override', 'walking-skeleton', 'el e2e corre sin sitio desplegado', '--yes', '--human']).code, 0)
    const security = JSON.parse(mep(['check', '--json', '--fast']).out).results.filter(
      (r: { phase: string; level: string; state: string; id: string }) => r.phase === 'foundation.setup' && r.level === 'required' && r.state === 'active',
    )
    const audited = ['dependency-scan-ci', 'env-gitignored', 'lockfile-committed', 'no-secrets-in-repo', 'public-env-prefix', 'secrets-scan-ci']
    for (const id of audited) {
      assert.ok(security.some((r: { id: string }) => r.id === id), id)
      const files = { 'dependency-scan-ci': '.github/workflows/ci.yml', 'env-gitignored': '.gitignore,.env.example', 'lockfile-committed': 'pnpm-lock.yaml', 'no-secrets-in-repo': '.env.example,lib/auth.ts,lib/billing.ts', 'public-env-prefix': '.env.example', 'secrets-scan-ci': '.github/workflows/ci.yml,.husky/pre-commit' }[id]!
      assert.equal(mep(['security', 'record', '--id', id, '--result', 'pass', '--files', files, '--notes', 'revisado en el e2e']).code, 0, id)
    }
    // Ponytail is installed: the close needs /ponytail-review recorded, without "must fix", on the current code.
    assert.match(mep(['phase', 'close', 'foundation.setup']).out, /corre \/ponytail-review/)
    assert.equal(mep(['review', 'record', '--tool', 'mep', '--must-fix', '0']).code, 1)
    mep(['review', 'record', '--must-fix', '2', '--notes', 'duplicado en lib/billing.ts'])
    assert.match(mep(['phase', 'close', 'foundation.setup']).out, /2 "must fix" pendiente/)
    mep(['review', 'record', '--must-fix', '0'])
    writeFileSync(join(root, 'lib/extra.ts'), 'export const x = 1\n')
    assert.match(mep(['phase', 'close', 'foundation.setup']).out, /revisión vencida/)
    rmSync(join(root, 'lib/extra.ts'))
    assert.match(mep(['review']).out, /✅ foundation\.setup — revisado con ponytail/)
    const ok = mep(['phase', 'close', 'foundation.setup'])
    assert.equal(ok.code, 0, ok.out + ok.err)
    assert.equal(profileFile().phase.active, 'foundation.design')
    assert.deepEqual(profileFile().phase.closed, ['foundation.setup'])
  })

  test('5. a regression in a closed sub-phase blocks Stop; MEP_BYPASS lets it through and is logged', () => {
    const readme = readFileSync(join(root, 'README.md'), 'utf8')
    writeFileSync(join(root, 'README.md'), readme.replace('## Instalación', '## Notas'))
    const blocked = hook('stop')
    assert.equal(blocked.decision, 'block')
    assert.match(blocked.reason, /readme/)
    assert.equal(hook('stop', {}, { MEP_BYPASS: '1' }).decision, undefined)
    assert.match(readFileSync(join(root, '.mep/log'), 'utf8'), /bypass stop: readme/)
    writeFileSync(join(root, 'README.md'), readme)
    assert.equal(hook('stop').decision, undefined)
  })

  test('6. a secret in the code blocks at any time, even with MEP_BYPASS', () => {
    writeFileSync(join(root, 'lib/config.ts'), `export const key = "sk_live_${'a'.repeat(24)}"\n`)
    const out = hook('stop', {}, { MEP_BYPASS: '1' })
    assert.equal(out.decision, 'block')
    assert.match(out.reason, /no-secrets-in-repo/)
    assert.match(out.reason, /lib\/config\.ts:1/)
    rmSync(join(root, 'lib/config.ts'))
  })

  test('7. editing a sensitive file asks for a mep-security audit', () => {
    const out = hook('post-edit', { tool_input: { file_path: join(root, 'supabase/migrations/0002_bookings.sql') } })
    assert.match(out.hookSpecificOutput.additionalContext, /mep-security/)
  })

  test('8. production deploys are denied while any 🔴 is pending; CI fails the same way', () => {
    const deny = hook('pre-bash', { tool_input: { command: 'vercel deploy --prod' } })
    assert.equal(deny.hookSpecificOutput.permissionDecision, 'deny')
    assert.match(deny.hookSpecificOutput.permissionDecisionReason, /bloquea el deploy a producción/)
    assert.equal(mep(['verify', '--prod', '--no-cache']).code, 1)
    assert.equal(mep(['verify', '--no-cache']).code, 0)
  })

  test('9. /mep:add shows only the diff and its impact; applying it saves a new internal quote outside the repo', () => {
    writeFileSync(join(root, '.mep/change.yaml'), 'capabilities: [auth, payments, subscriptions, email, uploads]\n')
    const diff = mep(['add', '--from', '.mep/change.yaml'])
    assert.match(diff.out, /＋ nuevo {2}upload-validation/)
    assert.match(diff.out, /Impacto: \+[\d.]+ a \+[\d.]+ h · \+[\d,]+ a \+[\d,]+ MXN/)
    assert.doesNotMatch(diff.out, /meta-charset/)
    assert.equal(mep(['add', '--from', '.mep/change.yaml', '--apply']).code, 0)
    assert.ok(profileFile().capabilities.includes('uploads'))
    assert.ok(existsSync(join(config, 'quotes', 'estudio')))
    assert.equal(existsSync(join(root, '.mep', 'quotes')), false)
  })

  test('10. the client quote hides rate, margins and buffer', () => {
    const client = mep(['quote', '--client']).out
    assert.match(client, /Total: [\d,]+–[\d,]+ MXN/)
    assert.match(client, /Planes de mantenimiento/)
    assert.doesNotMatch(client, /600|Gestión|Colchón/)
    assert.match(mep(['quote']).out, /Agenda de clases por instructor \(estimación a revisar\)|custom:Agenda de clases por instructor/)
  })

  test('11. /mep:export: versioned client brief as .docx and .pdf', () => {
    const data = JSON.parse(mep(['export-data', '--lang', 'es']).out)
    assert.equal(data.version, 1)
    assert.ok(data.quote.total[0] > 0)
    const md = [
      `# Brief del proyecto — ${data.project}`,
      `**Versión ${data.version}** · ${data.date}`,
      '## 2. Alcance incluido',
      ...data.included.capabilities.map((c: string) => `- ${c}`),
      '## 3. Fuera de alcance',
      ...data.out_of_scope.capabilities_not_included.slice(0, 5).map((c: string) => `- ${c}`),
      '## 7. Cotización',
      '| Fase | Precio |',
      '| --- | --- |',
      ...Object.entries(data.quote.by_phase).map(([k, v]) => `| ${k} | ${(v as number[]).join('–')} ${data.quote.currency} |`),
      `> ${data.legal_note}`,
    ].join('\n\n')
    writeFileSync(join(root, 'docs/client-brief-v1.md'), md)
    const r = mep(['export', '--in', 'docs/client-brief-v1.md', '--lang', 'es'])
    assert.equal(r.code, 0, r.err)
    assert.equal(readFileSync(join(root, 'docs/client-brief-v1.docx')).subarray(0, 2).toString(), 'PK')
    assert.equal(readFileSync(join(root, 'docs/client-brief-v1.pdf')).subarray(0, 5).toString(), '%PDF-')
    assert.equal(JSON.parse(mep(['export-data']).out).version, 2)
  })

  test('12. /mep:update brings the new catalog items, with grace in closed sub-phases', () => {
    const file = join(root, '.mep/profile.yaml')
    writeFileSync(file, readFileSync(file, 'utf8').replace(/catalog_version: .*/, 'catalog_version: 2026.10.1'))
    seal(root)
    const list = mep(['update'])
    const version = readFileSync(join(REPO, 'catalog', 'VERSION'), 'utf8').trim()
    assert.ok(list.out.includes(`Catálogo 2026.10.1 → ${version}`), list.out.slice(0, 200))
    assert.match(list.out, /a11y-contrast/)
    const applied = mep(['update', '--apply'])
    assert.match(applied.out, /Periodo de gracia .*code-maps/)
    assert.equal(profileFile().catalog_version, version)
  })

  test('13. the log has every override, bypass and phase change', () => {
    const log = readFileSync(join(root, '.mep/log'), 'utf8')
    for (const e of ['init', 'override no-critical-vulnerabilities', 'review foundation.setup ponytail', 'phase-close foundation.setup', 'bypass stop', 'add ', 'update ']) assert.match(log, new RegExp(e))
  })
})
