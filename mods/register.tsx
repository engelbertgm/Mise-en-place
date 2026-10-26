// mep mods: gate, guard, instant commands, status line and panel, in one module (the engine follows `$`
// only within a file). They never verify anything themselves: they call the engine.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import { deployKind, mayDeploy, prToMain } from '../engine/src/deploy.ts'
import { guardCommand, guardFile } from '../engine/src/guard.ts'
import { findSecret, LOCAL_SECRET_FILE } from '../engine/src/secrets.ts'
import type { Panel, PanelItem } from '../types'

const PANE = 'mep'
// Change a tag when its value's fields change: it declines what an earlier version stored.
const panel = atom({ plugin: 'mep', key: 'panel' } as const, null, { shape: 'panel-1' })
const selected = atom({ plugin: 'mep', key: 'selected' } as const, null, { shape: 'selected-1' })
const expanded = atom({ plugin: 'mep', key: 'expanded' } as const, [], { shape: 'expanded-1' })
const pending = atom({ plugin: 'mep', key: 'pending' } as const, null, { shape: 'pending-1' })
const flash = atom({ plugin: 'mep', key: 'flash' } as const, '', { shape: 'flash-1' })
const tools = atom({ plugin: 'mep', key: 'tools' } as const, false, { shape: 'tools-1' })

/** The panel's tools: each runs the slash command as if typed. The human-only ones stay out (the engine refuses a plugin's). */
const INSTANT = [
  ['mep:check', 'Estado del checklist'],
  ['mep:phase', 'Sub-etapa activa'],
  ['mep:quote', 'Cotización interna'],
] as const
const WITH_TURN = [
  ['mep:audit', 'Auditar el repo contra su scope'],
  ['mep:update', 'Integrar ítems nuevos del catálogo'],
  ['mep:export', 'Exportar brief al cliente (.docx/.pdf)'],
  ['mep:phase', 'Cerrar la sub-etapa (auditoría + revisión)', 'close'],
] as const
const WITH_TEXT = [
  ['mep:scope', 'Scope, descripción:', 'crear'],
  ['mep:add', 'Agregar scope:', 'agregar'],
  ['mep:log-time', 'Horas, <id> <horas>:', 'registrar'],
] as const

const LEVEL = { required: '🔴', recommended: '🟡', optional: '⚪' } as const
const STATUS = { pass: '✅', fail: '❌', unknown: '❔' } as const

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

/**
 * One engine run per refresh feeds both the status line and the panel. The quick check (every turn) leaves
 * commands and build checks as ❔; "Verificar todo" in the panel runs them.
 */
async function refresh($: EngineInterface, full = false) {
  if (!(await hasProfile($))) return $.ui.status(undefined)
  const r = await runEngine($, ['check', '--json', '--detail', ...(full ? [] : ['--fast'])], full ? 600_000 : 60_000)
  if (r.exitCode !== 0) return
  const data: Panel = { ...(JSON.parse(r.stdout) as Omit<Panel, 'full'>), full }
  await update($, panel, () => data)
  $.ui.status(`mep · ${data.active} · 🔴 ${data.counts.required} · 🟡 ${data.counts.recommended}`)
}

/** A press in the panel is the person's: it reaches the engine through the human channel. */
async function act($: EngineInterface, args: string[]) {
  const r = await runEngine($, [...args, '--human'], 60_000)
  await update($, flash, () => (r.stdout || r.stderr).trim().split('\n')[0] ?? '')
  await update($, pending, () => null)
  await refresh($)
}

const isPending = (i: PanelItem) => i.state === 'active' && i.status !== 'pass' && i.level !== 'optional'

/** Turning off a 🔴 asks in a dialog of its own: it takes the keys, starts on Cancelar, and Esc cancels. */
const DIALOG = 'mep-override'

async function askOverride($: EngineInterface, id: string, reason: string) {
  await update($, pending, () => ({ id, reason }))
  await $.ui.open({ id: DIALOG, title: 'Desactivar un 🔴', focus: true, closeOnEscape: true, holdToasts: true, rows: 14 })
}

