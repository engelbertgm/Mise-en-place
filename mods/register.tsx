// mep mods: gate, guard, instant commands, status line and panel, in one module (the engine follows `$`
// only within a file). They never verify anything themselves: they call the engine.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import { deployKind, mayDeploy, prToMain } from '../engine/src/deploy.ts'
import { meter, progressColor } from '../engine/src/domains.ts'
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
// The flow view: which command to run, and when.
const flowOpen = atom({ plugin: 'mep', key: 'flow' } as const, false, { shape: 'flow-1' })
// How the list is grouped: by sub-phase (the order of the work) or by domain (the area).
const view = atom({ plugin: 'mep', key: 'view' } as const, 'fase', { shape: 'view-1' })
// Frame of the braille spinner while the engine works; -1 when idle.
const spinner = atom({ plugin: 'mep', key: 'spinner' } as const, -1, { shape: 'spinner-1' })

/** The panel's tools: each runs the slash command as if typed. The human-only ones stay out (the engine refuses a plugin's). */
const INSTANT = [
  ['mep:check', 'Checklist status'],
  ['mep:domains', 'Progress by domain'],
  ['mep:prelaunch', 'Security before going live (any time)'],
  ['mep:launch', 'Go live (runs the full gate)'],
  ['mep:phase', 'Active sub-phase'],
  ['mep:quote', 'Internal quote'],
] as const
const WITH_TURN = [
  ['mep:audit', 'Audit the repo against its scope'],
  ['mep:update', 'Bring in new catalog items'],
  ['mep:export', 'Export the client brief (.docx/.pdf)'],
  ['mep:phase', 'Close the sub-phase (audit + review)', 'close'],
] as const
const WITH_TEXT = [
  ['mep:scope', 'Scope, description:', 'create'],
  ['mep:add', 'Add scope:', 'add'],
  ['mep:log-time', 'Hours, <id> <hours>:', 'log'],
] as const

/**
 * The flow line: which command, and when. Each command is [what shows, what goes into the chat box, why]; a text that
 * ends in a space waits for the person to finish it. Nothing runs from here: the person presses Enter.
 */
const FLOW = [
  { id: 'scope', title: 'Define the scope', when: 'once, at the start', cmds: [
    ['/mep:scope <description>', '/mep:scope ', 'creates the profile, SCOPE.md and BRIEF.md'],
    ['/mep:audit', '/mep:audit', 'existing repo: scope vs code'],
  ] },
  { id: 'work', title: 'Work', when: 'all the time', cmds: [
    ['/mep:domains', '/mep:domains', 'progress by domain'],
    ['/mep:focus <domain>', '/mep:focus ', 'what is missing in one'],
    ['/mep:check', '/mep:check', 'status by sub-phase'],
    ['/mep:add <change>', '/mep:add ', 'the scope changed'],
    ['/mep:phase', '/mep:phase', 'active sub-phase and what is missing'],
    ['/mep:log-time <id> <hours>', '/mep:log-time ', 'real hours: they tune the quote'],
    ['/mep:panel', '/mep:panel', 'open this panel'],
  ] },
  { id: 'decide', title: 'Decisions only you make', when: 'when something does not apply or can wait', cmds: [
    ['/mep:defer <id> <reason>', '/mep:defer ', 'wait until go-live'],
    ['/mep:skip <id> <reason>', '/mep:skip ', 'skip a recommended item'],
    ['/mep:override <id> <reason>', '/mep:override ', 'turn off a required item'],
    ['/mep:domain off <path> <reason>', '/mep:domain off ', 'switch a domain off'],
    ['/mep:confirm <id>', '/mep:confirm ', 'I verified a manual item'],
    ['/mep:defer undo <id>', '/mep:defer undo ', 'bring back a deferred item'],
    ['/mep:domain on <path>', '/mep:domain on ', 'switch a domain on'],
    ['/mep:threshold <key> <value> <reason>', '/mep:threshold ', 'change a quality threshold'],
    ['/mep:resync', '/mep:resync', 're-seal if the state changed outside mep'],
  ] },
  { id: 'push', title: 'Push progress', when: 'whenever you want', note: 'git push or PR to main: nothing needs to be closed', cmds: [
    ['/mep:phase close <sub-phase>', '/mep:phase close ', 'optional: protect what is done'],
  ] },
  { id: 'prelaunch', title: 'Before going live', when: 'any time', cmds: [
    ['/mep:prelaunch', '/mep:prelaunch', 'security, line by line'],
    ['/mep:prelaunch --full', '/mep:prelaunch --full', 'with commands and build'],
  ] },
  { id: 'launch', title: 'Go live', when: 'when no required item is missing', cmds: [
    ['/mep:launch', '/mep:launch', 'the full gate, once'],
  ] },
  { id: 'live', title: 'Live', when: 'afterwards', note: 'every push to main is a deploy with the full gate', cmds: [
    ['/mep:update', '/mep:update', 'new catalog items'],
    ['/mep:export', '/mep:export', 'client brief'],
    ['/mep:quote', '/mep:quote', 'internal quote'],
  ] },
] as const

