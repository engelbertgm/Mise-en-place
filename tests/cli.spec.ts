import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { parse } from 'yaml'
import { CLI, makeRepo, tempDir } from './helpers.ts'

const CONFIG = tempDir('mep-config-')

function mep(root: string, args: string[], input?: string) {
  const r = spawnSync('node', [CLI, ...args], { cwd: root, input, encoding: 'utf8', env: { ...process.env, MEP_BYPASS: '', MEP_CONFIG_DIR: CONFIG } })
  return { code: r.status, out: r.stdout, err: r.stderr }
}

const PROFILE = `project: Estudio
type: saas
capabilities: [auth, payments, subscriptions, email]
markets: [MX, USA:CA, EU:DE]
audience: [b2c]
context: client-project
signals: { db_client_access: true }
counts: { pages: 12, entities: 6, languages: 2, integrations: 3 }
`

function initialized(): string {
  const root = makeRepo({ 'CLAUDE.md': '# Notas previas\n' })
  writeFileSync(join(root, 'draft.yaml'), PROFILE)
  const r = mep(root, ['init', '--from', 'draft.yaml'])
  assert.equal(r.code, 0, r.err)
  return root
}

describe('init', () => {
  test('writes profile, brief, ADRs, CLAUDE.md (keeping what was there) and CI', () => {
    const root = initialized()
    const profile = parse(readFileSync(join(root, '.mep/profile.yaml'), 'utf8'))
    assert.equal(profile.catalog_version, readFileSync(join(import.meta.dirname, '../catalog/VERSION'), 'utf8').trim())
    assert.ok(profile.capabilities.includes('i18n'))
    const brief = readFileSync(join(root, 'BRIEF.md'), 'utf8')
    assert.match(brief, /No editar a mano/)
    assert.match(brief, /#### 🔴 Obligatorios/)
    assert.match(brief, /no sustituye asesoría legal/)
    const claude = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
    assert.match(claude, /^# Notas previas/)
    assert.match(claude, /Este proyecto se rige por BRIEF\.md/)
    assert.ok(readdirSync(join(root, 'docs/decisions')).some(f => f.includes('stack-framework-default')))
    assert.ok(existsSync(join(root, '.github/workflows/mep.yml')))
    assert.equal(mep(root, ['init', '--from', 'draft.yaml']).code, 1)
  })

  test('rejects values outside dimensions.yaml', () => {
    const root = makeRepo({ 'p.yaml': 'type: spaceship\n' })
    const r = mep(root, ['init', '--from', 'p.yaml'])
    assert.equal(r.code, 1)
    assert.match(r.err, /type "spaceship" is not valid/)
  })
})

describe('skip / override', () => {
  test('skip accepts only recommended items', () => {
    const root = initialized()
    assert.match(mep(root, ['skip', 'meta-charset', 'no']).err, /solo acepta 🟡.*override/)
    const ok = mep(root, ['skip', 'csp-strict', 'MVP; se agrega post-lanzamiento'])
    assert.equal(ok.code, 0)
    assert.match(readFileSync(join(root, 'BRIEF.md'), 'utf8'), /`csp-strict` — MVP/)
  })

  test('override rejects locked items and needs explicit confirmation', () => {
    const root = initialized()
    assert.match(mep(root, ['override', 'rls-all-tables', 'x', '--yes']).err, /locked/)
    assert.equal(mep(root, ['override', 'readme', 'el cliente no lo quiere']).code, 2)
    assert.equal(mep(root, ['override', 'readme', 'el cliente no lo quiere', '--yes']).code, 0)
    assert.match(readFileSync(join(root, 'BRIEF.md'), 'utf8'), /⚠️ `readme`/)
    assert.match(readFileSync(join(root, '.mep/log'), 'utf8'), /override readme/)
  })
})

describe('add', () => {
  test('shows only the diff and applies it on request', () => {
    const root = initialized()
    writeFileSync(join(root, 'change.yaml'), 'capabilities: [auth, payments, subscriptions, email, uploads]\n')
    const r = mep(root, ['add', '--from', 'change.yaml'])
    assert.match(r.out, /＋ nuevo {2}upload-validation/)
    assert.doesNotMatch(r.out, /meta-charset/)
    assert.doesNotMatch(readFileSync(join(root, '.mep/profile.yaml'), 'utf8'), /uploads/)
    mep(root, ['add', '--from', 'change.yaml', '--apply'])
    assert.match(readFileSync(join(root, '.mep/profile.yaml'), 'utf8'), /uploads/)
  })
})

describe('check / verify / phase', () => {
  test('check groups by sub-phase and warns about signals the profile lacks', () => {
    const root = initialized()
    writeFileSync(join(root, 'video.html'), '<iframe src="https://youtube.com/embed/x"></iframe>')
    const r = mep(root, ['check', '--fast'])
    assert.match(r.out, /foundation\.setup {2}🔴 \d+\/\d+ ← activa/)
    assert.match(r.out, /has_embeds \(video\.html\)/)
  })

  test('verify --prod exits 1 with pending required items', () => {
    const root = initialized()
    const r = mep(root, ['verify', '--prod', '--no-cache'])
    assert.equal(r.code, 1)
    assert.match(r.out, /bloquea el deploy a producción/)
  })

  test('phase shows what is missing to close the active sub-phase', () => {
    const root = initialized()
    assert.match(mep(root, ['phase']).out, /Sub-etapa activa: foundation\.setup[\s\S]*Para cerrarla faltan/)
    assert.equal(mep(root, ['phase', 'close', 'foundation.setup']).code, 1)
  })
})

describe('security record', () => {
  test('only for security items, only for files that exist', () => {
    const root = initialized()
    assert.match(mep(root, ['security', 'record', '--id', 'readme', '--result', 'pass']).err, /no es un ítem de seguridad/)
    assert.match(mep(root, ['security', 'record', '--id', 'csrf-protection', '--result', 'pass', '--files', 'nope.ts']).err, /inexistentes/)
    writeFileSync(join(root, 'actions.ts'), 'export {}')
    assert.equal(mep(root, ['security', 'record', '--id', 'csrf-protection', '--result', 'pass', '--files', 'actions.ts', '--notes', 'server actions']).code, 0)
    assert.match(mep(root, ['security']).out, /✅ csrf-protection/)
  })
})

describe('classic hooks', () => {
  test('never act in a repo without .mep/', () => {
    const root = makeRepo()
    for (const h of ['session-start', 'stop', 'pre-bash', 'post-edit']) {
      const r = mep(root, ['hook', h], JSON.stringify({ cwd: root, tool_input: { command: 'vercel --prod', file_path: join(root, 'middleware.ts') } }))
      assert.equal(r.code, 0)
      assert.equal(r.out, '', h)
    }
  })

  test('session-start shows the active sub-phase and its pending items', () => {
    const root = initialized()
    const out = JSON.parse(mep(root, ['hook', 'session-start'], JSON.stringify({ cwd: root })).out)
    assert.match(out.hookSpecificOutput.additionalContext, /sub-etapa activa: foundation\.setup/)
  })

  test('stop does not block on the active sub-phase; it blocks on a regression in a closed one', () => {
    const root = initialized()
    assert.doesNotMatch(mep(root, ['hook', 'stop'], JSON.stringify({ cwd: root })).out, /"decision"/)
    const file = join(root, '.mep/profile.yaml')
    writeFileSync(file, readFileSync(file, 'utf8').replace('closed: []', 'closed: [foundation.setup]'))
    const out = JSON.parse(mep(root, ['hook', 'stop'], JSON.stringify({ cwd: root })).out)
    assert.equal(out.decision, 'block')
    assert.match(out.reason, /mep bloquea cerrar el trabajo: \d+ 🔴/)
    const again = JSON.parse(mep(root, ['hook', 'stop'], JSON.stringify({ cwd: root, stop_hook_active: true })).out)
    assert.equal(again.decision, undefined)
  })

  test('pre-bash denies a production deploy with pending required items, ignores other commands', () => {
    const root = initialized()
    const deny = JSON.parse(mep(root, ['hook', 'pre-bash'], JSON.stringify({ cwd: root, tool_input: { command: 'vercel deploy --prod' } })).out)
    assert.equal(deny.hookSpecificOutput.permissionDecision, 'deny')
    assert.equal(mep(root, ['hook', 'pre-bash'], JSON.stringify({ cwd: root, tool_input: { command: 'pnpm test' } })).out, '')
  })

  test('post-edit asks for a mep-security audit on sensitive files only', () => {
    const root = initialized()
    const sensitive = JSON.parse(mep(root, ['hook', 'post-edit'], JSON.stringify({ cwd: root, tool_input: { file_path: join(root, 'supabase/migrations/001.sql') } })).out)
    assert.match(sensitive.hookSpecificOutput.additionalContext, /mep-security/)
    assert.equal(mep(root, ['hook', 'post-edit'], JSON.stringify({ cwd: root, tool_input: { file_path: join(root, 'src/button.tsx') } })).out, '')
  })
})
