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

3. Propose the profile (type, capabilities, markets, audience, context, signals, counts) in a short table. Ask **only** what changes a 🔴 or the counts (see the `mep` skill). If the scope charges for something and it is unclear, ask whether payment is by provider link (`payment-links`) or own checkout (`payments`); do not set `has_db` without something to store.
4. Write a `summary` paragraph in the user's words: what the project is, for whom and what it must achieve (it heads SCOPE.md). Scope features that are not in the catalog (e.g. "schedule per instructor") go in `custom_work` with their size: `[{ title, size: XS|S|M|L|XL, phase }]`. Write the proposal to `.mep/draft.yaml` (include `project` and `preset` if any) and run `evaluate --from .mep/draft.yaml`. If the engine rejects a value, fix it; do not invent values.
5. Show the result grouped (🔴, 🟡, ⚪ by category) and the stack recommendations with their reason. Ask the user to choose the ⚪ they want and confirm.
6. With the confirmation:
   - `init --from .mep/draft.yaml` (creates `.mep/profile.yaml`, `SCOPE.md`, `BRIEF.md`, stack ADRs, links `CLAUDE.md` and adds `.github/workflows/mep.yml`).
   - `select <id> <id>…` with the chosen ⚪ (if any).
   - Delete `.mep/draft.yaml`.
   - `codemap` and `registry` to create `CODEMAP.md` and `REGISTRY.md`.
   - `init` installs `tests/responsive.spec.ts` and the `test:responsive` script: ask the user to edit `PAGES` with the key routes and to add `@playwright/test` if it is missing.
   - `init` already computes the quote (the toggle: it only runs when the scope is defined and when it changes). Show its line; if the rate is 0, say where to set it.
7. Planning documents (`docs/plan/`):
   - Check that the `diagram-design:diagram-design` skill is available (plugin `cathrynlavery/diagram-design` ≥ 2.6.136) and that its PNG export works (Python + Playwright + Chromium). If something is missing, stop here and give the commands: `claude plugin install diagram-design@diagram-design`, `pip install playwright` and `python -m playwright install chromium`. There is no fallback without PNG.
   - Write `PRD.md`, `TRD.md` and `IMPLEMENTATION.md` from `${CLAUDE_PLUGIN_ROOT}/templates/plan/`, in the user's language. Follow each section's comments; the `<!-- mep:key -->` markers stay as they are.
   - Diagrams: generate each with the `diagram-design:diagram-design` skill and export it to PNG with `diagram-design:export-diagram` (running this mep skill is the user's request for those exports). Save the HTML and the PNG in `docs/plan/diagrams/<doc>-<type>[-<name>]` (`<type>` is the diagram-design type name: `journey`, `architecture`, `gantt`…) and show it with `![description](diagrams/<file>.png)`. Before closing `foundation.design` they use diagram-design's default style; after, the project's tokens.
   - Run `check` and confirm that `plan-prd`, `plan-trd` and `plan-implementation` pass.
8. If the Ponytail plugin is not installed, suggest it once (`DietrichGebert/ponytail`); mep works without it.
9. Close with: active sub-phase (`foundation.setup`), how many 🔴 it has and the next step. Remind the user to make the `mep` check required for PRs to `main` on GitHub.
