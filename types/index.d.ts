// mep mod: the values its panel draws from (session state, outlives a reload).

export type PanelItem = {
  id: string
  title: string
  level: 'required' | 'recommended' | 'optional'
  phase: string
  state: 'active' | 'skipped' | 'overridden' | 'offered'
  status: 'pass' | 'fail' | 'unknown'
  category: string
  locked: boolean
  manual: boolean
  why: string
  how: string
  detail: string
  all: string[]
}

export type Panel = {
  phases: string[]
  active: string
  closed: string[]
  counts: { required: number; recommended: number }
  items: PanelItem[]
  /** true after "Verificar todo" (commands and build checks ran); false for the quick check of every turn. */
  full: boolean
}

/** A 🔴 the person asked to turn off, waiting for the second press. */
export type PendingOverride = { id: string; reason: string }

declare module 'claude-code' {
  interface PluginState {
    mep: {
      panel: Shaped<Panel | null>
      selected: Shaped<string | null>
      expanded: Shaped<string[]>
      pending: Shaped<PendingOverride | null>
      flash: Shaped<string>
      tools: Shaped<boolean>
    }
  }
}
