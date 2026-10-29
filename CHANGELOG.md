# Changelog

The catalog has its own changelog in [catalog/CHANGELOG.md](catalog/CHANGELOG.md).

## 0.3.1

Python code quality (catalog 2026.10.10) and export fixes:

- **Python projects** (detected by `pyproject.toml`, `requirements*.txt`, `uv.lock` or `setup.py`) get the same guarantees as JS ones: Ruff with the profile's complexity, argument and statement limits plus its security rules, mypy --strict, pytest, a lockfile with pip-audit, and vulture (recommended). The engine reads `pyproject.toml` and counts the length of every `.py` file.
- `.venv`, `venv` and the Python caches are no longer scanned by any check.
- **Export:** Markdown links print as their text (external ones keep the address); image lines accept a title and `<paths with spaces>`; external images fail with a clear message; tall images fit the page in Word.
- **Planning docs:** a `## ` line inside a code block no longer ends a section; loose `.html` files in `public/` (site verification) are not counted as screens.

## 0.3.0

Planning documents (catalog 2026.10.9):

- **Five documents in `docs/plan/`:** PRD, TRD and IMPLEMENTATION written by `/mep:scope`; FLOWS at the start of `foundation.design`; SCHEMA at the start of `build.data` when there is a database. Fixed templates in `templates/plan/`, with sections found by `<!-- mep:key -->` markers so headings can be in any language.
- **Diagrams with diagram-design** (now required for these documents): journey, architecture, Gantt, flowcharts, sequence and database schema, saved as HTML and PNG in `docs/plan/diagrams/`.
- **The engine keeps them honest:** new `plan` check type and five 🔴 items (`plan-prd`, `plan-trd`, `plan-implementation`, `plan-flows`, `plan-schema`). FLOWS must list every page route of the code and SCHEMA the same tables as the migrations.
- **Client versions:** `/mep:export` writes non-technical PRD, FLOWS and IMPLEMENTATION for client projects, reusing only client-safe diagrams. The .docx and .pdf export now embeds PNG images.
- **Existing projects** get the items through `/mep:update`, which also writes the missing documents.
- Fix: `pnpm validate` passes again (`mep.tools` declared in the panel state types).

## 0.2.2

Guidelines and code-quality guardrails (catalog 2026.10.8):