// Levels are circles in a theme color, so they follow light and dark themes: full red (required), full yellow
// (recommended), empty white (optional). Progress bars fill in braille, and their color moves from red to green.
const LEVEL_GLYPH = { required: '●', recommended: '●', optional: '○' } as const
const LEVEL_COLOR = { required: 'error', recommended: 'warning', optional: undefined } as const
// Outside the terminal (VS Code, desktop) the theme keys may not map to a color: raw colors always paint.
const LEVEL_HEX = { required: '#e5484d', recommended: '#f5a524', optional: undefined } as const
const LEVEL_RANK = { required: 0, recommended: 1, optional: 2 } as const
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

// While the engine works the spinner turns: one ticker for all overlapping jobs, cancelled with the last one.
let jobs = 0
let ticker: { cancel: () => void } | undefined
async function busy<T>($: EngineInterface, job: () => Promise<T>): Promise<T> {
  if (jobs++ === 0) {
    await update($, spinner, () => 0)
    ticker = $.clock.every(110, () => void update($, spinner, n => (n + 1) % SPINNER_FRAMES.length))
  }
  try {
    return await job()
  } finally {
    if (--jobs === 0) {
      ticker?.cancel()
      ticker = undefined
      await update($, spinner, () => -1)
    }
  }
}
// The log lines of the tools view, read only while idle: a turning spinner redraws the panel ten times a second.
let recentLog: string[] = []
/** Rows shown per sub-phase and lines of findings before a "more". */
const CAP = 8
const FINDINGS_CAP = 6

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
  return found ? `mep: ${path} would receive a secret (${found}). Secrets belong in a local .env and in the hosting's variable manager, never in versioned files.` : undefined
}

/**
 * One engine run per refresh feeds both the status line and the panel. The quick check (every turn) leaves
 * commands and build checks as ❔; "Verify all" in the panel runs them.
 */
const refresh = ($: EngineInterface, full = false) => busy($, () => check($, full))

