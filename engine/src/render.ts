import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stack, stackGroups, warnings } from './evaluate.ts'
import type { StackDecision } from './evaluate.ts'
import type { Catalog, Check, Evaluated, ItemResult, Profile } from './types.ts'
import { LEVEL_ICON } from './types.ts'
import { marketLocales } from './profile.ts'

export const BRIEF_FILE = 'BRIEF.md'
export const ADR_DIR = 'docs/decisions'
const LEGAL_NOTE = '> Checklist orientativo, no sustituye asesoría legal.'

function describeCheck(c: Check): string {
  switch (c.type) {
    case 'file_exists':
      return `existe ${Array.isArray(c.path) ? c.path.join(' o ') : c.path}`
    case 'route_exists':
      return `ruta ${c.path}`
    case 'grep':
      return `${c.expect === 'absent' ? 'sin' : 'contiene'} /${c.pattern}/ en ${c.glob}`
    case 'json_key':
      return `${c.file} → ${c.key}${c.value !== undefined ? ` = ${JSON.stringify(c.value)}` : ''}`
    case 'command':
      return `\`${c.run}\` sale con 0`
    case 'html':
      return `HTML del build: ${c.rule}${c.name ?? c.property ?? c.rel ? ` ${c.name ?? c.property ?? c.rel}` : ''}`
    case 'sql':
      return `migraciones SQL: ${c.rule}`
    case 'maps':
      return c.rule === 'registry' ? 'REGISTRY.md al día (mep registry --check)' : 'CODEMAP.md al día'
    case 'quality':
      return c.rule === 'python' ? 'Ruff con los umbrales del perfil en pyproject.toml' : 'umbrales de complejidad y largo en la config del linter'
    case 'build':
      return { max_js_chunk: `JS por archivo ≤ ${c.max_kb ?? 200} KB gzip`, no_source_maps: 'sin source maps públicos', server_rendered: 'HTML renderizado en servidor o build' }[c.rule]
    case 'robots':
      return 'robots.txt no bloquea buscadores ni asistentes de IA'
    case 'design':
      return `${c.rule === 'font_families' ? 'familias tipográficas' : 'pesos de texto'} ≤ ${c.max}`
    case 'live':
      return { headers: `el sitio envía ${(c.names ?? []).join(', ')}`, hsts: 'el sitio envía HSTS ≥ 180 días', compression: 'el sitio sirve con Brotli/gzip y assets con caché inmutable', cookies: 'las cookies del sitio llevan Secure, SameSite y HttpOnly', error_page: 'una ruta inexistente da 404 sin detalles internos', canonical_redirect: 'http:// y www redirigen al dominio canónico', sitemap: 'el sitemap lista solo páginas públicas e indexables', reachable: 'el sitio desplegado responde' }[c.rule]
    case 'dns':
      return `DNS: ${c.rule.toUpperCase()}`
    case 'plan':
      return `docs/plan: ${c.doc} (${c.rule})`
    case 'manual':
      return `manual: ${c.prompt}`
  }
}

function checkbox(e: Evaluated, results?: Map<string, ItemResult>): string {
  const r = results?.get(e.item.id)
  return r?.status === 'pass' ? '[x]' : '[ ]'
}

function line(e: Evaluated, results?: Map<string, ItemResult>): string {
  const lock = e.item.locked ? ' 🔒' : ''
  const verify = e.item.verify.map(describeCheck).join(' · ')
  return `- ${checkbox(e, results)} \`${e.item.id}\`${lock} — ${e.item.title} — ${verify}`
}

function profileSection(p: Profile, locales: string[]): string {
  const signals = Object.entries(p.signals)
    .filter(([, v]) => v !== false)
    .map(([k, v]) => (v === true ? k : `${k}=${v}`))
  return [
    `- **Tipo:** ${p.type}${p.preset ? ` (preset ${p.preset})` : ''}`,
    `- **Capacidades:** ${p.capabilities.join(', ') || '—'}`,
    `- **Mercados:** ${p.markets.join(', ') || '—'}${locales.length ? ` · idiomas: ${locales.join(', ')}` : ''}`,
    `- **Audiencia:** ${p.audience.join(', ') || '—'}`,
    `- **Contexto:** ${p.context}`,
    `- **Señales:** ${signals.join(', ') || '—'}`,
    `- **Conteos:** ${Object.entries(p.counts).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}`,
  ].join('\n')
}

function stackSection(decisions: StackDecision[]): string {
  if (!decisions.length) return '_Sin decisiones de stack._'
  return stackGroups(decisions)
    .map(g => `- ${g.decisions.map(d => `**${d.key}:** ${d.value}${d.decided ? '' : ' _(recomendado)_'}`).join(' · ')} — ${g.why}`)
    .join('\n')
}

