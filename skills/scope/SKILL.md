---
name: scope
description: Create the brief of a website or webapp from a natural-language description — profile, justified stack and 🔴🟡⚪ checklist.
argument-hint: "[--preset landing|corporate|ecommerce|saas|marketplace] <project description>"
allowed-tools: Bash(node *), Bash(python *), Bash(python3 *), Read, Write, Edit, AskUserQuestion, Skill
---

# /mep:scope

User's scope: $ARGUMENTS

Follow the `mep` skill to interpret the scope. Engine: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

1. If `.mep/profile.yaml` already exists, stop and suggest `/mep:add`.
2. Read `${CLAUDE_PLUGIN_ROOT}/catalog/dimensions.yaml` (valid values) and, if `--preset` was given or there is a close one, `${CLAUDE_PLUGIN_ROOT}/catalog/presets/<preset>.yaml`.
**mep's limit.** If the project is aimed at minors, includes them as users, or needs age verification (adult content, gambling, alcohol, tobacco, cannabis, 18+ dating), say in one line that mep does not cover that kind of project and stop: create no profile or brief. If it is unclear, ask before continuing.

If there is already a domain or preview URL, save them in the profile (`urls: { production, preview }` and, if it sends emails, `email_domain`): with them mep tests the real site (headers, cookies, 404, redirects, sitemap) and the email DNS (SPF, DMARC, DKIM). If there is none yet, they are added later with `/mep:add`.

If it charges by usage or by result (per unit, per generated result, per active user above a threshold), it is the `usage-billing` capability.

Languages and tools (`has_*`): the default stack (Next.js) leaves `has_javascript`, `has_typescript`, `has_css` and `has_html` true. Set to `false` those the project does not use (for example a Python-only backend) and to `true` those it does (`has_python`, `has_sql`, `has_react`, `has_tailwind`, `has_ci`, `has_shell`, `has_docker`): only the quality rules of what is used are added.

3. Build the profile from the scope's concrete facts, not from its label: who uses it (one person, teams, the public), what it stores, whether money moves and how, which integrations, where, how many users (type, capabilities, markets, audience, context, signals, counts). Show it in a short table. Ask what changes a 🔴 or the counts, and anything about the scope you cannot decide (see the `mep` skill). If the scope charges for something and it is unclear, ask whether payment is by provider link (`payment-links`) or own checkout (`payments`); do not set `has_db` without something to store.
4. Write a `summary` paragraph in the user's words: what the project is, for whom and what it must achieve (it heads SCOPE.md). Scope features that are not in the catalog (e.g. "schedule per instructor") go in `custom_work` with their size: `[{ title, size: XS|S|M|L|XL, phase }]`. Write the proposal to `.mep/draft.yaml` (include `project` and `preset` if any) and run `evaluate --from .mep/draft.yaml`. If the engine rejects a value, fix it; do not invent values.
5. **Fit the catalog to this scope — do not apply a type.** The catalog is a general guide; `type` is only a label for what the product is. Never think "it's a SaaS, so it gets everything a SaaS gets". Read what the scope actually asks for and decide, area by area, what fits:
   - Go through the proposal domain by domain (`evaluate` groups it that way). For each applicable item decide: **keep**, **not applicable** (it does not fit this project), **applies differently** (keep it, with a note in this scope's terms), or **something is missing** (add a capability, an optional item or `custom_work`).
   - Question especially what came only from the `type` (e.g. `saas-*`, `ecommerce-*`, `marketplace-*`) and heavy infrastructure for a small scope: a single-user tool needs no teams or roles; a brochure site needs no queues. Read an item's `why`/`how` (in `BRIEF.md` or the catalog) only when its title is not enough to decide.
   - Never fit out a 🔒 item. Everything else needs a one-line reason.
   - **If you are unsure, ask** — do not guess in either direction. Group the questions (AskUserQuestion, at most 4 per round), each tied to a concrete decision ("does a client have more than one user?").
   - Record the result in the draft: `tailoring.not_applicable: [{ id, reason }]` for what does not fit and `tailoring.notes: { <id>: "how it applies here" }` for what applies differently (e.g. `booking-no-double: "per instructor, not per room"`). Keep reasons and notes short and in the user's words.
6. Run `evaluate --from .mep/draft.yaml` again with the tailoring and show the result grouped by domain (🔴, 🟡, ⚪), then a short summary of the fitting: what was **left out** (id — reason), what **applies differently** (id — note), what was **added**, and the stack recommendations with their reason. Ask the user to choose the ⚪ they want and to confirm or correct the fitting.
7. With the confirmation:
   - `init --from .mep/draft.yaml` (the `tailoring` goes with it; it creates `.mep/profile.yaml`, `SCOPE.md`, `BRIEF.md`, stack ADRs, links `CLAUDE.md` and adds `.github/workflows/mep.yml`).
   - `select <id> <id>…` with the chosen ⚪ (if any).
   - Delete `.mep/draft.yaml`.
   - `codemap` and `registry` to create `CODEMAP.md` and `REGISTRY.md`.
   - `init` installs `tests/responsive.spec.ts` and the `test:responsive` script: ask the user to edit `PAGES` with the key routes and to add `@playwright/test` if it is missing.
   - `init` already computes the quote (the toggle: it only runs when the scope is defined and when it changes). Show its line; if the rate is 0, say where to set it.
8. Planning documents (`docs/plan/`) are **optional**. Do not write them by default and never to satisfy a check. Ask once: "Do you want written PRD / TRD / IMPLEMENTATION docs (useful when a client approves or a team shares them)?" Only if yes:
   - Check that the `diagram-design:diagram-design` skill is available (plugin `cathrynlavery/diagram-design` ≥ 2.6.136) and its PNG export works. If not, give the commands (`claude plugin install diagram-design@diagram-design`, `pip install playwright`, `python -m playwright install chromium`) or write the docs without diagrams.
   - Write only the ones the user picked from `${CLAUDE_PLUGIN_ROOT}/templates/plan/`, in the user's language, short and true to this scope. Keep the `<!-- mep:key -->` markers.
   - Diagrams only where they help; save HTML and PNG in `docs/plan/diagrams/` and link them.
   - Then add the matching `plan-*` items with `mep select <id>…` so they are tracked.
9. If the Ponytail plugin is not installed, suggest it once (`DietrichGebert/ponytail`); mep works without it.
10. Close with: active sub-phase (`foundation.setup`), how many 🔴 it has and the next step. Remind the user to make the `mep` check required for PRs to `main` on GitHub.
