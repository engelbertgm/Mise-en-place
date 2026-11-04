// The panel's flow line lists every /mep: command, so nobody has to remember one.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO } from './helpers.ts'

test('every skill of the plugin has a command in the flow line (the guide skill `mep` is not a command)', () => {
  const source = readFileSync(join(REPO, 'mods', 'register.tsx'), 'utf8')
  const flow = source.slice(source.indexOf('const FLOW = ['), source.indexOf('] as const', source.indexOf('const FLOW = [')))
  const listed = new Set([...flow.matchAll(/'\/mep:([a-z-]+)/g)].map(m => m[1]))
  const skills = readdirSync(join(REPO, 'skills')).filter(name => name !== 'mep')
  const missing = skills.filter(name => !listed.has(name))
  assert.deepEqual(missing, [], `faltan en el flujo del panel: ${missing.join(', ')}`)
})

test('what a click writes is the command the label shows, without its <placeholders>', () => {
  const source = readFileSync(join(REPO, 'mods', 'register.tsx'), 'utf8')
  const flow = source.slice(source.indexOf('const FLOW = ['), source.indexOf('] as const', source.indexOf('const FLOW = [')))
  const pairs = [...flow.matchAll(/\['(\/mep:[^']+)', '(\/mep:[^']+)'/g)]
  assert.ok(pairs.length >= 20)
  for (const [, label, fill] of pairs) {
    assert.equal(label!.replace(/ ?<[^>]+>/g, '').trim(), fill!.trim(), label)
  }
})
