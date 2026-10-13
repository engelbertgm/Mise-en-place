import { evaluate } from './evaluate.ts'
import { listFiles, matchFiles, readText } from './files.ts'
import { dependencies, detectFramework, routes } from './framework.ts'
import { normalizeProfile } from './profile.ts'
import { detectCapabilities, detectSignals } from './signals.ts'
import type { Catalog, ItemResult, Profile } from './types.ts'
import { verifyItems } from './verify.ts'

export type Inference = { profile: Profile; evidence: Record<string, string> }

const INTEGRATION_DEPS = /^(stripe|@stripe\/|resend|@sendgrid|postmark|@supabase\/|@clerk\/|algoliasearch|meilisearch|@vercel\/(blob|analytics|kv)|posthog|mixpanel|@sentry\/|openai|@anthropic-ai\/|uploadthing|pusher|ably|mapbox|@react-google-maps|twilio|@upstash\/|sanity|contentful|@mux\/)/

/** Main data models: tables in SQL migrations, or Prisma models. */
function countEntities(root: string): number {
  const tables = new Set<string>()
  for (const f of matchFiles(root, '**/*.sql')) {
    for (const m of (readText(root, f) ?? '').matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?public"?\.)?"?(\w+)"?/gi)) tables.add(m[1].toLowerCase())
  }
  for (const f of matchFiles(root, '**/*.prisma')) {
    for (const m of (readText(root, f) ?? '').matchAll(/^model\s+(\w+)/gm)) tables.add(m[1].toLowerCase())
  }
  return tables.size
}

function countLanguages(root: string): number {
  const locales = new Set<string>()
  for (const f of listFiles(root)) {
    const m = f.match(/(?:^|\/)(?:locales|messages|i18n|lang)\/([a-z]{2}(?:[-_][A-Z]{2})?)(?:\.json|\/)/)
    if (m) locales.add(m[1].slice(0, 2))
  }
  return Math.max(1, locales.size)
}

/** Picks the type from what the code does: a guess the person confirms or corrects. */
function guessType(caps: Set<string>, pages: number, files: string[]): string {
  if (caps.has('payments') && caps.has('ugc')) return 'marketplace'
  if (caps.has('subscriptions') || (caps.has('auth') && caps.has('payments'))) return 'saas'
  if (caps.has('payments')) return 'ecommerce'
  if (files.some(f => /(^|\/)(booking|bookings|reservas|appointments|citas)(\/|\.)/.test(f))) return 'booking'
  if (caps.has('auth')) return 'internal-app'
  if (files.some(f => /(^|\/)(blog|posts)\//.test(f))) return 'blog'
  return pages <= 2 ? 'landing' : 'corporate'
}

/** /mep:audit, step 1: infer a profile from the code, with the evidence for each guess. */
export function inferProfile(root: string, catalog: Catalog): Inference {
  const evidence: Record<string, string> = {}
  const caps = detectCapabilities(root, catalog)
  for (const [k, v] of Object.entries(caps)) evidence[`capabilities.${k}`] = v
  const signals = detectSignals(root, catalog)
  for (const [k, v] of Object.entries(signals)) evidence[`signals.${k}`] = v
  const framework = detectFramework(root)
  evidence.framework = framework
  const pageRoutes = routes(root, framework).filter(r => !/\.(txt|xml|webmanifest)$/.test(r) && !['/404', '/500'].includes(r) && !r.startsWith('/api'))
  const files = listFiles(root)
  const capSet = new Set(Object.keys(caps))
  const type = guessType(capSet, pageRoutes.length, files)
  evidence.type = `${capSet.size} capacidades, ${pageRoutes.length} páginas`
  const integrations = [...dependencies(root)].filter(d => INTEGRATION_DEPS.test(d))
  const deps = dependencies(root)
  const stack: Record<string, string> = {}
  if (framework !== 'static') stack.framework = framework
  if (deps.has('@supabase/supabase-js')) Object.assign(stack, { db: 'postgresql', db_provider: 'supabase' })
  else if (deps.has('pg') || deps.has('postgres') || deps.has('@neondatabase/serverless')) stack.db = 'postgresql'
  if (capSet.has('payments') && deps.has('stripe')) stack.payments = 'stripe'
  else if (capSet.has('payment-links')) stack.payments = 'payment-links'
  if (files.some(f => f === 'vercel.json' || f.startsWith('.vercel/'))) stack.hosting = 'vercel'
  const raw: Partial<Profile> = {
    project: (readText(root, 'package.json') ?? '').match(/"name"\s*:\s*"([^"]+)"/)?.[1] ?? 'proyecto',
    type,
    capabilities: [...capSet].filter(c => catalog.dimensions.capabilities.includes(c)).sort(),
    signals: Object.fromEntries(Object.keys(signals).map(k => [k, true])),
    counts: { pages: Math.max(1, pageRoutes.length), entities: countEntities(root), languages: countLanguages(root), integrations: integrations.length },
    stack: { decided: stack },
  }
  return { profile: normalizeProfile(raw, catalog), evidence }
}

/** /mep:audit, step 3: every check against the confirmed profile, without saving anything. */
export function gapReport(root: string, profile: Profile, catalog: Catalog): ItemResult[] {
  return verifyItems(root, profile, evaluate(profile, catalog), 'full').filter(r => r.state === 'active')
}
