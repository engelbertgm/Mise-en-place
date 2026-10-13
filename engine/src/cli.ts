import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { parse, stringify } from 'yaml'
import { loadCatalog, validateProfile } from './catalog.ts'
import { deployKind, mayDeploy, prToMain } from './deploy.ts'
import { diff, evaluate, warnings } from './evaluate.ts'
import { matchFiles } from './files.ts'
import { cachedGate, closePhase, formatItems, gate, prReviewGate } from './gate.ts'
import { hasProfile, loadProfile, log, normalizeProfile, saveProfile, today } from './profile.ts'
import { linkClaudeMd, renderBrief, writeBrief, writeStackAdrs } from './render.ts'
import { counts, formatCheck, formatProposal } from './report.ts'
import { recordReport, reportState } from './security.ts'
import { missingSignals } from './signals.ts'
import { globToRegExp } from './files.ts'
import { verifyItems } from './verify.ts'
import { gapReport, inferProfile } from './audit.ts'
import { parseMarkdown, toDocx, toPdf } from './docs.ts'
import { exportData, recordExport } from './export.ts'
import { checkCodemap, checkRegistry, writeCodemap, writeRegistry } from './maps.ts'
import { calibrate, formatClient, formatInternal, loadRates, logTime, quote, saveQuote } from './quote.ts'
import type { Range } from './quote.ts'
import { applyUpdate, catalogUpdates } from './update.ts'
import { QUALITY_DEFAULTS } from './quality.ts'
import type { QualityKey } from './quality.ts'
import { LEVEL_ICON } from './types.ts'
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

const fmtRange = (r: Range, unit: string) => `${r[0].toLocaleString('en-US')}–${r[1].toLocaleString('en-US')} ${unit}`
const signed = (r: Range, unit: string) => `${r[0] >= 0 ? '+' : ''}${r[0].toLocaleString('en-US')} a ${r[1] >= 0 ? '+' : ''}${r[1].toLocaleString('en-US')} ${unit}`

/**
 * The quote toggle: it runs by itself only when the scope is defined (init) or changes (add --apply).
 * Never on check, phase close or hooks. The internal quote is saved outside the repo.
 */
function quoteOnScopeChange(profile: Profile, catalog: Catalog): string {
  const { rates, created, configured } = loadRates()
  const q = quote(profile, catalog, rates)
  if (!configured) return `Esfuerzo estimado: ${fmtRange(q.total, 'h')}.${created ? ' Se creó ~/.config/mep-check/rates.yaml:' : ''} Define hourly_rate en ~/.config/mep-check/rates.yaml para ver precios.`
  saveQuote(profile, q, rates)
  return `Cotización: ${fmtRange(q.total, 'h')} · ${fmtRange(q.price, q.currency)} (interna guardada fuera del repo; /mep:quote para el detalle).`
}

/** Closes, in order, every sub-phase whose required items already pass (adopting mep in an existing repo). */
function closePassingPhases(root: string, catalog: Catalog): string[] {
  const closed: string[] = []
  for (const sub of catalog.dimensions.phases) {
    const r = closePhase(root, catalog, sub)
    if (!r.closed) break
    closed.push(sub)
  }
  return closed
}

