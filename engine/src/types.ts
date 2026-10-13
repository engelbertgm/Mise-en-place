export type Level = 'required' | 'recommended' | 'optional'

export const LEVEL_RANK: Record<Level, number> = { optional: 0, recommended: 1, required: 2 }
export const LEVEL_ICON: Record<Level, string> = { required: '🔴', recommended: '🟡', optional: '⚪' }

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | Leaf

export type Leaf = {
  type?: Matcher
  capabilities?: Matcher
  markets?: Matcher
  audience?: Matcher
  context?: Matcher
  signals?: Record<string, string | boolean>
}

/** A list means "contains all"; { any } / { all } / { none } are explicit. A scalar means "equals / contains". */
export type Matcher = string | string[] | { any?: string[]; all?: string[]; none?: string[] }

export type Check =
  | { type: 'file_exists'; path: string | string[] }
  | { type: 'route_exists'; path: string }
  | { type: 'grep'; pattern: string; glob: string; exclude?: string; expect?: 'present' | 'absent'; flags?: string }
  | { type: 'json_key'; file: string; key: string; value?: unknown }
  | { type: 'command'; run: string; timeout?: number }
  | { type: 'html'; rule: HtmlRule; name?: string; property?: string; rel?: string }
  | { type: 'sql'; rule: 'rls_enabled' | 'policies_per_operation'; glob?: string }
  | { type: 'maps'; rule: 'registry' | 'codemap' }
  | { type: 'quality'; rule: 'thresholds' }
  | { type: 'design'; rule: 'font_families' | 'font_weights'; max: number }
  | { type: 'manual'; prompt: string }

export type HtmlRule =
  | 'meta'
  | 'link'
  | 'html_lang'
  | 'charset'
  | 'unique_title'
  | 'unique_description'
  | 'single_h1'
  | 'heading_order'
  | 'absolute_og_image'
  | 'img_dimensions'
  | 'img_alt'
  | 'landmarks'
  | 'input_labels'
  | 'iframe_title'
  | 'skip_link'

export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL'
export type ScaleDim = 'pages' | 'entities' | 'languages' | 'markets' | 'integrations'

export type Item = {
  id: string
  title: string
  category: string
  level: Level
  phase: string
  locked?: boolean
  conflicts_with?: string[]
  since: string
  /** Catalog version of the last meaningful change (shown by /mep:update). */
  updated?: string
  effort: { size: Size; hours: [number, number]; scales_with?: ScaleDim }
  when?: Condition
  level_overrides?: { when: Condition; level: Level }[]
  depends_on?: string[]
  why: string
  how: string
  verify: Check[]
  references?: string[]
}

export type StackRule = {
  id: string
  when?: Condition
  recommend: Record<string, string>
  why: string
  alternatives?: Record<string, string>[]
}

export type Dimensions = {
  type: string[]
  capabilities: string[]
  markets: string[]
  market_sublevels: Record<string, string[]>
  market_languages: Record<string, string[]>
  audience: string[]
  context: string[]
  signals: Record<string, { values: (string | boolean)[]; default: string | boolean }>
  phases: string[]
  implies: Record<string, { signals?: Record<string, string | boolean>; capabilities?: string[] }>
}

export type Catalog = {
  version: string
  dir: string
  dimensions: Dimensions
  items: Item[]
  stackRules: StackRule[]
  presets: Record<string, Partial<Profile>>
  sensitivePaths: string[]
}

export type Profile = {
  version: 1
  catalog_version: string
  project: string
  phase: { closed: string[]; active: string }
  type: string
  capabilities: string[]
  markets: string[]
  audience: string[]
  context: string
  preset?: string
  counts: Partial<Record<ScaleDim, number>>
  signals: Record<string, string | boolean>
  selections: {
    optional_added: string[]
    recommended_skipped: { id: string; reason: string; date: string }[]
    overrides: { id: string; reason: string; date: string }[]
    manual_confirmed: { id: string; by: string; date: string }[]
    /** Items from /mep:update that landed in a closed sub-phase: they do not block until the next close or a production deploy. */
    grace: string[]
  }
  stack: { decided: Record<string, string> }
  /** Features of the scope that are not in the catalog; Claude sizes them and they show as "estimación a revisar". */
  custom_work?: { title: string; size: Size; phase?: string }[]
  /** Code quality thresholds (complexity, max_lines, max_function_lines). Laxer than the defaults needs a reason. */
  quality?: Partial<Record<'complexity' | 'max_lines' | 'max_function_lines', number>>
}

export type ItemState = 'active' | 'skipped' | 'overridden' | 'offered'

export type Evaluated = {
  item: Item
  level: Level
  state: ItemState
  reason?: string
}

export type CheckResult = { ok: boolean | null; detail: string; violation?: boolean }

export type ItemStatus = 'pass' | 'fail' | 'unknown'

export type ItemResult = Evaluated & {
  status: ItemStatus
  checks: { check: Check; result: CheckResult }[]
  /** A failing check that detects something present that must not be (secret, table without RLS). */
  violation: boolean
}
