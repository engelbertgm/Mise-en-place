// 0.2.0: each way around mep's blocks found in 0.1.6, closed and tested so it cannot reopen.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { deployKind, mayDeploy } from '../engine/src/deploy.ts'
import { guardCommand, guardFile } from '../engine/src/guard.ts'
import { checkSeal, stateChanges } from '../engine/src/seal.ts'
import { CLI, makeRepo, tempDir } from './helpers.ts'

const CONFIG = tempDir('mep-config-')

function mep(root: string, args: string[], { input, env = {} }: { input?: string; env?: Record<string, string> } = {}) {
  const r = spawnSync('node', [CLI, ...args], { cwd: root, input, encoding: 'utf8', env: { ...process.env, MEP_BYPASS: '', MEP_CONFIG_DIR: CONFIG, ...env } })
  return { code: r.status, out: r.stdout, err: r.stderr }
}

function initialized(files: Record<string, string> = {}): string {
  const root = makeRepo({ 'p.yaml': 'project: x\ntype: saas\ncapabilities: [auth, payments]\n', ...files })
  assert.equal(mep(root, ['init', '--from', 'p.yaml']).code, 0)
  return root
}

describe('1. state changes only through the CLI', () => {
  test('file tools on state files are denied; generated files are not state', () => {
    for (const p of ['.mep/profile.yaml', '/repo/.mep/log', 'C:\\repo\\.mep\\security\\rls-all-tables.json', '.mep/reviews/pr.json']) assert.ok(guardFile(p), p)
    for (const p of ['BRIEF.md', '.mep/.cache/gate-stop.json', 'src/mep/profile.yaml', 'app/.mepx/log']) assert.equal(guardFile(p), undefined, p)
  })

  test('shell writes into .mep are denied; reads and lone engine calls are not', () => {
    for (const c of [
      "sed -i 's/closed: \\[\\]/closed: [x]/' .mep/profile.yaml",
      'echo "x" >> .mep/log',
      'rm -rf .mep',
      'cp /tmp/p.yaml .mep/profile.yaml',
      'git checkout -- .mep/profile.yaml',
      'node -e "require(\'fs\').writeFileSync(\'.mep/profile.yaml\', \'\')"',
      'node engine/dist/mep.mjs check > .mep/log',
    ]) assert.ok(guardCommand(c), c)
    for (const c of ['cat .mep/log', 'git add .mep && git commit -m x', 'ls .mep 2>/dev/null', 'node "/p/engine/dist/mep.mjs" phase close foundation.setup', 'pnpm build > out.txt']) {
      assert.equal(guardCommand(c), undefined, c)
    }
  })

  test('the classic hooks deny the same', () => {
    const root = initialized()
    const pre = (event: string, tool_input: object) => mep(root, ['hook', event], { input: JSON.stringify({ cwd: root, tool_input }) }).out
    assert.match(pre('pre-edit', { file_path: join(root, '.mep/profile.yaml') }), /"deny"/)
    assert.equal(pre('pre-edit', { file_path: join(root, 'src/app.ts') }), '')
    assert.match(pre('pre-bash', { command: 'echo x >> .mep/log' }), /"deny"/)
  })

  test('an edit outside the CLI breaks the seal: verify blocks, MEP_BYPASS does not help, no writer seals over it', () => {
    const root = initialized()
    assert.equal(checkSeal(root).ok, true)
    const file = join(root, '.mep/profile.yaml')
    writeFileSync(file, readFileSync(file, 'utf8').replace('closed: []', 'closed: [foundation.setup]'))
    assert.equal(checkSeal(root).ok, false)
    const verify = mep(root, ['verify', '--no-cache'])
    assert.equal(verify.code, 1)
    assert.match(verify.out, /fuera de la CLI/)
    assert.equal(mep(root, ['verify', '--no-cache'], { env: { MEP_BYPASS: '1' } }).code, 1)
    // A legitimate command refuses to seal someone else's edit.
    const skip = mep(root, ['skip', 'csp-strict', 'MVP'])
    assert.equal(skip.code, 1)
    assert.match(skip.err, /fuera de la CLI.*\/mep:resync/)
    // Only the person re-seals.
    assert.equal(mep(root, ['resync']).code, 3)
    assert.equal(mep(root, ['resync', '--human']).code, 0)
    assert.equal(checkSeal(root).ok, true)
    assert.match(readFileSync(join(root, '.mep/log'), 'utf8'), / resync /)
  })

  test('appending a forged line to the log breaks the seal too', () => {
    const root = initialized()
    appendFileSync(join(root, '.mep/log'), '2026-10-25T00:00:00.000Z override readme "x"\n')
    assert.equal(checkSeal(root).ok, false)
  })

  test('a 0.1.x repo without a seal is sealed once, and the event is logged', () => {
    const root = initialized()
    const log = join(root, '.mep/log')
    writeFileSync(log, readFileSync(log, 'utf8').split('\n').filter(l => !/ state [0-9a-f]{64}$/.test(l)).join('\n'))
    assert.equal(checkSeal(root).ok, true)
    assert.match(readFileSync(log, 'utf8'), /seal-initial/)
  })
})

