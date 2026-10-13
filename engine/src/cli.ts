import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parse } from 'yaml'
import { loadCatalog, validateProfile } from './catalog.ts'
import { deployKind, mayDeploy } from './deploy.ts'
import { diff, evaluate, warnings } from './evaluate.ts'
import { matchFiles } from './files.ts'
import { cachedGate, closePhase, formatItems, gate } from './gate.ts'
import { hasProfile, loadProfile, log, normalizeProfile, saveProfile, today } from './profile.ts'
import { linkClaudeMd, renderBrief, writeBrief, writeStackAdrs } from './render.ts'
import { counts, formatCheck, formatProposal } from './report.ts'
import { recordReport, reportState } from './security.ts'
import { missingSignals } from './signals.ts'
import { globToRegExp } from './files.ts'
import { verifyItems } from './verify.ts'
import type { Catalog, Profile } from './types.ts'

type Args = { _: string[]; flags: Record<string, string | true> }

function parseArgs(argv: string[]): Args {
  const out: Args = { _: [], flags: {} }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=', 2)
      if (v !== undefined) out.flags[k] = v
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) out.flags[k] = argv[++i]
      else out.flags[k] = true
    } else out._.push(a)
  }
  return out
}

function readInput(source: string | true | undefined): string {
  if (source === undefined || source === true || source === '-') return readFileSync(0, 'utf8')
  return readFileSync(source, 'utf8')
}

/** A proposed profile (YAML or JSON), optionally on top of a preset. */
function proposedProfile(args: Args, catalog: Catalog): Profile {
  const raw = (parse(readInput(args.flags.from)) ?? {}) as Partial<Profile>
  const presetName = (args.flags.preset as string | undefined) ?? raw.preset
  const preset = presetName ? catalog.presets[presetName] : {}
  if (presetName && !preset) fail(`preset desconocido: ${presetName}. Disponibles: ${Object.keys(catalog.presets).join(', ')}`)
  const merged = {
    ...preset,
    ...raw,
    capabilities: [...new Set([...(preset?.capabilities ?? []), ...(raw.capabilities ?? [])])],
    signals: { ...preset?.signals, ...raw.signals },
    preset: presetName,
    catalog_version: catalog.version,
  }
  const profile = normalizeProfile(merged, catalog)
  const errors = validateProfile(profile, catalog)
  if (errors.length) fail(`perfil inválido:\n- ${errors.join('\n- ')}`)
  return profile
}

function fail(message: string, code = 1): never {
  process.stderr.write(`${message}\n`)
  process.exit(code)
}

