<div align="center">

# mise en place

**Scope → brief → verified checklist, for websites and webapps built with Claude Code.**<br>
You describe the project. mep knows what to ask and what to require.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-informational.svg)](.claude-plugin/plugin.json)
[![Catalog](https://img.shields.io/badge/catalog-2026.10.1-informational.svg)](catalog/CHANGELOG.md)
[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-D97757.svg)](https://docs.claude.com/en/docs/claude-code/plugins)
[![Works with ponytail](https://img.shields.io/badge/works_with-ponytail-555.svg)](https://github.com/DietrichGebert/ponytail)
[![Works with batuta](https://img.shields.io/badge/works_with-batuta-555.svg)](https://github.com/engelbertgm/Batuta)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**English** · [Español](README.es.md)

</div>

---

Most web projects ship without a canonical tag, with a table that has no RLS, or with a secret in the repo. Nobody asked for those things, so nobody built them. mep turns a plain-language scope into a **project profile**, filters a conditional catalog down to what applies, writes a **brief** with a justified stack and a checklist, and then **blocks** closing the work or deploying while required items are missing. A deterministic engine checks the repo, not the model.

## How it works

```mermaid
flowchart TD
    U(["/mep:scope<br/>plain-language scope"]) --> P["Profile<br/>type · capabilities · markets<br/>audience · context · signals"]
    P --> E["Engine evaluates<br/>the catalog"]
    E --> B["BRIEF.md<br/>stack + ADRs + checklist<br/>🔴 required · 🟡 recommended · ⚪ optional"]
    B --> W["Work the active sub-phase"]
    W --> C{"/mep:phase close"}
    C -->|"🔴 pending"| W
    C -->|"all 🔴 pass +<br/>mep-security audit"| L["Sub-phase locked<br/>against regressions"]
    L --> W
    W --> D{"Deploy"}
    D -->|"preview"| G1["Blocks on regressions<br/>and locked violations"]
    D -->|"production"| G2["Blocks on any<br/>pending 🔴"]
    G2 --> CI["CI: mep verify --prod<br/>required check on main"]
```

| Level | Effect |
| --- | --- |
| 🔴 required | Blocks by sub-phase. Always blocks a production deploy. Turned off only with `/mep:override`, a written reason and explicit confirmation |
| 🟡 recommended | Warns. Skipped only with `/mep:skip` and a written reason |
| ⚪ optional | Informs. Chosen during `/mep:scope` |
| 🔒 locked | Never turned off: secrets, RLS, password hashing, per-resource authorization, card data, HTTPS. A detected violation blocks at any time |

Sub-phases run in order: `foundation.setup → foundation.design → build.data → build.features → build.ux → launch.content → launch.seo → launch.ops`. Required items only block once their sub-phase is closed, so early work is not stuck behind launch checks.

| Agent | Model | Effort | Role |
| --- | --- | --- | --- |
| `mep-locator` | Haiku | low | Finds code and reusable pieces, reading `CODEMAP.md` and `REGISTRY.md` first. Read-only |
| `mep-security` | Opus | high | Implements and audits security items. Its reports in `.mep/security/` are the only thing that marks a security item as done |

> [!NOTE]
> A security item passes only when its automatic checks pass **and** `mep-security` left a current report. The report stores a hash of the files it reviewed; when any of them changes, the report expires and the item is pending again.

## Works with

| Plugin | How they fit |
| --- | --- |
| [ponytail](https://github.com/DietrichGebert/ponytail) | Applies the code mantra on every change. `/ponytail-review` replaces mep's quality review when closing a sub-phase, and its "must fix" findings block the close |
| [batuta](https://github.com/engelbertgm/Batuta) | Routes each task to the right model (Opus decides, Sonnet executes, Haiku reads). mep's two agents are fixed exceptions: finding code always goes to `mep-locator` and security always to `mep-security` |

Both are optional. mep works on its own.

## Requirements

- Claude Code (mods need 2.1.287 or later; older versions use the bundled hooks)
- Node.js 20 or later
- Projects in a git repository
- Recommended: the [ponytail](https://github.com/DietrichGebert/ponytail) plugin. mep works without it and uses its own quality review instead

## Install

```
/plugin marketplace add engelbertgm/Mise-en-place
/plugin install mep@mise-en-place
```

Then, in a new or existing project folder:

```
/mep:scope --preset saas "booking app for dance studios, Mexico and California, monthly plans"
```

> [!TIP]
> Try it without installing: `claude --plugin-dir <path-to-this-repo>`, then run `/mep:scope` in an empty folder.

## Usage

| Command | What it does |
| --- | --- |
| `/mep:scope [--preset <name>] <description>` | Asks only what changes 🔴 items, then writes `.mep/profile.yaml`, `BRIEF.md`, stack ADRs, the `CLAUDE.md` block and the CI workflow |
| `/mep:add <change>` | Updates the scope and shows **only the diff**: new items, items that move up a level, items that no longer apply |
| `/mep:check` | Status by sub-phase: ✅ done · ❌ pending · ⏭️ skipped · ⚠️ overridden. Warns about signals in the code the profile does not have |
| `/mep:phase [close <sub-phase>]` | Active sub-phase and what is missing; `close` runs the security audit and quality review, then closes it |
| `/mep:skip <id> <reason>` | Skips a 🟡 item |
| `/mep:override <id> <reason>` | Turns off a 🔴 item after confirmation; rejects 🔒 items |

Presets: `landing`, `corporate`, `ecommerce`, `saas`, `marketplace`.

<details>
<summary><b>Project profile</b> (<code>.mep/profile.yaml</code>, the source of truth)</summary>

```yaml
project: "dance-studio"
phase:
  closed: [foundation.setup]
  active: foundation.design
type: saas
capabilities: [auth, payments, subscriptions, email]
markets: [MX, USA:CA]
audience: [b2c]
context: client-project
counts: { pages: 12, entities: 6, languages: 2, integrations: 3 }
signals:
  has_forms: true
  has_db: true
  db_client_access: true
  has_dates: true
selections:
  optional_added: []
  recommended_skipped:
    - { id: csp-strict, reason: "MVP; added after launch", date: 2026-10-12 }
  overrides: []
stack:
  decided: { framework: nextjs, hosting: vercel, db: postgresql }
```

Only values from [`catalog/dimensions.yaml`](catalog/dimensions.yaml) are accepted. Capabilities turn on signals by themselves (`auth` → forms, database, personal data); more than one language turns on `i18n`.

</details>

<details>
<summary><b>Catalog item</b> (one entry in <code>catalog/items/*.yaml</code>)</summary>

```yaml
- id: rls-all-tables
  title: RLS enabled on every table
  category: security
  level: required
  phase: build.data
  locked: true
  since: "2026.10.1"
  effort: { size: M, hours: [2, 6], scales_with: entities }
  when: { signals: { has_db: true, db_client_access: true } }
  why: "With direct client access (Supabase), a table without RLS is public to anyone with the anon key."
  how: "Every create table in migrations has its enable row level security."
  verify:
    - { type: sql, rule: rls_enabled }
```

Verify types: `file_exists`, `route_exists` (Next.js, Astro, Vite/React, static), `grep` (present or absent), `json_key`, `command`, `html` (rules on the build output: unique titles, one `h1`, heading order, meta tags…), `sql` (RLS in migrations) and `manual`. The engine runs them all, never the model.

</details>

<details>
<summary><b>When it blocks</b></summary>

| Moment | Blocks on |
| --- | --- |
| Ending a turn (Stop) | 🔴 items of **closed** sub-phases (regressions) and 🔒 violations. Pending 🔴 items of the active sub-phase are shown as info |
| Preview deploy (`vercel`, `netlify deploy`) | Same as Stop |
| Production deploy (`vercel --prod`, push to `main`) | Any pending 🔴, in every sub-phase |
| Pull request to `main` | `mep verify --prod` in CI. This is the real barrier: production deploys usually run on merge, where Claude Code hooks do not |
| Writing a file | A secret written into a versioned file is refused |

Nothing runs in a repo without `.mep/profile.yaml`. Emergency escape: `MEP_BYPASS=1` (never for 🔒 items; logged in `.mep/log`).

</details>

<details>
<summary><b>What lives where</b></summary>

| In the repo (versioned) | Outside the repo (`~/.config/mep-check/`) |
| --- | --- |
| `.mep/profile.yaml`, `.mep/log`, `.mep/security/`, `BRIEF.md`, `docs/decisions/` | Rates, real hours, internal quotes |

In a `client-project` the repo is handed to the client, so nothing internal to your business stays in it.

</details>

## Under the hood

- **Engine** ([`engine/src`](engine/src)): TypeScript, no LLM. Same profile, same items, same result. Bundled to [`engine/dist/mep.mjs`](engine/dist/mep.mjs) with no runtime dependencies, and published as `@engelbertgm/mep` for CI.
- **Mods** ([`mods/register.ts`](mods/register.ts)): run inside Claude Code. `/mep:check` and `/mep:phase` answer instantly, without a Claude turn; deploys wait for the engine's gate; the status line shows the active sub-phase and pending 🔴/🟡.
- **Hooks** ([`hooks/hooks.json`](hooks/hooks.json)): SessionStart, Stop, PreToolUse and PostToolUse, as the fallback where mods are not available.
- **CI** ([`templates/ci/mep.yml`](templates/ci/mep.yml)): installed by `/mep:scope`. Runs gitleaks, `pnpm audit`, the build and `mep verify --prod`.

## Limitations

> [!WARNING]
> mep is a guided checklist, not legal advice. Legal items cite official sources, but a lawyer should review them for your market.

- The CI check only blocks merges once you mark it as **required** in the repo's branch protection settings.
- HTML checks need a build output (`out/`, `.next/server/app`, `dist/`). Without one, those items stay pending instead of passing.
- Catalog `2026.10.1` covers base, SEO and security. Accessibility, design system, UX, content, legal, markets, `/mep:audit`, `/mep:update`, quoting and export are planned.

The full design is in [docs/spec.md](docs/spec.md) (Spanish).

## Development

```
pnpm install
pnpm test                 # builds the engine, then runs its tests
pnpm typecheck
claude plugin test .      # mod tests
claude plugin validate .
```

After changing `engine/src`, run `pnpm build` and commit `engine/dist/mep.mjs`; CI checks they match.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

[Apache-2.0](LICENSE)