describe('2. actions only the person takes', () => {
  test('the agent cannot run them from Bash, nor pass the human flag or MEP_BYPASS', () => {
    for (const c of [
      'node "/p/engine/dist/mep.mjs" confirm git-protected-main',
      'node /p/engine/dist/mep.mjs override readme "x" --yes',
      'npx mep resync',
      'node /p/engine/dist/mep.mjs threshold complexity 15 legado --yes',
      'node /p/engine/dist/mep.mjs skip csp-strict x --human',
      'MEP_BYPASS=1 vercel --prod',
    ]) assert.ok(guardCommand(c), c)
    // Tightening a threshold, and commit messages that mention a command, are fine.
    assert.equal(guardCommand('node /p/engine/dist/mep.mjs threshold complexity 8'), undefined)
    assert.equal(guardCommand('git commit -m "docs: explain mep confirm"'), undefined)
  })

  test('confirm takes who from git, never from an argument, and is logged', () => {
    const root = initialized()
    spawnSync('git', ['init', '-q'], { cwd: root })
    spawnSync('git', ['config', 'user.name', 'Persona Real'], { cwd: root })
    assert.equal(mep(root, ['confirm', 'git-protected-main', '--by', 'Otro']).code, 3)
    assert.equal(mep(root, ['confirm', 'git-protected-main', '--by', 'Otro', '--human']).code, 0)
    const profile = readFileSync(join(root, '.mep/profile.yaml'), 'utf8')
    assert.match(profile, /by: Persona Real/)
    assert.doesNotMatch(profile, /Otro/)
    assert.match(readFileSync(join(root, '.mep/log'), 'utf8'), / confirm git-protected-main Persona Real/)
  })
})

describe('3. a security report always covers its sensitive files', () => {
  test('--files can add files, never leave out the item group', () => {
    const root = initialized({ 'lib/auth.ts': 'export const hash = 1\n', 'README.md': '# x\n' })
    const r = mep(root, ['security', 'record', '--id', 'password-hashing', '--result', 'pass', '--files', 'README.md'])
    assert.equal(r.code, 0, r.err)
    const report = JSON.parse(readFileSync(join(root, '.mep/security/password-hashing.json'), 'utf8'))
    assert.deepEqual(report.files, ['README.md', 'lib/auth.ts'])
    // Touching the auth file expires the report, even though the caller named only the README.
    writeFileSync(join(root, 'lib/auth.ts'), 'export const hash = 2\n')
    assert.match(mep(root, ['security']).out, /❌ password-hashing — auditoría vencida/)
  })
})

describe('4. more deploy platforms', () => {
  test('production, preview, and what is not a deploy', () => {
    const cases: [string, string | undefined][] = [
      ['wrangler deploy', 'prod'],
      ['npx wrangler pages deploy dist', 'prod'],
      ['wrangler pages deploy dist --branch main', 'prod'],
      ['wrangler pages deploy dist --branch feature-x', 'preview'],
      ['wrangler versions upload', 'preview'],
      ['wrangler dev', undefined],
      ['fly deploy', 'prod'],
      ['flyctl deploy --remote-only', 'prod'],
      ['fly logs', undefined],
      ['railway up', 'prod'],
      ['railway logs', undefined],
      ['firebase deploy --only hosting', 'prod'],
      ['firebase hosting:channel:deploy pr-12', 'preview'],
      ['firebase emulators:start', undefined],
      ['supabase db push', 'prod'],
      ['supabase functions deploy hello', 'prod'],
      ['supabase start', undefined],
      ['supabase db reset', undefined],
      ['vercel env pull', undefined],
    ]
    for (const [cmd, kind] of cases) {
      assert.equal(deployKind(cmd, 'feature'), kind, cmd)
      if (kind) assert.equal(mayDeploy(cmd), true, cmd)
    }
  })
})

describe('5. every state change shows in the PR summary', () => {
  test('changes since the base branch, without seal lines', () => {
    const root = initialized()
    const git = (...args: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root })
    git('init', '-q', '-b', 'main')
    git('add', '.')
    git('commit', '-q', '-m', 'base')
    assert.match(stateChanges(root, 'main'), /sin cambios de estado/)
    assert.equal(mep(root, ['override', 'readme', 'el cliente no lo quiere', '--yes', '--human']).code, 0)
    const summary = stateChanges(root, 'main')
    assert.match(summary, /1 cambio\(s\) de estado/)
    assert.match(summary, /\| override \| readme "el cliente no lo quiere" \|/)
    assert.doesNotMatch(summary, /\| state \|/)
    assert.match(mep(root, ['changes', '--base', 'main']).out, /override/)
  })
})