export function renderBrief(profile: Profile, evaluated: Evaluated[], catalog: Catalog, results?: ItemResult[]): string {
  const byId = results ? new Map(results.map(r => [r.item.id, r])) : undefined
  const out: string[] = [
    `<!-- Generado por mep desde .mep/profile.yaml (catálogo ${profile.catalog_version}). No editar a mano: usa /mep:add, /mep:skip, /mep:override. -->`,
    `# Brief — ${profile.project}`,
    '',
    '> El resumen del scope en lenguaje claro está en [SCOPE.md](SCOPE.md).',
    '',
    '## Perfil',
    profileSection(profile, marketLocales(profile, catalog)),
    '',
    '## Stack (decisión + por qué)',
    stackSection(stack(profile, catalog)),
    '',
    '## Fase actual',
    `- **Cerradas:** ${profile.phase.closed.join(', ') || '—'}`,
    `- **Activa:** ${profile.phase.active}`,
    '',
    '## Checklist',
  ]
  for (const phase of catalog.dimensions.phases) {
    const inPhase = evaluated.filter(e => e.item.phase === phase && e.state === 'active')
    if (!inPhase.length) continue
    const mark = profile.phase.closed.includes(phase) ? ' ✅' : phase === profile.phase.active ? ' ← activa' : ''
    out.push('', `### ${phase}${mark}`)
    for (const level of ['required', 'recommended', 'optional'] as const) {
      const items = inPhase.filter(e => e.level === level)
      if (!items.length) continue
      const label = { required: 'Obligatorios', recommended: 'Recomendados', optional: 'Opcionales elegidos' }[level]
      out.push('', `#### ${LEVEL_ICON[level]} ${label}`, ...items.map(e => line(e, byId)))
    }
  }
  const skipped = evaluated.filter(e => e.state === 'skipped')
  const overridden = evaluated.filter(e => e.state === 'overridden')
  out.push('', '### ⏭️ Omitidos (🟡, con razón)', skipped.length ? skipped.map(e => `- \`${e.item.id}\` — ${e.reason}`).join('\n') : '—')
  const relaxed = profile.selections.overrides.filter(o => o.id.startsWith('threshold:'))
  const disabled = [...overridden.map(e => `- ⚠️ \`${e.item.id}\` — ${e.reason}`), ...relaxed.map(o => `- ⚠️ umbral \`${o.id.slice(10)}\` — ${o.reason}`)]
  out.push('', '### ⚠️ Desactivados (🔴 con override, con razón)', disabled.length ? disabled.join('\n') : '—')
  const warns = warnings(evaluated)
  if (warns.length) out.push('', '### Avisos', ...warns.map(w => `- ${w.message}`))
  out.push('', '## Costos recurrentes estimados', '_Se completan con /mep:quote (hosting, dominio, servicios)._')
  const refs = evaluated.filter(e => e.state === 'active' && e.item.category === 'legal' && e.item.references?.length)
  out.push('', '## Notas legales', LEGAL_NOTE)
  for (const e of refs) out.push(`- \`${e.item.id}\`: ${e.item.references!.join(' · ')}`)
  return out.join('\n') + '\n'
}

export function writeBrief(root: string, content: string): void {
  writeFileSync(join(root, BRIEF_FILE), content)
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** One ADR per stack rule. A changed decision gets a new ADR that supersedes the old one; nothing is deleted. */
export function writeStackAdrs(root: string, profile: Profile, catalog: Catalog): string[] {
  const dir = join(root, ADR_DIR)
  mkdirSync(dir, { recursive: true })
  const existing = readdirSync(dir).filter(f => /^\d{4}-.*\.md$/.test(f)).sort()
  const written: string[] = []
  let next = existing.length ? Number(existing[existing.length - 1].slice(0, 4)) + 1 : 1
  for (const g of stackGroups(stack(profile, catalog))) {
    const decision = g.decisions.map(d => `${d.key}: ${d.value}`).join(', ')
    const base = `stack-${slug(g.rule)}`
    const previous = existing.filter(f => f.slice(5).startsWith(base)).pop()
    if (previous && readFileSync(join(dir, previous), 'utf8').includes(`**Decisión:** ${decision}\n`)) continue
    const file = `${String(next++).padStart(4, '0')}-${base}.md`
    const alternatives = catalog.stackRules.find(r => r.id === g.rule)?.alternatives ?? []
    writeFileSync(
      join(dir, file),
      [
        `# Stack: ${decision}`,
        '',
        `- **Estado:** aceptada${previous ? ` (reemplaza a ${previous})` : ''}`,
        `- **Fecha:** ${new Date().toISOString().slice(0, 10)}`,
        '',
        '## Contexto',
        `Perfil: ${profile.type}; capacidades: ${profile.capabilities.join(', ') || '—'}. Regla: ${g.rule}.`,
        '',
        '## Decisión',
        `**Decisión:** ${decision}`,
        '',
        g.why,
        '',
        '## Alternativas',
        alternatives.length ? alternatives.map(a => `- ${Object.entries(a).map(([k, v]) => `${k}: ${v}`).join(' — ')}`).join('\n') : '- —',
        '',
        '## Consecuencias',
        'Cambiarla requiere actualizar `.mep/profile.yaml`, regenerar el brief y un ADR nuevo que reemplace a este.',
        '',
      ].join('\n'),
    )
    written.push(file)
  }
  return written
}

const CLAUDE_MARKER = '<!-- mep -->'

/** Appends the mep block to CLAUDE.md once, keeping whatever was there. */
export function linkClaudeMd(root: string, template: string): boolean {
  const file = join(root, 'CLAUDE.md')
  const current = existsSync(file) ? readFileSync(file, 'utf8') : ''
  if (current.includes(CLAUDE_MARKER)) return false
  const block = `${CLAUDE_MARKER}\n${template.trim()}\n${CLAUDE_MARKER}\n`
  writeFileSync(file, current ? `${current.trimEnd()}\n\n${block}` : block)
  return true
}