/** Installs the Playwright responsive test (360–2560 px) and its script, without touching what exists. */
function installResponsiveTest(root: string, catalog: Catalog): string | undefined {
  const target = join(root, 'tests', 'responsive.spec.ts')
  if (existsSync(target)) return undefined
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, readFileSync(join(pluginRoot(catalog), 'templates', 'tests', 'responsive.spec.ts'), 'utf8'))
  const pkgFile = join(root, 'package.json')
  if (existsSync(pkgFile)) {
    const text = readFileSync(pkgFile, 'utf8')
    const pkg = JSON.parse(text) as { scripts?: Record<string, string> }
    if (!pkg.scripts?.['test:responsive']) {
      pkg.scripts = { ...pkg.scripts, 'test:responsive': 'playwright test tests/responsive.spec.ts' }
      const indent = text.match(/^\{\n([ \t]+)/)?.[1] ?? '  '
      writeFileSync(pkgFile, JSON.stringify(pkg, null, indent) + '\n')
    }
  }
  return 'tests/responsive.spec.ts'
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
      if (prToMain(command)) {
        const review = prReviewGate(cwd)
        if (review.block) json({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: review.message } })
        return
      }
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
      const responsive = installResponsiveTest(root, catalog)
      log(root, 'init', `${profile.type} (${profile.capabilities.join(',')})`)
      const closed = args.flags['close-passing'] ? closePassingPhases(root, catalog) : []
      if (closed.length) regenerate(root, loadProfile(root, catalog), catalog)
      return print(
        [
          `✅ .mep/profile.yaml y BRIEF.md creados. ADRs: ${adrs.length}. CLAUDE.md ${linked ? 'enlazado' : 'ya estaba enlazado'}. CI: .github/workflows/mep.yml.`,
          responsive ? `Test responsive: ${responsive} (requiere @playwright/test; edita PAGES con las rutas clave).` : '',
          closed.length ? `Sub-etapas ya cumplidas y cerradas: ${closed.join(', ')}.` : '',
          quoteOnScopeChange(loadProfile(root, catalog), catalog),
        ]
          .filter(Boolean)
          .join('\n'),
      )
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
      // Impact of the change in hours and price, shown before accepting.
      const { rates, configured } = loadRates()
      const qa = quote(before, catalog, rates)
      const qb = quote(after, catalog, rates)
      const impact = `Impacto: ${signed([qb.total[0] - qa.total[0], qb.total[1] - qa.total[1]], 'h')}${configured ? ` · ${signed([qb.price[0] - qa.price[0], qb.price[1] - qa.price[1]], qb.currency)}` : ''}`
      if (args.flags.apply) {
        saveProfile(root, after)
        regenerate(root, after, catalog)
        writeStackAdrs(root, after, catalog)
        log(root, 'add', changes.map(c => `${c.change}:${c.id}`).join(','))
        return print(`${text}\n${impact}\n\n✅ Perfil actualizado y BRIEF.md regenerado.\n${quoteOnScopeChange(after, catalog)}`)
      }
      return print(`${text}\n${impact}`)
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
    case 'pr-gate': {
      const review = prReviewGate(root)
      if (review.message) print(review.message)
      process.exitCode = review.block ? 1 : 0
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
    case 'threshold': {
      const [key, valueText, ...reasonParts] = rest
      const keys = Object.keys(QUALITY_DEFAULTS)
      if (!key || !keys.includes(key) || !(Number(valueText) > 0)) fail(`Uso: mep threshold <${keys.join('|')}> <valor> [razón --yes]`)
      const value = Number(valueText)
      const reason = reasonParts.join(' ').trim()
      const profile = requireProfile(root, catalog)
      const laxer = value > QUALITY_DEFAULTS[key as QualityKey]
      if (laxer && !reason) fail(`Relajar ${key} a ${value} (por defecto ${QUALITY_DEFAULTS[key as QualityKey]}) requiere una razón.`)
      if (laxer && !args.flags.yes) fail(`Relajar ${key} requiere confirmación explícita (--yes).`, 2)
      profile.quality = { ...profile.quality, [key]: value }
      const id = `threshold:${key}`
      profile.selections.overrides = profile.selections.overrides.filter(o => o.id !== id)
      if (laxer) profile.selections.overrides.push({ id, reason: `${key} = ${value} (por defecto ${QUALITY_DEFAULTS[key as QualityKey]}): ${reason}`, date: today() })
      saveProfile(root, profile)
      log(root, 'threshold', `${key}=${value}${laxer ? ` "${reason}"` : ''}`)
      regenerate(root, profile, catalog)
      return print(laxer ? `⚠️ ${key} relajado a ${value} (registrado en .mep/log y en BRIEF.md)` : `✅ ${key} = ${value}`)
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
    case 'audit': {
      // Step 1: infer the profile. Step 3 (with --from): gap report against the confirmed profile. Writes nothing.
      if (!args.flags.from) {
        const { profile, evidence } = inferProfile(root, catalog)
        if (args.flags.json) return json({ profile, evidence })
        const { phase, selections, version, catalog_version, ...shown } = profile
        return print(`${stringify(shown, { lineWidth: 0 }).trim()}\n\nEvidencia:\n${Object.entries(evidence).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`)
      }
      const profile = proposedProfile(args, catalog)
      const results = gapReport(root, profile, catalog)
      const c = counts(results)
      if (args.flags.json) return json({ counts: c, results: results.map(r => ({ id: r.item.id, level: r.level, phase: r.item.phase, status: r.status })) })
      const passing = catalog.dimensions.phases.filter(p => results.every(r => r.item.phase !== p || r.level !== 'required' || r.status === 'pass'))
      return print(
        [
          `Reporte de brecha (nada se bloquea hasta adoptar el brief)`,
          formatCheck(results, profile, catalog),
          `\nPendientes: 🔴 ${c.required} · 🟡 ${c.recommended}`,
          passing.length ? `Sub-etapas que ya cumplen sus 🔴: ${passing.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
    }
    case 'update': {
      const profile = requireProfile(root, catalog)
      const updates = catalogUpdates(profile, catalog)
      if (args.flags.json) return json(updates.map(u => ({ id: u.item.id, change: u.change, level: u.level, phase: u.item.phase, inClosedPhase: u.inClosedPhase })))
      if (!updates.length && profile.catalog_version === catalog.version) return print(`Catálogo al día (${catalog.version}).`)
      const list = updates.map(u => `${u.change === 'new' ? '＋' : '✎'} ${LEVEL_ICON[u.level]} ${u.item.id} (${u.item.phase}${u.inClosedPhase ? ', sub-etapa cerrada' : ''}) — ${u.item.title}`)
      const head = `Catálogo ${profile.catalog_version} → ${catalog.version}: ${updates.length} ítem(s) nuevos o modificados que aplican a este perfil.`
      if (!args.flags.apply) return print([head, ...list].join('\n'))
      const { profile: next, graced } = applyUpdate(profile, catalog)
      saveProfile(root, next)
      regenerate(root, next, catalog)
      log(root, 'update', `${profile.catalog_version}->${catalog.version} grace:${graced.join(',')}`)
      return print([head, ...list, '', `✅ Perfil en catálogo ${catalog.version}.`, graced.length ? `Periodo de gracia (no bloquean hasta el siguiente cierre o el deploy a producción): ${graced.join(', ')}` : ''].filter(Boolean).join('\n'))
    }
    case 'registry': {
      if (args.flags.check) {
        const errors = checkRegistry(root)
        print(errors.length ? `❌ REGISTRY.md desactualizado:\n${errors.map(e => `  - ${e}`).join('\n')}` : '✅ REGISTRY.md al día')
        process.exitCode = errors.length ? 1 : 0
        return
      }
      const r = writeRegistry(root)
      return print(`REGISTRY.md: ${r.entries} piezas${r.undocumented ? `, ${r.undocumented} sin "Para qué" (escríbelo en su comentario /** */)` : ''}.`)
    }
    case 'codemap': {
      if (args.flags.check) {
        const errors = checkCodemap(root)
        print(errors.length ? `❌ ${errors.join('\n')}` : '✅ CODEMAP.md al día')
        process.exitCode = errors.length ? 1 : 0
        return
      }
      writeCodemap(root, catalog)
      return print('CODEMAP.md regenerado (las notas manuales se conservan).')
    }
    case 'quote': {
      const profile = requireProfile(root, catalog)
      const { rates, created, configured } = loadRates()
      const q = quote(profile, catalog, rates)
      if (args.flags.json) return json(args.flags.client ? { byPhase: q.byPhase, total: q.price, extras: q.extrasPrice, recurring: q.recurring, maintenance: q.maintenance, currency: q.currency } : q)
      if (args.flags.save && configured) saveQuote(profile, q, rates)
      const warn = configured ? '' : `\n\n⚠️ hourly_rate es 0${created ? ' (se creó la plantilla)' : ''}: define tu tarifa en ~/.config/mep-check/rates.yaml.`
      return print((args.flags.client ? formatClient(q) : formatInternal(q, rates, catalog.dimensions.phases)) + warn)
    }
    case 'log-time': {
      const [id, hoursText] = rest
      const hours = Number(hoursText)
      if (!id || !(hours > 0)) fail('Uso: mep log-time <id> <horas>')
      const profile = requireProfile(root, catalog)
      if (!catalog.items.some(i => i.id === id) && !id.startsWith('custom:')) fail(`${id} no es un ítem del catálogo (para trabajo a la medida usa custom:<nombre>)`)
      logTime(profile, id, hours)
      const item = catalog.items.find(i => i.id === id)
      return print(`⏱️ ${id}: ${hours} h registradas fuera del repo.${item ? ` Rango del catálogo: ${item.effort.hours[0]}–${item.effort.hours[1]} h.` : ''}`)
    }
    case 'calibrate': {
      const suggestions = calibrate(catalog)
      if (args.flags.json) return json(suggestions)
      return print(
        suggestions.length
          ? ['Sugerencias de ajuste (mediana fuera del rango, 3+ mediciones):', ...suggestions.map(s => `  ${s.id}: ${s.current[0]}–${s.current[1]} h → ${s.suggested[0]}–${s.suggested[1]} h (mediana ${s.median} h, ${s.samples} mediciones)`)].join('\n')
          : 'Sin sugerencias: faltan mediciones o los rangos ya coinciden con las horas reales.',
      )
    }
    case 'export-data': {
      const profile = requireProfile(root, catalog)
      const { rates, configured } = loadRates()
      return json(exportData(root, profile, catalog, String(args.flags.lang ?? 'es'), quote(profile, catalog, rates), configured))
    }
    case 'export': {
      const profile = requireProfile(root, catalog)
      const input = args.flags.in as string | undefined
      if (!input || !existsSync(join(root, input))) fail('Uso: mep export --in docs/client/brief-vN.md [--format docx|pdf|both] [--lang es]')
      const format = String(args.flags.format ?? 'both')
      const blocks = parseMarkdown(readFileSync(join(root, input), 'utf8'))
      const base = join(root, dirname(input), basename(input).replace(/\.md$/, ''))
      const files: string[] = []
      if (format === 'docx' || format === 'both') {
        writeFileSync(`${base}.docx`, toDocx(blocks))
        files.push(`${base}.docx`.slice(root.length + 1))
      }
      if (format === 'pdf' || format === 'both') {
        writeFileSync(`${base}.pdf`, toPdf(blocks))
        files.push(`${base}.pdf`.slice(root.length + 1))
      }
      const { rates, configured } = loadRates()
      const fromName = basename(input).match(/-v(\d+)\.md$/)?.[1]
      const record = recordExport(root, profile, catalog, String(args.flags.lang ?? 'es'), files, configured ? quote(profile, catalog, rates).price : undefined, fromName ? Number(fromName) : undefined)
      return print(`📄 Brief v${record.version} para el cliente: ${files.join(', ')}`)
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
          '  threshold <complexity|max_lines|max_function_lines> <valor> [razón --yes]',
          '  security [record --id --result --files --notes]',
          '  audit [--from perfil.yaml]                            infiere el perfil / reporte de brecha (no escribe nada)',
          '  update [--apply]                                      ítems nuevos del catálogo que aplican',
          '  registry [--check] · codemap [--check]                mapas de referencia',
          '  quote [--client] [--save] · log-time <id> <horas> · calibrate',
          '  export-data [--lang es] · export --in <md> [--format docx|pdf|both]',
          '  render · status · signals · presets · version',
          '  hook <session-start|stop|pre-bash|post-edit>          hooks clásicos (stdin JSON)',
        ].join('\n'),
      )
      if (cmd) process.exitCode = 1
  }
}

main()
