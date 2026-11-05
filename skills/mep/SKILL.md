---
name: mep
description: How to work in a project that uses Mise en place (mep) — read a natural-language scope as a profile, use the item catalog and respect BRIEF.md. Use it when the project has .mep/profile.yaml or BRIEF.md, or when the user describes a new website or webapp.
user-invocable: false
---

# Mise en place (mep)

mep turns a scope into a **profile**, the profile into a **checklist** (🔴 required · 🟡 recommended · ⚪ optional) and checks the repo against it with a deterministic engine. You interpret and talk; the engine decides what applies and what is met. Never mark an item as done yourself.

Talk to the user in their own language (Spanish if they write Spanish). This file is in English only to save tokens; the project's files and the engine's messages stay as they are.

Engine: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" <command>` (from the project root). `help` lists the commands.

## Profile (`.mep/profile.yaml`)

Only values from `${CLAUDE_PLUGIN_ROOT}/catalog/dimensions.yaml`:

- `type` (one), `capabilities`, `markets` (with sub-levels: `USA:CA`, `CA:QC`, `EU:DE`), `audience`, `context` (`client-project` | `own-product`).
- `signals`: facts about the project (`has_forms`, `has_db`, `db_client_access`, `has_dates`, …). Capabilities turn some on by themselves (`auth` → forms, DB and personal data); you infer the rest from the description.
- `counts`: `pages`, `entities`, `languages`, `integrations` (they feed the quote). More than one language turns on `i18n`.
- `stack.decided`: only what the user decided explicitly; the rest is recommended by the rules in `catalog/stack-rules.yaml` with their reason.

Starting presets: `landing`, `corporate`, `ecommerce`, `saas`, `marketplace` (`catalog/presets/`). If the user does not choose, suggest the closest one.

## The catalog is a general guide: fit it to the scope

