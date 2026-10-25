import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { stack, stackGroups } from './evaluate.ts'
import { applicability } from './explain.ts'
import { marketLocales } from './profile.ts'
import type { Catalog, Evaluated, Profile } from './types.ts'

export const SCOPE_FILE = 'SCOPE.md'

type Labels = Record<'type' | 'capabilities' | 'audience' | 'context' | 'signals' | 'markets', Record<string, string>>

function labels(catalog: Catalog): Labels {
  const file = join(catalog.dir, 'labels.yaml')
  return (existsSync(file) ? parse(readFileSync(file, 'utf8')) : {}) as Labels
}

function market(m: string, l: Labels): string {
  const [parent, sub] = m.split(':')
  return sub ? `${l.markets?.[parent] ?? parent} · ${sub}` : (l.markets?.[m] ?? m)
}

const bullets = (xs: string[], empty = '—') => (xs.length ? xs.map(x => `- ${x}`).join('\n') : empty)

/** Capabilities a reader might assume are included when they are not, by project type. */
const OFTEN_ASSUMED: Record<string, string[]> = {
  landing: ['auth', 'payments', 'payment-links', 'cms', 'i18n', 'newsletter', 'analytics'],
  corporate: ['cms', 'i18n', 'auth', 'newsletter', 'search'],
  'local-business': ['payments', 'payment-links', 'cms', 'i18n'],
  blog: ['cms', 'newsletter', 'search', 'i18n'],
  portfolio: ['cms', 'i18n'],
  ecommerce: ['subscriptions', 'search', 'i18n', 'ugc', 'notifications'],
  saas: ['admin-panel', 'notifications', 'i18n', 'api-public', 'ai-features'],
  marketplace: ['subscriptions', 'realtime', 'i18n'],
  'internal-app': ['notifications', 'search', 'realtime'],
  directory: ['search', 'ugc', 'maps', 'payments'],
  booking: ['payments', 'payment-links', 'notifications', 'i18n'],
}

/** SCOPE.md: what the project is and is not, in plain words. Generated from the profile, like BRIEF.md. */
export function renderScope(profile: Profile, evaluated: Evaluated[], catalog: Catalog): string {
  const l = labels(catalog)
  const app = applicability(profile, catalog)
  const signals = Object.entries(profile.signals).filter(([k, v]) => v === true && k !== 'db_client_access' || (k === 'db_client_access' && v === true))
  const notIncluded = (OFTEN_ASSUMED[profile.type] ?? []).filter(c => !profile.capabilities.includes(c))
  const offered = evaluated.filter(e => e.state === 'offered').map(e => e.item.title)
  const chosen = evaluated.filter(e => e.state === 'active' && e.level === 'optional').map(e => e.item.title)
  const locales = marketLocales(profile, catalog)
  const counts = profile.counts
  const missing = [
    !profile.markets.length && 'mercados (definen idiomas, legales y moneda)',
    !profile.audience.length && 'audiencia (consumidores, empresas, menores, datos sensibles)',
    counts.pages === undefined && 'número aproximado de páginas',
  ].filter(Boolean) as string[]
  const required = evaluated.filter(e => e.state === 'active' && e.level === 'required')
  const legal = required.filter(e => e.item.category === 'legal').map(e => e.item.title)
  const out = [
    `<!-- Generado por mep desde .mep/profile.yaml. No editar a mano: el scope se cambia con /mep:add. -->`,
    `# Scope — ${profile.project}`,
    '',
    profile.summary ? `${profile.summary}\n` : '',
    '## Qué es',
    `- **Tipo:** ${l.type?.[profile.type] ?? profile.type}`,
    `- **Para quién:** ${profile.audience.map(a => l.audience?.[a] ?? a).join(', ') || 'por definir'}`,
    `- **Contexto:** ${l.context?.[profile.context] ?? profile.context}`,
    `- **Mercados:** ${profile.markets.map(m => market(m, l)).join(', ') || 'por definir'}${locales.length ? ` · idiomas: ${locales.join(', ')}` : ''}`,
    `- **Tamaño:** ${[counts.pages && `~${plural(counts.pages, 'página', 'páginas')}`, counts.entities && plural(counts.entities, 'tipo de datos', 'tipos de datos'), counts.integrations && plural(counts.integrations, 'integración', 'integraciones')].filter(Boolean).join(' · ') || 'por definir'}`,
    '',
    '## Qué incluye',
    bullets(profile.capabilities.map(c => l.capabilities?.[c] ?? c), '- Sitio informativo, sin funcionalidades adicionales'),
    ...(profile.custom_work?.length ? ['', '**Trabajo a la medida:**', bullets(profile.custom_work.map(c => c.title))] : []),
    ...(chosen.length ? ['', '**Opcionales elegidos:**', bullets(chosen)] : []),
    '',
    '## Hechos del proyecto',
    bullets(signals.map(([k]) => l.signals?.[k] ?? k)),
    '',
    '## Qué no incluye',
    bullets([
      ...notIncluded.map(c => l.capabilities?.[c] ?? c),
      ...(profile.signals.has_db ? [] : ['Base de datos propia (no hay datos que guardar)']),
    ]),
    ...(offered.length ? ['', `**Opcionales disponibles, no elegidos:** ${offered.length} (ver BRIEF.md).`] : []),
    '',
    '## Tecnología',
    bullets(stackGroups(stack(profile, catalog)).map(g => `${g.decisions.map(d => `${d.key}: ${d.value}`).join(', ')} — ${g.why}`)),
    '',
    '## Lo que exige este scope',
    `Aplican **${app.applies} de ${app.total}** reglas de mep: 🔴 ${plural(app.byLevel.required, 'obligatoria', 'obligatorias')} · 🟡 ${plural(app.byLevel.recommended, 'recomendada', 'recomendadas')} · ⚪ ${plural(app.byLevel.optional, 'opcional', 'opcionales')}. ${app.notApplying.length === 1 ? 'La otra no aplica' : `Las otras ${app.notApplying.length} no aplican`} a este scope (\`mep explain <id>\` dice por qué). El detalle está en BRIEF.md.`,
    ...(legal.length ? ['', '**Legales y de cumplimiento obligatorios:**', bullets(legal)] : []),
    '',
    '## Fase actual',
    `${profile.phase.active}${profile.phase.closed.length ? ` (cerradas: ${profile.phase.closed.join(', ')})` : ''}`,
    ...(missing.length ? ['', '## Por definir', bullets(missing)] : []),
    '',
    '> Checklist orientativo, no sustituye asesoría legal.',
    '',
  ]
  return out.filter((line, i, all) => !(line === '' && all[i - 1] === '')).join('\n')
}

export function writeScope(root: string, content: string): void {
  writeFileSync(join(root, SCOPE_FILE), content)
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