function print(text: string): void {
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`)
}

function pluginRoot(catalog: Catalog): string {
  return dirname(catalog.dir)
}

function requireProfile(root: string, catalog: Catalog): Profile {
  if (!hasProfile(root)) fail('Este proyecto no usa mep (falta .mep/profile.yaml). Empieza con /mep:scope.')
  return loadProfile(root, catalog)
}

function regenerate(root: string, profile: Profile, catalog: Catalog): void {
  const evaluated = evaluate(profile, catalog)
  const results = verifyItems(root, profile, evaluated, 'fast')
  writeBrief(root, renderBrief(profile, evaluated, catalog, results))
}

function currentBranch(root: string): string | undefined {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return undefined
  }
}

function hookInput(): Record<string, any> {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}')
  } catch {
    return {}
  }
}

function json(value: unknown): void {
  print(JSON.stringify(value))
}

/** Classic hooks: the backup where mods are not available. They never act on a repo without .mep/. */
function runHook(event: string, root: string, catalog: Catalog): void {
  const input = hookInput()
  const cwd = input.cwd ? resolve(input.cwd) : root
  if (!hasProfile(cwd)) return
  switch (event) {
    case 'session-start': {
      const profile = loadProfile(cwd, catalog)
      const results = verifyItems(cwd, profile, evaluate(profile, catalog), 'fast')
      const c = counts(results)
      const active = results.filter(r => r.state === 'active' && r.level === 'required' && r.item.phase === profile.phase.active && r.status !== 'pass')
      const text = [
        `mep · sub-etapa activa: ${profile.phase.active} · pendientes 🔴 ${c.required} · 🟡 ${c.recommended}. Este proyecto se rige por BRIEF.md.`,
        ...active.slice(0, 5).map(r => `  🔴 ${r.item.id} — ${r.item.how}`),
        active.length > 5 ? `  … y ${active.length - 5} más (/mep:check)` : '',
      ]
        .filter(Boolean)
        .join('\n')
      json({ systemMessage: text.split('\n')[0], hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } })
      return
    }
    case 'stop': {
      const result = gate(cwd, catalog, 'stop')
      if (result.block && !input.stop_hook_active) json({ decision: 'block', reason: result.message })
      else if (result.message) json({ systemMessage: result.message })
      return
    }
    case 'pre-bash': {
      const command = String(input.tool_input?.command ?? '')
      if (!mayDeploy(command)) return
      const kind = deployKind(command, currentBranch(cwd))
      if (!kind) return
      const result = cachedGate(cwd, catalog, kind)
      if (result.block) {
        json({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: result.message } })
      }
      return
    }
    case 'post-edit': {
      const file = String(input.tool_input?.file_path ?? '')
      const rel = file.startsWith(cwd) ? file.slice(cwd.length + 1) : file
      if (!catalog.sensitivePaths.some(p => globToRegExp(p).test(rel))) return
      json({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `mep: ${rel} es un archivo sensible. Al terminar este cambio, pide al agente mep-security que lo audite; su reporte en .mep/security/ es lo que da por cumplidos los ítems de seguridad.`,
        },
      })
      return
    }
    default:
      fail(`hook desconocido: ${event}`)
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  const [cmd, ...rest] = args._
  const root = resolve((args.flags.cwd as string | undefined) ?? process.cwd())
  const catalog = loadCatalog(args.flags.catalog ? resolve(args.flags.catalog as string) : undefined)

  switch (cmd) {
    case 'evaluate': {
      const profile = args.flags.from ? proposedProfile(args, catalog) : requireProfile(root, catalog)
      const evaluated = evaluate(profile, catalog)
      if (args.flags.json) return json({ profile, items: evaluated.map(e => ({ id: e.item.id, level: e.level, state: e.state, phase: e.item.phase, category: e.item.category })), warnings: warnings(evaluated) })
      return print(formatProposal(evaluated))
    }
    case 'init': {
      if (hasProfile(root) && !args.flags.force) fail('Ya existe .mep/profile.yaml. Usa /mep:add para cambiar el scope (o --force).')
      const profile = proposedProfile(args, catalog)
      saveProfile(root, profile)
      regenerate(root, profile, catalog)
      const adrs = writeStackAdrs(root, profile, catalog)
      const linked = linkClaudeMd(root, readFileSync(join(pluginRoot(catalog), 'templates', 'claude-md.md'), 'utf8'))
      const ci = join(root, '.github', 'workflows', 'mep.yml')
      if (!existsSync(ci)) {
        mkdirSync(dirname(ci), { recursive: true })
        writeFileSync(ci, readFileSync(join(pluginRoot(catalog), 'templates', 'ci', 'mep.yml'), 'utf8'))
      }
      log(root, 'init', `${profile.type} (${profile.capabilities.join(',')})`)
      return print(`✅ .mep/profile.yaml y BRIEF.md creados. ADRs: ${adrs.length}. CLAUDE.md ${linked ? 'enlazado' : 'ya estaba enlazado'}. CI: .github/workflows/mep.yml.`)
    }
    case 'render': {
      const profile = requireProfile(root, catalog)
      regenerate(root, profile, catalog)
      const adrs = writeStackAdrs(root, profile, catalog)
      return print(`BRIEF.md regenerado.${adrs.length ? ` ADRs nuevos: ${adrs.join(', ')}` : ''}`)
    }
    case 'add': {
      const before = requireProfile(root, catalog)
      const proposed = (parse(readInput(args.flags.from)) ?? {}) as Partial<Profile>
      const after = normalizeProfile({ ...before, ...proposed, phase: before.phase, selections: before.selections }, catalog)
      const errors = validateProfile(after, catalog)
      if (errors.length) fail(`perfil inválido:\n- ${errors.join('\n- ')}`)
      const changes = diff(before, after, catalog)
      const labels = { new: '＋ nuevo', raised: '↑ sube', lowered: '↓ baja', removed: '－ deja de aplicar' }
      const text = changes.length
        ? changes.map(c => `${labels[c.change]}  ${c.id} — ${c.title}${c.from ? ` (${c.from}${c.to ? ` → ${c.to}` : ''})` : c.to ? ` (${c.to})` : ''}`).join('\n')
        : 'Sin cambios en el checklist.'
      if (args.flags.json) return json(changes)
      if (args.flags.apply) {
        saveProfile(root, after)
        regenerate(root, after, catalog)
        writeStackAdrs(root, after, catalog)
        log(root, 'add', changes.map(c => `${c.change}:${c.id}`).join(','))
        return print(`${text}\n\n✅ Perfil actualizado y BRIEF.md regenerado.`)
      }
      return print(text)
    }
    case 'check': {
      const profile = requireProfile(root, catalog)
      const mode = args.flags.fast ? 'fast' : 'full'
      const results = verifyItems(root, profile, evaluate(profile, catalog), mode)
      const signals = missingSignals(root, profile, catalog)
      if (args.flags.json) return json({ counts: counts(results), results: results.map(r => ({ id: r.item.id, level: r.level, state: r.state, status: r.status, phase: r.item.phase })), signals })
      const parts = [formatCheck(results, profile, catalog, { verbose: Boolean(args.flags.all) })]
      const c = counts(results)
      parts.push(`\nPendientes: 🔴 ${c.required} · 🟡 ${c.recommended}`)
      if (signals.length) {
        parts.push(`\n⚠️ El código muestra señales que el perfil no tiene (propón actualizarlo con /mep:add):\n${signals.map(s => `  - ${s.signal} (${s.evidence})`).join('\n')}`)
      }
      return print(parts.join('\n'))
    }
    case 'verify': {
      if (!hasProfile(root)) return print('mep: sin .mep/profile.yaml, nada que verificar.')
      const kind = args.flags.prod ? 'prod' : 'stop'
      const result = args.flags['no-cache'] ? gate(root, catalog, kind) : cachedGate(root, catalog, kind)
      print(result.message || '✅ mep: sin 🔴 pendientes que bloqueen.')
      process.exitCode = result.block ? 1 : 0
      return
    }
    case 'status': {
      if (!hasProfile(root)) return args.flags.json ? json(null) : undefined
      const profile = loadProfile(root, catalog)
      const c = counts(verifyItems(root, profile, evaluate(profile, catalog), 'fast'))
      if (args.flags.json) return json({ phase: profile.phase.active, ...c })
      return print(`mep · ${profile.phase.active} · 🔴 ${c.required} · 🟡 ${c.recommended}`)
    }
    case 'phase': {
      const profile = requireProfile(root, catalog)
      if (rest[0] === 'close') {
        if (!rest[1]) fail('Uso: mep phase close <sub-etapa>')
        const result = closePhase(root, catalog, rest[1])
        if (result.closed) regenerate(root, result.profile, catalog)
        print(result.message)
        process.exitCode = result.closed ? 0 : 1
        return
      }
      const results = verifyItems(root, profile, evaluate(profile, catalog), 'full')
      const pending = results.filter(r => r.state === 'active' && r.level === 'required' && r.item.phase === profile.phase.active && r.status !== 'pass')
      const lines = catalog.dimensions.phases.map(p => `${profile.phase.closed.includes(p) ? '✅' : p === profile.phase.active ? '▶️' : '·'} ${p}`)
      return print(
        [`Sub-etapa activa: ${profile.phase.active}`, lines.join('\n'), pending.length ? `\nPara cerrarla faltan ${pending.length} 🔴:\n${formatItems(pending)}` : `\n✅ Lista para cerrar: /mep:phase close ${profile.phase.active}`].join('\n'),
      )
    }
    case 'skip':
    case 'override': {
      const [id, ...reasonParts] = rest
      const reason = reasonParts.join(' ').trim()
      if (!id || !reason) fail(`Uso: mep ${cmd} <id> <razón>`)
      const profile = requireProfile(root, catalog)
      const e = evaluate(profile, catalog).find(x => x.item.id === id)
      if (!e) fail(`${id} no aplica a este perfil`)
      if (cmd === 'skip') {
        if (e.level !== 'recommended') fail(`/mep:skip solo acepta 🟡. ${id} es ${e.level}${e.level === 'required' ? ': usa /mep:override' : ''}.`)
        profile.selections.recommended_skipped = profile.selections.recommended_skipped.filter(s => s.id !== id).concat({ id, reason, date: today() })
      } else {
        if (e.item.locked) fail(`${id} es locked 🔒: no se puede desactivar.`)
        if (e.level !== 'required') fail(`/mep:override solo aplica a 🔴. ${id} es ${e.level}${e.level === 'recommended' ? ': usa /mep:skip' : ''}.`)
        if (!args.flags.yes) fail(`Desactivar ${id} requiere confirmación explícita (--yes).`, 2)
        profile.selections.overrides = profile.selections.overrides.filter(s => s.id !== id).concat({ id, reason, date: today() })
      }
      saveProfile(root, profile)
      log(root, cmd, `${id} "${reason}"`)
      regenerate(root, profile, catalog)
      return print(cmd === 'skip' ? `⏭️ ${id} omitido: ${reason}` : `⚠️ ${id} desactivado: ${reason} (registrado en .mep/log)`)
    }
    case 'select': {
      const profile = requireProfile(root, catalog)
      const evaluated = evaluate(profile, catalog)
      for (const id of rest) {
        const e = evaluated.find(x => x.item.id === id)
        if (!e || e.level !== 'optional') fail(`${id} no es un ⚪ opcional de este perfil`)
      }
      profile.selections.optional_added = [...new Set([...profile.selections.optional_added, ...rest])].sort()
      saveProfile(root, profile)
      regenerate(root, profile, catalog)
      return print(`⚪ agregados: ${rest.join(', ')}`)
    }
    case 'confirm': {
      const [id] = rest
      const by = args.flags.by as string | undefined
      if (!id || !by) fail('Uso: mep confirm <id> --by <nombre>')
      const profile = requireProfile(root, catalog)
      const e = evaluate(profile, catalog).find(x => x.item.id === id)
      if (!e?.item.verify.some(v => v.type === 'manual')) fail(`${id} no tiene verificación manual`)
      if (e.item.category === 'security') fail(`${id} es de seguridad: lo confirma una auditoría de mep-security, no una persona.`)
      profile.selections.manual_confirmed = profile.selections.manual_confirmed.filter(c => c.id !== id).concat({ id, by, date: today() })
      saveProfile(root, profile)
      regenerate(root, profile, catalog)
      return print(`✅ ${id} confirmado por ${by}`)
    }
    case 'security': {
      requireProfile(root, catalog)
      if (rest[0] === 'record') {
        const id = args.flags.id as string
        const result = args.flags.result as 'pass' | 'fail' | 'risk'
        if (!id || !['pass', 'fail', 'risk'].includes(result)) fail('Uso: mep security record --id <id> --result pass|fail|risk --files a,b --notes "..."')
        if (!catalog.items.some(i => i.id === id && i.category === 'security')) fail(`${id} no es un ítem de seguridad`)
        const files = String(args.flags.files ?? '').split(',').map(f => f.trim()).filter(Boolean)
        const missing = files.filter(f => !matchFiles(root, f).length && !existsSync(join(root, f)))
        if (missing.length) fail(`archivos inexistentes: ${missing.join(', ')}`)
        recordReport(root, { id, result, files, notes: String(args.flags.notes ?? '') })
        return print(`reporte de ${id}: ${result}`)
      }
      const profile = loadProfile(root, catalog)
      const ids = evaluate(profile, catalog).filter(e => e.state === 'active' && e.item.category === 'security').map(e => e.item.id)
      return print(ids.map(id => `${reportState(root, id).valid ? '✅' : '❌'} ${id} — ${reportState(root, id).detail}`).join('\n'))
    }
    case 'signals': {
      const profile = requireProfile(root, catalog)
      return json(missingSignals(root, profile, catalog))
    }
    case 'presets':
      return print(Object.entries(catalog.presets).map(([k, v]) => `${k}: ${v.type} — ${(v.capabilities ?? []).join(', ')}`).join('\n'))
    case 'hook':
      return runHook(rest[0], root, catalog)
    case 'version':
      return print(`catálogo ${catalog.version}`)
    default:
      print(
        [
          'mep <comando>',
          '  evaluate [--from perfil.yaml] [--preset x] [--json]   ítems que aplican',
          '  init --from perfil.yaml [--preset x]                  crea perfil, BRIEF.md, ADRs, CLAUDE.md y CI',
          '  add --from cambio.yaml [--apply]                      diff del checklist',
          '  check [--fast] [--all] [--json]                       verificación por sub-etapa',
          '  verify [--prod]                                       gate para CI (sale con 1 si bloquea)',
          '  phase [close <sub-etapa>]',
          '  skip <id> <razón> · override <id> <razón> --yes · select <id…> · confirm <id> --by <nombre>',
          '  security [record --id --result --files --notes]',
          '  render · status · signals · presets · version',
          '  hook <session-start|stop|pre-bash|post-edit>          hooks clásicos (stdin JSON)',
        ].join('\n'),
      )
      if (cmd) process.exitCode = 1
  }
}

main()