`type` is a label, not a recipe. Do not assume everything a typical SaaS, shop or landing has: read what *this* scope asks for and take from the catalog what fits it. In `/mep:scope`, `/mep:add` and `/mep:audit`, go through the applicable items domain by domain and decide for each: keep, not applicable (in `tailoring.not_applicable` with a one-line reason), applies differently (a note in `tailoring.notes`, in this scope's terms), or missing (capability, optional item, `custom_work`). If you are unsure, ask; do not guess. 🔒 items are never fitted out. The BRIEF shows the notes under each item and lists what did not fit, so later sessions build with the scope's reality, not the generic rule.

## Rules are activated by the scope

Every catalog rule has a condition (`when`) on the profile: it applies or not according to the project's scope, never by default. A landing without accounts gets no RLS rules; a site without cookies gets no banner. `explain <id>` shows the condition with ✓/✗ and why a rule applies or not. In an existing repo, the user gives the scope and the code is only evidence (`/mep:audit`).

## How to read a scope

1. Pick `type` and preset by what the product *is*, not how it is built.
2. Capabilities: only those the scope asks for or clearly implies ("charge a monthly fee" → `subscriptions`; "upload photos" → `uploads`).
   - Charging: `payment-links` if payment happens on the provider's page (Stripe Payment Links, buy button, Mercado Pago, Gumroad): no backend or database. `payments` only if the site creates the payment on its server, receives webhooks or stores orders. A landing that sells with a link is `payment-links`.
   - Database (`has_db`): only if something of its own must be stored (accounts, orders, bookings, user content). A contact form that sends email, a newsletter at the provider or payment links do **not** need a database. `auth`, `subscriptions`, `ugc` and `admin-panel` already imply it.
3. Signals: infer from verbs and objects ("bookings with a date" → `has_dates`; "list of clients" → `has_tables`; "delete projects" → `has_destructive_actions`; Supabase with queries from the browser → `db_client_access`).
4. Ask **only** what changes 🔴 items or the `counts`: markets, whether there are minors or sensitive data, client vs. own product, approximate number of pages, entities, languages and integrations. Group the questions (AskUserQuestion, at most 4).
5. Scale (`high_traffic`): only for `saas`, `marketplace`, `ecommerce`, `directory` and `booking`, and only if the scope does not say: are spikes or thousands of simultaneous users expected? If yes, it turns on load balancing, replicas, queues, consistency and the other systems-design items. For a small site do not ask: it stays `false`.

## Working rules in a project with mep

- **Guidelines, not tasks.** The `BRIEF.md` items are what the finished site must meet, and they are checked at the checkpoints (closing a sub-phase, `/mep:prelaunch`, `/mep:launch`, CI). While you build, **keep them in mind and do it right the first time**, as if told "make the site, considering accessibility and WCAG": use them to decide how you write the real thing. **Never create placeholders, throwaway sites, empty files or filler code to make a check pass**, and never build something that is later replaced just to meet a point: it burns work and does not improve the product. A pending item during construction is normal; if a point depends on something that does not exist yet, it is met when that is built. Do not walk the checklist item by item or launch audits (`mep-security`, reviews) after every edit: they happen when the sub-phase closes or in `/mep:prelaunch`.
- **Stage and push.** A project is `building` or `live`. While building, a push or PR to `main` only stops on secrets, violated 🔒 items or regressions in already closed sub-phases: **do not ask the user to close sub-phases or meet pending 🔴 items to push progress.** Closing a sub-phase is optional (it protects against regressions). The moment to require everything is `/mep:launch`; once live, every push to `main` is a production deploy with the full gate.
- **Domains.** Every item lives in a domain and subdomain (`ui.motion`, `security.abuse`, `payments.checkout`…). `/mep:domains` shows progress by domain and `/mep:focus <path>` what is pending in one (items linked from another domain show with ↗). Work by domain if the user prefers; the sub-phase order need not be followed. Switching a domain off (`/mep:domain off`) and deferring a 🔴 until go-live (`/mep:defer`) are the user's decisions, not yours.
- `BRIEF.md` is the master instruction; it is regenerated from the profile, never edited by hand.
- Phases: `foundation.setup → foundation.design → build.data → build.features → build.ux → launch.content → launch.seo → launch.ops`. They are a suggested working order; the 🔴 of closed sub-phases are protected against regressions.
- Planning documents (`docs/plan/`) are optional: never create them just to pass a check. If the project has them, they are the plan you build against; if not, do not make any, unless the user asks.
  - Only if the user chose them: when `foundation.design` starts write `FLOWS.md` first; when `build.data` starts with `has_db`, `SCHEMA.md`, before migrations. Templates in `${CLAUDE_PLUGIN_ROOT}/templates/plan/`.
  - Read `SCHEMA.md` before touching the database and `FLOWS.md` before building a screen.
  - Keep them current: a new route goes into the `FLOWS.md` inventory and a new table into `SCHEMA.md` in the same change. The `plan-*` items fail when they drift from the code.
  - Diagrams: generate each with the `diagram-design:diagram-design` skill and export it to PNG with `diagram-design:export-diagram` (running this mep skill is the user's request for those exports). Save the HTML and the PNG in `docs/plan/diagrams/<doc>-<type>[-<name>]` (`<type>` is the diagram-design type name: `journey`, `architecture`, `gantt`…) and show it with `![description](diagrams/<file>.png)`. Before closing `foundation.design` they use diagram-design's default style; after, the project's tokens.
- Guidelines (`${CLAUDE_PLUGIN_ROOT}/catalog/guidelines.md`): when a sub-phase starts, read only its section. `foundation.design`: 1 and 2. `build.ux`: 1 and 3. `launch.content`: 4, only if `type` is landing, ecommerce, marketplace or saas. Section 5 (code) always applies. Section 0 is checked by the engine; do not repeat it by hand.
- Security: the `mep-security` agent implements or audits it. A security item only counts as met with its report in `.mep/security/`.
- To find code use the `mep-locator` agent. Keep the maps current: `codemap` regenerates `CODEMAP.md` (it respects "Manual notes") and `registry` regenerates `REGISTRY.md` from the exports; "What for", "Do not use for", "Variants" and `@example` are written in each export's `/** */` comment, never in the registry.
- Before opening or merging a PR to `main`, mep requires a quality review of the branch, recorded and valid for the current code: `/ponytail-review branch` if Ponytail is installed (otherwise review duplicates, names, complexity and reuse against `REGISTRY.md`), and record it with `review record --pr --must-fix <n>`. Retrying without a review does not pass, and CI requires it too.
- To close a sub-phase, the engine requires a recorded quality review (`review record`), with no "must fix" and on the current code: `/ponytail-review` if Ponytail is installed, otherwise your own review. `review` says which.
- Quality thresholds (complexity, max_lines, max_function_lines, max_params) are in the profile's `quality`; relax them only with `/mep:threshold` (the user types it) and a reason.
- Features outside the catalog go in the profile's `custom_work`, with a size; the quote marks them "estimate to review".
- Quote: it only runs by itself when the scope is defined and when it changes. Do not compute it at other times unless the user asks (`/mep:quote`).
- 🔒 (`locked`) items are never switched off. A 🟡 is skipped only with `/mep:skip` and a reason; a 🔴 is turned off only with `/mep:override`, with a reason and the user's confirmation.
- `MEP_BYPASS=1` is the user's emergency escape, not yours: the guard denies commands that mention it. It does not apply to locked items or to state modified outside the CLI.
- mep's state (`.mep/profile.yaml`, `log`, `security/`, `reviews/`) only changes through the CLI and is sealed; never edit it by hand or by script. If `verify` says "modified outside the CLI", explain the change to the user: re-sealing it is theirs (`/mep:resync`).
- The user's actions, never yours: `/mep:confirm`, `/mep:override`, `/mep:defer`, `/mep:domain off`, `/mep:threshold` (relaxing) and `/mep:resync`. Each one is recorded in `.mep/log` and in the PR summary.
- "Guided checklist, not legal advice."
