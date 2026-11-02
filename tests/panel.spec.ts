// 0.2.0: the chat only hears from mep when something blocks; the panel gets everything else.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, test } from 'node:test'
import { CLI, makeRepo, tempDir } from './helpers.ts'

const CONFIG = tempDir('mep-config-')

function mep(root: string, args: string[], input?: string) {
  const r = spawnSync('node', [CLI, ...args], { cwd: root, input, encoding: 'utf8', env: { ...process.env, MEP_BYPASS: '', MEP_CONFIG_DIR: CONFIG } })
  return { code: r.status, out: r.stdout, err: r.stderr }
}

describe('quiet chat, full panel', () => {
  test('Stop says nothing while the active sub-phase has pending items that do not block', () => {
    const root = makeRepo({ 'p.yaml': 'project: x\ntype: landing\n' })
    assert.equal(mep(root, ['init', '--from', 'p.yaml']).code, 0)
    assert.equal(mep(root, ['hook', 'stop'], JSON.stringify({ cwd: root })).out, '')
  })

  test('check --json --detail carries what each item asks, why, and every finding', () => {
    const files: Record<string, string> = { 'p.yaml': 'project: x\ntype: saas\ncapabilities: [auth]\n' }
    for (let i = 0; i < 8; i++) files[`src/f${i}.ts`] = 'console.log("x")\n'
    const root = makeRepo(files)
    assert.equal(mep(root, ['init', '--from', 'p.yaml']).code, 0)
    const data = JSON.parse(mep(root, ['check', '--json', '--detail', '--fast']).out)
    assert.equal(data.active, 'foundation.setup')
    assert.ok(Array.isArray(data.phases) && data.phases.length > 1)
    const item = data.items.find((i: { id: string }) => i.id === 'no-debug-leftovers')
    assert.ok(item.why && item.how && item.title)
    assert.equal(item.status, 'fail')
    // The detail names five; the panel gets all eight.
    assert.equal(item.all.length, 8)
    assert.equal(data.items.find((i: { id: string }) => i.id === 'git-protected-main')?.manual, true)
  })
})