- **`catalog/guidelines.md`.** Design, UX, marketing and code principles, cleaned and merged. The agent reads only the active sub-phase's section; the close review checks key views against it and each miss is a "must fix".
- **New required items:** `touch-targets` (≥ 44×44 px), `no-dark-patterns`, `walking-skeleton` (Gall's law), `no-import-cycles` and `twelve-factor`.
- **Engine:** new quality threshold `max_params` (4) and a new live rule `reachable`.
- **Stricter checks:** one primary CTA per view; knip and jscpd actually run; line length 45–75 characters everywhere.
- **Responsive test template** checks touch targets and the single primary CTA. Existing projects regenerate `tests/responsive.spec.ts` to get them.

## 0.2.1

Panel (`/mep:panel`):

- **Every item is selectable again.** The hover card on each row is gone: it covered the rows below it and took their pointer.
- **Item detail fits.** Actions come first and the long list of what fails comes last; while the pane is not focused, a hint says how to scroll (ctrl+x tab, arrows).
- **Clickable counts.** The 🔴 and 🟡 counts in the top line open the first pending item of that level.
- **⚙ Herramientas.** Ask the deploy and PR gates ahead of time, run mep commands as if typed (check, phase, quote, audit, update, export, phase close, scope, add, log-time) and see the last events in `.mep/log`. Human-only commands stay out: the engine refuses them from a plugin.

## 0.2.0

Hardening: mep's blocks now hold against the agent's own shortcuts. Nothing on the same machine is tamper-proof, so the rule is that no shortcut is silent: it needs the person, or it shows up in CI.

- **Seal.** Every write through the CLI seals mep's state (`.mep/profile.yaml`, `log`, `security/`, `reviews/`) with a hash line in `.mep/log`. A state changed outside the CLI blocks `mep verify` (also in CI, and `MEP_BYPASS` does not get past it), and no command seals over it until the person runs `/mep:resync`. A 0.1.x repo is sealed once on first use (`seal-initial`, logged).
- **Guard.** Edit/Write on state files and shell writes into `.mep` are denied (mod and classic hook). Commands that mention `MEP_BYPASS` or the human flag are denied too.
- **Human-only actions.** `/mep:confirm` (new), `/mep:override`, `/mep:threshold` (new, when relaxing) and `/mep:resync` (new) are user-only skills answered by the mod. From the agent's Bash they are denied; without mods they run only in an interactive terminal. `confirm` records the git user, not a typed name, and is logged.
- **Security reports cover their files.** `catalog/sensitive.yaml` is grouped (`auth`, `payments`, `db`, `config`) and security items declare `sensitive: [...]`. `security record` always includes the repo files of those groups; `--files` only adds.
- **PR review is real.** `mep review record --pr` stores the branch review, tied to the code hash (committing it does not expire it). The PR gate blocks until it is current with no "must fix" — a second attempt no longer goes through — and CI asks for it with `verify --pr`.
- **PR summary.** New `mep changes --base <ref>`: every state event of the PR (overrides, confirmations, phase closes, thresholds, bypasses, seals, reviews, audits). The CI template writes it to the job summary.
- **More deploy platforms** for the gate: Cloudflare (`wrangler deploy`, `wrangler pages deploy`), Fly.io, Railway, Firebase (`hosting:channel:deploy` is a preview) and Supabase (`db push`, `functions deploy`).
- Review and report hashes normalize line endings (CRLF), so a review recorded on Windows stays valid in CI. Existing reviews and reports expire once after the upgrade.
- Build: the bundle banner works on Windows (the hashbang lives in `cli.ts`).

Checks that prove behavior (catalog 2026.10.7):

- New check types `live` (headers, HSTS, compression and caching, cookies, 404 page, canonical redirects, sitemap — against `urls.preview`/`urls.production` in the profile, or `MEP_URL`) and `dns` (SPF, DMARC, DKIM on `email_domain`). Requests run in a short child process so the engine stays synchronous.
- New HTML rule `clean_links`. Seven manual items become automatic; three header items also check what the site really sends.
- A check that cannot run (no site, quick mode) is `skip`: it never passes or fails an item on its own.
- The CI template passes `MEP_URL` from the repository variable of the same name.

Quiet chat, full panel:

- **The chat only hears from mep when something blocks.** The Stop hook no longer lists the active sub-phase's pending items after every message; a block lists at most five. Pending counts stay in the status line.
- **New panel** beside the chat (`/mep:panel`; opens by itself where the terminal is wide enough): pending items by sub-phase (the active one and regressions open, later ones folded to a count). A press on an item shows what it asks, why, how to meet it and every finding, not the first five. From there the person confirms a manual item, skips a 🟡 with a reason, or turns off a 🔴: after the reason, a dialog of its own shows the risk and the reason, takes the keys, starts on Cancelar, and Esc cancels. Hovering a row (fullscreen terminal, desktop) shows a card with the item's why. "Verificar todo" runs the command and build checks the per-turn quick check leaves as ❔.
- New `mep check --json --detail` (the panel's data). Check results carry `all`, the full list behind a shortened detail.
- Human commands answer only when the engine stamps the person's own gesture (`origin.kind` `composer` or `bridge`).
- The mod is `mods/register.tsx` (JSX), with its state contract in `types/index.d.ts`.

Migration: update `.github/workflows/mep.yml` from `templates/ci/mep.yml` (0.2.0, `--pr`, summary step). Before a PR into main, record the branch review with `mep review record --pr`.

## 0.1.6

- Ponytail is enforced, not just suggested: `mep phase close` requires a recorded quality review for that sub-phase (`mep review record --must-fix <n>`), with no "must fix" and on the current code (it expires when the code changes).
- mep detects whether Ponytail is installed (Claude Code settings or installed plugins; `MEP_PONYTAIL=1|0` forces it). When it is, only `/ponytail-review` counts; otherwise mep's own review.
- New `mep review` shows whether Ponytail was detected and the review state. The PR gate names the right review.

## 0.1.5

- New `SCOPE.md`: the scope in plain words — what the project is, what it includes and does not include, stack, how many rules apply, current phase and what is still undefined. Created by `/mep:scope`, regenerated by `/mep:add`; not edited by hand.
- The profile keeps a one-line `summary` in the client's words. `BRIEF.md` links to `SCOPE.md`.
- New `catalog/labels.yaml` with plain-language names for types, capabilities, markets and signals.

## 0.1.4

- `/mep:audit` is scope-driven: it asks for (or reads) the project's scope first, uses the code only as evidence, and reports where they disagree — in the code but not in the scope, and in the scope but not yet in the code.
- The gap report counts how many rules the scope activates (🔴 / 🟡 / ⚪) and how many do not apply.
- New `mep explain <id>`: the rule's condition with ✓/✗ per part, its level and why.

## 0.1.3

- Catalog 2026.10.6: things to avoid are now checked — empty view-source / Vite + React SPA without SSR, missing structured data, no llms.txt, robots.txt blocking AI crawlers, public source maps, console errors, oversized JS bundles.
- New engine checks: `build` (server_rendered, max_js_chunk, no_source_maps), `robots` (allows_ai) and the `has_text` HTML rule.
- Fix: JS files over 1 MB were measured as empty.

## 0.1.2

- Catalog 2026.10.5: 11 new launch rules (marketing consent, data subject requests, DPAs, third-party disclosure, breach procedure, intellectual property, open source licenses, CTA above the fold, sticky mobile CTA, thank-you page, analytics installed).
- The responsive test checks the primary CTA is above the fold.

## 0.1.1

- `/mep:audit`, `/mep:update`, `/mep:quote`, `/mep:export`, `/mep:log-time`.
- `CODEMAP.md` and `REGISTRY.md` generators, with `registry --check`.
- Full catalog (2026.10.4, 330 items): accessibility, design system, UX, content, legal, markets and more.
- Markets bring their languages; quality thresholds in the profile; automatic design checks; responsive Playwright test; estimated schedule; review before a PR into `main`.
- No database by default; new `payment-links` capability for payments on the provider's page.
- Test project (`examples/estudio-saas`) with an end-to-end test.

## 0.1.0

- Engine, verification, brief, base commands, mods, hooks and CI check.