export const register: Register = on => {
  // ── gate: deploys wait for the engine's gate; mep's state and secrets stay out of the agent's reach ──
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

  // ── human actions: user-only skills (disable-model-invocation), answered here without a Claude turn, and
  // only when the engine stamps the person's own gesture. They pass the human channel the agent's Bash is denied. ──
  const HUMAN: Record<string, string> = { 'mep:confirm': 'confirm', 'mep:override': 'override', 'mep:threshold': 'threshold', 'mep:resync': 'resync' }
  for (const [command, engineCmd] of Object.entries(HUMAN)) {
    on('command.run', { command }, async ($, e, next) => {
      if (!(await hasProfile($))) return next(e)
      if (e.origin.kind !== 'composer' && e.origin.kind !== 'bridge') return { text: `mep: /${command} lo escribe el usuario, no el agente.` }
      const args = e.args.split(/\s+/).filter(Boolean)
      // Typing the command with its reason is the explicit confirmation.
      const yes = engineCmd === 'override' || engineCmd === 'threshold' ? ['--yes'] : []
      const r = await runEngine($, [engineCmd, ...args, ...yes, '--human'], 30_000)
      await refresh($).catch(() => undefined)
      return { text: (r.stdout || r.stderr).trim() }
    })
  }

  // ── commands: instant answers, no Claude turn. `/mep:phase close` goes on to the skill (audit + review). ──
  on('command.run', { command: 'mep:check' }, async ($, e, next) => {
    if (!(await hasProfile($))) return next(e)
    const r = await runEngine($, ['check', ...e.args.split(/\s+/).filter(Boolean)])
    return { text: (r.stdout || r.stderr).trim() }
  })

  on('command.run', { command: 'mep:phase' }, async ($, e, next) => {
    if (e.args.trim().startsWith('close') || !(await hasProfile($))) return next(e)
    const r = await runEngine($, ['phase'])
    return { text: (r.stdout || r.stderr).trim() }
  })

  // Manual quote: instant, but never automatic (the toggle lives in init and add --apply).
  on('command.run', { command: 'mep:quote' }, async ($, e, next) => {
    if (!(await hasProfile($))) return next(e)
    const r = await runEngine($, ['quote', ...e.args.split(/\s+/).filter(Boolean)])
    return { text: (r.stdout || r.stderr).trim() }
  })

  on('command.run', { command: 'mep:panel' }, async ($, e, next) => {
    if (!(await hasProfile($))) return next(e)
    await $.ui.open({ id: PANE, title: 'mep' })
    await refresh($).catch(() => undefined)
    return { text: 'Panel de mep abierto.' }
  })

  // ── status and panel: kept current every turn; the chat only hears from mep when something blocks ──
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    if (await hasProfile($)) {
      // Opened unasked it waits on a narrow terminal; /mep:panel opens it at any width.
      void $.ui.open({ id: PANE, title: 'mep' })
      await refresh($).catch(() => undefined)
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refresh($).catch(() => undefined)
    return result
  })

  on('ui.render', { component: 'Pane', requestId: DIALOG }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const ask = await read($, pending)
    const item = ask ? (await read($, panel))?.items.find(i => i.id === ask.id) : undefined
    if (!ask || !item) return <Text dimColor>Nada que confirmar.</Text>
    return (
      <Box flexDirection="column">
        <Text bold>¿Desactivar {item.id}?</Text>
        <Text>{item.title}</Text>
        <Text> </Text>
        <Text bold>Riesgo que aceptas</Text>
        <Text>{item.why}</Text>
        <Text bold>Tu razón</Text>
        <Text>{ask.reason}</Text>
        <Text dimColor>Queda en .mep/log, marcado ⚠️ en BRIEF.md y en el resumen del PR.</Text>
        <Text> </Text>
        <Box flexDirection="row" gap={2}>
          <Button key="cancel" role="dismiss" autoFocus onPress={() => $.ui.close({ id: DIALOG })}>
            Cancelar
          </Button>
          <Button
            key="override"
            variant="primary"
            onPress={async () => {
              await act($, ['override', item.id, ...ask.reason.split(/\s+/), '--yes'])
              await $.ui.close({ id: DIALOG })
            }}
          >
            Desactivar
          </Button>
        </Box>
      </Box>
    )
  })

  // Esc, Cancelar or the close mark: nothing is turned off.
  on('ui.close', async ($, e, next) => {
    if (e.id === DIALOG) await update($, pending, () => null)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const Input = 'Input' in els ? els.Input : undefined
    const data = await read($, panel)
    const message = await read($, flash)
    if (!data) return <Text dimColor>mep: verificando…</Text>
    const id = await read($, selected)
    const item = id ? data.items.find(i => i.id === id) : undefined

    if (await read($, tools)) {
      const run = async (command: string, args = '') => {
        await update($, flash, () => `/${command} ${args}`.trim() + ' en cola.')
        void $.command.run({ command, args }).catch(err => update($, flash, () => `/${command}: ${String(err)}`))
      }
      // The same checks the gate runs on a deploy or a PR into main, asked ahead; the whole answer shows.
      const ask = async (args: string[], clear: string) => {
        await update($, flash, () => 'verificando…')
        const r = await runEngine($, args)
        await update($, flash, () => r.stdout.trim() || (r.exitCode === 0 ? clear : r.stderr.trim()))
      }
      const recent = (await $.fs.read('.mep/log').catch(() => ''))
        .split('\n')
        .filter(l => l && l.split(' ')[1] !== 'state')
        .slice(-5)
        .map(l => `${l.slice(0, 10)} ${l.slice(l.indexOf(' ') + 1)}`)
      return (
        <Box flexDirection="column">
          <Button key="tools-back" plain onPress={() => update($, tools, () => false)}>
            ← Volver
          </Button>
          {message ? <Text dimColor>{message}</Text> : null}
          <Text bold>Antes de deployar o abrir PR</Text>
          <Button key="t-deploy" plain onPress={() => ask(['verify', '--prod'], '✅ Nada bloquea el deploy a producción.')}>
            {'  ¿Puedo deployar a producción?'}
          </Button>
          <Button key="t-pr" plain onPress={() => ask(['pr-gate'], '✅ Nada detiene el PR a main.')}>
            {'  ¿Puedo abrir PR a main?'}
          </Button>
          <Text bold>Al instante</Text>
          {INSTANT.map(([command, label]) => (
            <Button key={`t-${command}`} plain onPress={() => run(command)}>
              {`  ${label} `}
              <Text dimColor>{`/${command}`}</Text>
            </Button>
          ))}
          <Text bold>Con un turno de Claude</Text>
          {WITH_TURN.map(([command, label, args]) => (
            <Button key={`t-${command}${args ? `-${args}` : ''}`} plain onPress={() => run(command, args)}>
              {`  ${label} `}
              <Text dimColor>{`/${command}${args ? ` ${args}` : ''}`}</Text>
            </Button>
          ))}
          {Input &&
            WITH_TEXT.map(([command, label, submitLabel]) => (
              <Input key={`t-${command}`} label={label} submitLabel={submitLabel} onSubmit={v => (v.trim() ? run(command, v.trim()) : undefined)} />
            ))}
          <Text bold>Actividad reciente</Text>
          {recent.length ? recent.map(l => <Text dimColor>{`  ${l}`}</Text>) : <Text dimColor>  Sin eventos en .mep/log.</Text>}
        </Box>
      )
    }

    if (item) {
      const confirming = await read($, pending)
      const canConfirm = item.manual && item.category !== 'security' && isPending(item)
      return (
        <Box flexDirection="column">
          <Button key="back" plain onPress={() => update($, selected, () => null)}>
            ← Volver
          </Button>
          <Text bold>
            {LEVEL[item.level]} {item.id} {item.state === 'active' ? STATUS[item.status] : item.state === 'skipped' ? '⏭️' : '⚠️'}
          </Text>
          <Text dimColor>
            {item.phase}
            {item.locked ? ' · 🔒 locked' : ''}
          </Text>
          <Text>{item.title}</Text>
          {/* Actions sit above the long list, so they stay in the frame; the rest scrolls. */}
          {!e.props.isFocused && <Text dimColor>ctrl+x tab y flechas para desplazar.</Text>}
          {message ? <Text dimColor>{message}</Text> : null}
          {item.locked && <Text dimColor>🔒 No se puede desactivar.</Text>}
          {item.category === 'security' && isPending(item) && <Text dimColor>Lo da por cumplido una auditoría de mep-security.</Text>}
          {canConfirm && (
            <Button key="confirm" variant="primary" onPress={() => act($, ['confirm', item.id])}>
              Confirmar: lo verifiqué yo
            </Button>
          )}
          {Input && item.level === 'recommended' && item.state === 'active' && (
            <Input key={`skip-${item.id}`} label="Omitir, razón:" submitLabel="omitir" onSubmit={v => (v.trim() ? act($, ['skip', item.id, ...v.trim().split(/\s+/)]) : undefined)} />
          )}
          {Input && item.level === 'required' && item.state === 'active' && !item.locked && !confirming && (
            <Input key={`override-${item.id}`} label="Desactivar, razón:" submitLabel="siguiente" onSubmit={v => (v.trim() ? askOverride($, item.id, v.trim()) : undefined)} />
          )}
          {confirming && confirming.id === item.id && <Text dimColor>Confirma o cancela en el diálogo.</Text>}
          <Text> </Text>
          <Text bold>Por qué</Text>
          <Text>{item.why}</Text>
          <Text bold>Cómo</Text>
          <Text>{item.how}</Text>
          {item.detail ? <Text bold>{item.state === 'active' ? 'Qué falta' : 'Razón'}</Text> : null}
          {item.detail ? <Text>{item.detail}</Text> : null}
          {item.all.length > 0 && <Text dimColor>Todo lo que falla ({item.all.length}):</Text>}
          {item.all.map(f => (
            <Text>  · {f}</Text>
          ))}
        </Box>
      )
    }

    const open = await read($, expanded)
    const toggle = (phase: string) => update($, expanded, list => (list.includes(phase) ? list.filter(p => p !== phase) : [...list, phase]))
    // A count opens its first pending item; a zero count is not a button.
    const first = (level: 'required' | 'recommended') => data.items.find(i => i.level === level && isPending(i))
    const count = (level: 'required' | 'recommended') => {
      const label = `${LEVEL[level]} ${data.counts[level]}`
      const target = first(level)
      return target ? (
        <Button key={`first-${level}`} plain onPress={() => update($, selected, () => target.id)}>
          {label}
        </Button>
      ) : (
        <Text>{label}</Text>
      )
    }
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text bold>{`${data.active} · `}</Text>
          {count('required')}
          <Text>{' · '}</Text>
          {count('recommended')}
        </Box>
        <Button key="full" plain onPress={() => refresh($, true)}>
          {data.full ? '↻ Verificar todo' : '↻ Verificar todo (❔ = comando o build sin correr)'}
        </Button>
        <Button key="tools" plain onPress={() => update($, tools, () => true)}>
          ⚙ Herramientas
        </Button>
        {message ? <Text dimColor>{message}</Text> : null}
        {data.phases.map(phase => {
          const items = data.items.filter(i => i.phase === phase && isPending(i))
          const closed = data.closed.includes(phase)
          // Open by default: the active sub-phase and regressions in closed ones. Later ones fold to a count.
          const shown = phase === data.active || closed || open.includes(phase)
          const mark = closed ? '🔒' : phase === data.active ? '▶' : '·'
          if (!items.length) return closed || phase === data.active ? <Text dimColor>{`${mark} ${phase} ✅`}</Text> : null
          const req = items.filter(i => i.level === 'required').length
          return (
            <Box flexDirection="column">
              <Button key={`phase-${phase}`} plain onPress={() => toggle(phase)}>
                {`${mark} ${phase} `}
                <Text dimColor>{`🔴 ${req} · 🟡 ${items.length - req}`}</Text>
              </Button>
              {/* No hover card: an absolute card covers the rows under it and takes their pointer. */}
              {shown &&
                items.map(i => (
                  <Button key={i.id} plain onPress={() => update($, selected, () => i.id)}>
                    {`  ${LEVEL[i.level]} ${i.id} `}
                    <Text dimColor>{STATUS[i.status]}</Text>
                  </Button>
                ))}
            </Box>
          )
        })}
      </Box>
    )
  })
}