async function check($: EngineInterface, full: boolean) {
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

/** Turning off a 🔴 asks in a dialog of its own: it takes the keys, starts on Cancel, and Esc cancels. */
const DIALOG = 'mep-override'

async function askOverride($: EngineInterface, id: string, reason: string) {
  await update($, pending, () => ({ id, reason }))
  await $.ui.open({ id: DIALOG, title: 'Turn off a 🔴', focus: true, closeOnEscape: true, holdToasts: true, rows: 14 })
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
    // While building, a push to main integrates (regressions only); live, it is a production deploy.
    const live = /^stage:\s*live\s*$/m.test(await $.fs.read('.mep/profile.yaml').catch(() => ''))
    const kind = deployKind(e.command, branch?.stdout.trim(), live ? 'live' : 'building')
    if (!kind) return next(e)
    const result = await runEngine($, ['verify', ...(kind === 'prod' ? ['--prod'] : [])])
    if (result.exitCode !== 0) return { deny: result.stdout.trim() || result.stderr.trim() }
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'mep: could not verify the deploy (is node available?). Run /mep:check.' }))

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
  const HUMAN: Record<string, string> = { 'mep:confirm': 'confirm', 'mep:override': 'override', 'mep:threshold': 'threshold', 'mep:resync': 'resync', 'mep:defer': 'defer', 'mep:domain': 'domain' }
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

  // Where things are by domain, what to do in one, and go-live: instant. Launch only ever makes the gates stricter.
  for (const [command, engineCmd] of [['mep:domains', 'domains'], ['mep:focus', 'focus'], ['mep:prelaunch', 'prelaunch'], ['mep:launch', 'launch']] as const) {
    on('command.run', { command }, async ($, e, next) => {
      if (!(await hasProfile($))) return next(e)
      const r = await runEngine($, [engineCmd, ...e.args.split(/\s+/).filter(Boolean)])
      if (engineCmd === 'launch') await refresh($).catch(() => undefined)
      return { text: (r.stdout || r.stderr).trim() }
    })
  }

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
    await update($, spinner, () => -1) // a hot reload cancels the ticker: start idle
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
    if (!ask || !item) return <Text dimColor>Nothing to confirm.</Text>
    return (
      <Box flexDirection="column">
        <Text bold>Turn off {item.id}?</Text>
        <Text>{item.title}</Text>
        <Text> </Text>
        <Text dimColor>Risk you accept</Text>
        <Text>{item.why}</Text>
        <Text dimColor>Your reason</Text>
        <Text>{ask.reason}</Text>
        <Text dimColor>Queda en .mep/log, marcado ⚠️ en BRIEF.md y en el resumen del PR.</Text>
        <Text> </Text>
        <Box flexDirection="row" gap={2}>
          <Button key="cancel" role="dismiss" autoFocus onPress={() => $.ui.close({ id: DIALOG })}>
            Cancel
          </Button>
          <Button
            key="override"
            variant="primary"
            onPress={async () => {
              await act($, ['override', item.id, ...ask.reason.split(/\s+/), '--yes'])
              await $.ui.close({ id: DIALOG })
            }}
          >
            Turn off
          </Button>
        </Box>
      </Box>
    )
  })

  // Esc, Cancel or the close mark: nothing is turned off.
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
    if (!data) return <Text dimColor>mep: verifying…</Text>
    const id = await read($, selected)
    const item = id ? data.items.find(i => i.id === id) : undefined
    const open = await read($, expanded)
    const toggle = (key: string) => update($, expanded, list => (list.includes(key) ? list.filter(p => p !== key) : [...list, key]))
    const frame = await read($, spinner)
    // Colors sit in Text elements of their own, never inside a Button: a Button restyles its label on some surfaces.
    const paint = (level: keyof typeof LEVEL_COLOR) => (e.surface === 'terminal' ? LEVEL_COLOR[level] : LEVEL_HEX[level])
    const dot = (level: keyof typeof LEVEL_COLOR) => <Text color={paint(level)}>{LEVEL_GLYPH[level]}</Text>
    const cells = e.props.bodyColumns >= 48 ? 6 : 4
    /** Done / total required items, drawn as a braille bar (the done part colored by progress, the rest dim). */
    const bar = (items: typeof data.items) => {
      const req = items.filter(i => i.level === 'required' && i.state === 'active')
      const done = req.filter(i => i.status === 'pass').length
      return { done, total: req.length, node: barNode(done, req.length) }
    }
    function barNode(done: number, total: number) {
      const m = meter(done, total, cells)
      return (
        <Box flexDirection="row">
          <Text color={progressColor(total ? done / total : 0)}>{m.filled}</Text>
          <Text dimColor>{m.rest}</Text>
        </Box>
      )
    }
    /** A count in its level's color, right-aligned in 3 columns; a zero is dim. */
    const num = (n: number, level: keyof typeof LEVEL_COLOR) => (n ? <Text color={paint(level)}>{String(n).padStart(3)}</Text> : <Text dimColor>{'  0'}</Text>)
    /**
     * One line of a list: NAME (grows) · bar · red, yellow and white counts. The numbers carry the color (the
     * circles live inside the category, next to each item); only the name is a Button.
     */
    const line = (opts: { key: string; label: string; onPress: () => void; done: number; total: number; counts: [number, number, number] }) => (
      <Box flexDirection="row">
        <Box flexGrow={1}>
          <Button key={opts.key} plain onPress={opts.onPress}>
            {opts.label}
          </Button>
        </Box>
        {opts.total ? barNode(opts.done, opts.total) : <Text>{' '.repeat(cells)}</Text>}
        <Text>{'  '}</Text>
        {num(opts.counts[0], 'required')}
        {num(opts.counts[1], 'recommended')}
        {num(opts.counts[2], 'optional')}
      </Box>
    )

    if (await read($, flowOpen)) {
      // Where the project stands: live, nothing required left (ready to go live), or still being worked.
      const current = data.stage === 'live' ? 'live' : data.counts.required === 0 ? 'launch' : 'work'
      const at = FLOW.findIndex(s => s.id === current)
      // Into the chat box if it takes it; on a surface that draws its own composer, onto the clipboard.
      const put = async (text: string) => {
        const shown = text.trim()
        const filled = await $.prompt.fill({ text, mode: 'replace' }).catch(() => ({ isFilled: false }))
        if (filled.isFilled) return update($, flash, () => `In the chat: ${shown}. Press Enter to run it.`)
        const copied = await $.ui.copy({ text: shown, surface: e.surface }).catch(() => ({ isCopied: false }))
        await update($, flash, () => (copied.isCopied ? `Copied: ${shown}. Paste it in the chat.` : `Type it in the chat: ${shown}`))
      }
      return (
        <Box flexDirection="column">
          <Button key="flow-back" plain onPress={() => update($, flowOpen, () => false)}>
            ← Back
          </Button>
          <Text bold>Flow: which command, and when</Text>
          <Text dimColor>A click writes the command in the chat; you press Enter.</Text>
          {message ? <Text dimColor>{message}</Text> : null}
          <Box flexDirection="column" marginTop={1}>
            {FLOW.map((step, i) => {
              const here = i === at
              const mark = here ? '▶' : i < at ? '✓' : '○'
              return (
                <Box flexDirection="column">
                  {i > 0 && <Text dimColor>{'  │'}</Text>}
                  <Box flexDirection="row" gap={1}>
                    {here ? <Text color={e.surface === 'terminal' ? 'claude' : '#d97757'}>{mark}</Text> : <Text dimColor>{mark}</Text>}
                    <Text bold={here}>{`${i + 1}. ${step.title}`}</Text>
                    <Text dimColor>{step.when}</Text>
                  </Box>
                  {'note' in step && <Text dimColor>{`  │ ${step.note}`}</Text>}
                  {step.cmds.map(([label, fill, hint], k) => (
                    <Box flexDirection="row">
                      <Text dimColor>{k === step.cmds.length - 1 ? '  └ ' : '  ├ '}</Text>
                      <Button key={`f-${step.id}-${k}`} plain onPress={() => put(fill)}>
                        {label}
                      </Button>
                      <Text dimColor>{`  ${hint}`}</Text>
                    </Box>
                  ))}
                </Box>
              )
            })}
          </Box>
        </Box>
      )
    }

    if (await read($, tools)) {
      const run = async (command: string, args = '') => {
        await update($, flash, () => `/${command} ${args}`.trim() + ' queued.')
        void $.command.run({ command, args }).catch(err => update($, flash, () => `/${command}: ${String(err)}`))
      }
      // The same checks the gate runs on a deploy or a PR into main, asked ahead; the whole answer shows.
      const ask = (args: string[], clear: string) =>
        busy($, async () => {
          await update($, flash, () => 'verifying…')
          const r = await runEngine($, args)
          await update($, flash, () => r.stdout.trim() || (r.exitCode === 0 ? clear : r.stderr.trim()))
        })
      if (frame < 0) {
        recentLog = (await $.fs.read('.mep/log').catch(() => ''))
          .split('\n')
          .filter(l => l && l.split(' ')[1] !== 'state')
          .slice(-3)
          .map(l => `${l.slice(0, 10)} ${l.slice(l.indexOf(' ') + 1)}`)
      }
      const recent = recentLog
      return (
        <Box flexDirection="column">
          <Button key="tools-back" plain onPress={() => update($, tools, () => false)}>
            ← Back
          </Button>
          {message ? <Text dimColor>{message}</Text> : null}
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Before deploying or opening a PR</Text>
            <Button key="t-deploy" plain onPress={() => ask(['verify', '--prod'], '✅ Nothing blocks a production deploy.')}>
              {'  Can I deploy to production?'}
            </Button>
            <Button key="t-pr" plain onPress={() => ask(['pr-gate'], '✅ Nothing stops a PR to main.')}>
              {'  Can I open a PR to main?'}
            </Button>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Instant</Text>
            {INSTANT.map(([command, label]) => (
              <Button key={`t-${command}`} plain onPress={() => run(command)}>
                {`  ${label} `}
                <Text dimColor>{`/${command}`}</Text>
              </Button>
            ))}
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Takes a Claude turn</Text>
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
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Recent activity</Text>
            {recent.length ? recent.map(l => <Text dimColor>{`  ${l}`}</Text>) : <Text dimColor>  No events in .mep/log.</Text>}
          </Box>
        </Box>
      )
    }

    if (item) {
      const confirming = await read($, pending)
      const canConfirm = item.manual && item.category !== 'security' && isPending(item)
      const verdict =
        item.state === 'skipped' ? <Text dimColor>skipped</Text>
        : item.state !== 'active' ? <Text color="warning">turned off</Text>
        : item.status === 'pass' ? <Text color="success">✓ met</Text>
        : item.status === 'fail' ? <Text color="error">✗ fails</Text>
        : <Text dimColor>not verified</Text>
      const allFindings = open.includes(`findings:${item.id}`)
      const shownFindings = allFindings ? item.all : item.all.slice(0, FINDINGS_CAP)
      return (
        <Box flexDirection="column">
          <Button key="back" plain onPress={() => update($, selected, () => null)}>
            ← Back
          </Button>
          <Box flexDirection="row" gap={1}>
            {dot(item.level)}
            <Text bold>{item.id}</Text>
            {verdict}
          </Box>
          <Text dimColor>
            {item.phase}
            {item.domain ? ` · ${item.domain}` : ''}
            {item.locked ? ' · 🔒 locked' : ''}
            {item.deferred ? ' · ⏳ deferred until go-live' : ''}
          </Text>
          {item.links.length > 0 && <Text dimColor>{`Also in: ${item.links.join(', ')}`}</Text>}
          <Text>{item.title}</Text>
          {/* Actions sit above the long text, so they stay in the frame; the rest scrolls. */}
          {!e.props.isFocused && <Text dimColor>ctrl+x tab y flechas para desplazar.</Text>}
          {message ? <Text dimColor>{message}</Text> : null}
          {item.locked && <Text dimColor>🔒 Cannot be turned off.</Text>}
          {item.category === 'security' && isPending(item) && <Text dimColor>Only a mep-security audit marks it as met.</Text>}
          {canConfirm && (
            <Button key="confirm" variant="primary" onPress={() => act($, ['confirm', item.id])}>
              Confirm: I verified it
            </Button>
          )}
          {Input && item.level === 'recommended' && item.state === 'active' && (
            <Input key={`skip-${item.id}`} label="Skip, reason:" submitLabel="skip" onSubmit={v => (v.trim() ? act($, ['skip', item.id, ...v.trim().split(/\s+/)]) : undefined)} />
          )}
          {Input && item.level === 'required' && item.state === 'active' && !item.locked && !confirming && (
            <Input key={`override-${item.id}`} label="Turn off, reason:" submitLabel="next" onSubmit={v => (v.trim() ? askOverride($, item.id, v.trim()) : undefined)} />
          )}
          {confirming && confirming.id === item.id && <Text dimColor>Confirm or cancel in the dialog.</Text>}
          {/* Postponing is not turning off: the item still has to pass at go-live. */}
          {item.deferred && (
            <Button key="undefer" plain onPress={() => act($, ['undefer', item.id])}>
              Remove the deferral
            </Button>
          )}
          {Input && !item.deferred && item.level === 'required' && item.state === 'active' && !item.locked && item.status !== 'pass' && (
            <Input key={`defer-${item.id}`} label="Defer until go-live, reason:" submitLabel="defer" onSubmit={v => (v.trim() ? act($, ['defer', item.id, ...v.trim().split(/\s+/)]) : undefined)} />
          )}
          {/* What to do first, then how, then why. */}
          {item.detail ? (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>{item.state === 'active' ? 'What is missing' : 'Reason'}</Text>
              <Text>{item.detail}</Text>
            </Box>
          ) : null}
          {item.all.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>Everything that fails ({item.all.length})</Text>
              {shownFindings.map(f => (
                <Text>  · {f}</Text>
              ))}
              {item.all.length > FINDINGS_CAP && (
                <Button key="more-findings" plain onPress={() => toggle(`findings:${item.id}`)}>
                  {allFindings ? '  less' : `  … ${item.all.length - FINDINGS_CAP} more`}
                </Button>
              )}
            </Box>
          )}
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>How</Text>
            <Text>{item.how}</Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Why</Text>
            <Text>{item.why}</Text>
          </Box>
        </Box>
      )
    }

    const mode = await read($, view)
    const deferredPending = data.items.filter(i => i.deferred && isPending(i)).length
    // A count opens its first pending item; a zero count is not a button.
    const first = (level: 'required' | 'recommended') => data.items.find(i => i.level === level && isPending(i) && !i.deferred)
    const narrow = e.props.bodyColumns < 56
    const WORD = { required: narrow ? 'Req.' : 'Required', recommended: narrow ? 'Rec.' : 'Recommended' } as const
    const count = (level: 'required' | 'recommended') => {
      const target = first(level)
      const label = ` ${data.counts[level]}`
      return (
        <Box flexDirection="row">
          <Text color={paint(level)}>{WORD[level]}</Text>
          {target ? (
            <Button key={`first-${level}`} plain onPress={() => update($, selected, () => target.id)}>
              {label}
            </Button>
          ) : (
            <Text dimColor>{label}</Text>
          )}
        </Box>
      )
    }
    const rank = (a: PanelItem, b: PanelItem) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || Number(a.deferred) - Number(b.deferred)
    const row = (i: PanelItem, note?: string) => (
      <Box flexDirection="row">
        <Text>{'    '}</Text>
        {dot(i.level)}
        <Button key={i.id} plain onPress={() => update($, selected, () => i.id)}>
          {` ${i.id}`}
        </Button>
        {i.status === 'fail' ? <Text color={e.surface === 'terminal' ? 'error' : LEVEL_HEX.required}>{' ✗'}</Text> : null}
        {i.deferred ? <Text dimColor>{' ⏳'}</Text> : null}
        {note ? <Text dimColor>{`  ${note}`}</Text> : null}
      </Box>
    )
    /** Rows grouped under a heading per level, the heading in the level's color and naming it, so the level reads even if the color does not. */
    const SECTION = { required: 'Required', recommended: 'Recommended', optional: 'Optional (chosen)' } as const
    const sections = (shownRows: PanelItem[], all: PanelItem[], note?: (i: PanelItem) => string | undefined) =>
      (['required', 'recommended', 'optional'] as const).map(level => {
        const here = shownRows.filter(i => i.level === level)
        if (!here.length) return null
        return (
          <Box flexDirection="column">
            <Text bold color={paint(level)}>{`   ${SECTION[level]} (${all.filter(i => i.level === level).length})`}</Text>
            {here.map(i => row(i, note?.(i)))}
          </Box>
        )
      })
    const optionalOf = (items: PanelItem[]) => items.filter(i => i.level === 'optional' && i.state === 'active' && i.status !== 'pass').length
    // Sub-phases with nothing pending fold into one line; the others show a header and, open, up to CAP rows.
    const listed = (i: PanelItem) => isPending(i) || (i.state === 'active' && i.level === 'optional' && i.status !== 'pass')
    const pendingOf = (phase: string) => data.items.filter(i => i.phase === phase && listed(i)).sort(rank)
    const clean = data.phases.filter(p => (data.closed.includes(p) || p === data.active) && !pendingOf(p).length)

    const byPhase = (
      <Box flexDirection="column" marginTop={1}>
        {data.phases.map(phase => {
          const items = pendingOf(phase)
          if (!items.length) return null
          const closed = data.closed.includes(phase)
          // Open by default: the active sub-phase and regressions in closed ones. Later ones fold to a count.
          const shown = phase === data.active || closed || open.includes(phase)
          const req = items.filter(i => i.level === 'required').length
          const rec = items.filter(i => i.level === 'recommended').length
          const all = open.includes(`all:${phase}`)
          const rows = all ? items : items.slice(0, CAP)
          const inPhase = data.items.filter(i => i.phase === phase)
          const progress = bar(inPhase)
          return (
            <Box flexDirection="column">
              {line({
                key: `phase-${phase}`,
                label: `${shown ? '▾' : '▸'} ${phase}${closed ? ' · closed' : ''}`,
                onPress: () => toggle(phase),
                done: progress.done,
                total: progress.total,
                counts: [req, rec, optionalOf(inPhase)],
              })}
              {/* No hover card: an absolute card covers the rows under it and takes their pointer. */}
              {shown && sections(rows, items)}
              {shown && items.length > CAP && (
                <Button key={`more-${phase}`} plain onPress={() => toggle(`all:${phase}`)}>
                  {all ? '     less' : `     … ${items.length - CAP} more`}
                </Button>
              )}
            </Box>
          )
        })}
      </Box>
    )

    // By domain: the same line per domain; open, its pending items (and the ones linked from elsewhere, ↗).
    const byDomain = (
      <Box flexDirection="column" marginTop={1}>
        {data.domains
          .filter(d => d.row.applies || d.row.off)
          .map(d => {
            const key = `dom:${d.row.path}`
            const shown = open.includes(key)
            const inside = (i: PanelItem) => i.domain === d.row.path || i.domain.startsWith(`${d.row.path}.`)
            const mine = data.items.filter(inside).filter(listed).sort(rank)
            const linked = data.items.filter(i => !inside(i) && i.links.some(l => l === d.row.path || l.startsWith(`${d.row.path}.`))).filter(isPending).sort(rank)
            const all = open.includes(`all:${key}`)
            const rows = all ? mine : mine.slice(0, CAP)
            return (
              <Box flexDirection="column">
                {line({
                  key,
                  label: `${shown ? '▾' : '▸'} ${d.row.label}${d.row.off ? ' · off' : ''}`,
                  onPress: () => toggle(key),
                  done: d.row.off ? 0 : d.row.done,
                  total: d.row.off ? 0 : d.row.required,
                  counts: d.row.off ? [0, 0, 0] : [d.row.pendingRequired, d.row.pendingRecommended, d.row.pendingOptional],
                })}
                {shown && d.row.off && (
                  <Button key={`on-${d.row.path}`} plain onPress={() => act($, ['domain', 'on', d.row.path])}>
                    {`   ${d.row.off} · turn on`}
                  </Button>
                )}
                {shown && !d.row.off && sections(rows, mine, i => i.domain.slice(d.row.path.length + 1))}
                {shown && !d.row.off && mine.length > CAP && (
                  <Button key={`more-${key}`} plain onPress={() => toggle(`all:${key}`)}>
                    {all ? '     less' : `     … ${mine.length - CAP} more`}
                  </Button>
                )}
                {shown && !d.row.off && linked.length > 0 && <Text dimColor>{`   ↗ linked (${linked.length})`}</Text>}
                {shown && !d.row.off && linked.slice(0, 3).map(i => row(i, `↗ ${i.domain}`))}
              </Box>
            )
          })}
      </Box>
    )

    const overall = bar(data.items)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          <Text bold>{`${data.active} · `}</Text>
          {count('required')}
          {count('recommended')}
          {deferredPending > 0 && <Text dimColor>{`⏳ ${deferredPending}`}</Text>}
          <Text color="claude">{frame >= 0 ? SPINNER_FRAMES[frame % SPINNER_FRAMES.length] : ' '}</Text>
        </Box>
        <Text dimColor>{data.stage === 'live' ? 'live: a push to main is a deploy' : 'building: a push only stops on regressions'}</Text>
        <Box flexDirection="row" gap={2}>
          <Button key="full" plain onPress={() => refresh($, true)}>
            ↻ Verify all
          </Button>
          <Button key="flow" plain onPress={() => update($, flowOpen, () => true)}>
            ⇢ Flow
          </Button>
          <Button key="tools" plain onPress={() => update($, tools, () => true)}>
            ⚙ Tools
          </Button>
        </Box>
        {overall.total ? (
          <Box flexDirection="row" gap={1}>
            {overall.node}
            <Text dimColor>{`${overall.done}/${overall.total} required`}</Text>
          </Box>
        ) : null}
        <Box flexDirection="row" gap={2}>
          <Text dimColor>View by</Text>
          <Button key="view-phase" plain onPress={() => update($, view, () => 'fase')}>
            {mode === 'fase' ? <Text bold>sub-phase</Text> : <Text dimColor>sub-phase</Text>}
          </Button>
          <Button key="view-domain" plain onPress={() => update($, view, () => 'dominio')}>
            {mode === 'dominio' ? <Text bold>domain</Text> : <Text dimColor>domain</Text>}
          </Button>
        </Box>
        {!data.full && <Text dimColor>Commands and the build are verified with ↻.</Text>}
        {message ? <Text dimColor>{message}</Text> : null}
        {mode === 'dominio' ? byDomain : byPhase}
        {mode === 'fase' && clean.length > 0 && <Text dimColor>{`✓ ${clean.join(' · ')}`}</Text>}
      </Box>
    )
  })
}
