# Planning Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mep writes and verifies five planning documents per project (PRD, TRD, FLOWS, SCHEMA, IMPLEMENTATION) with diagram-design diagrams, and exports client versions with images.

**Architecture:** Claude writes the documents from fixed templates (skills); the engine only verifies them through a new `plan` check type in `engine/src/plan.ts`, driven by data in `catalog/items/plan.yaml`. Sections are found by language-independent markers (`<!-- mep:<key> -->`), so headings can be in any language. `engine/src/docs.ts` gains an image block so client .docx/.pdf show the reused PNG diagrams.

**Tech Stack:** TypeScript (Node ≥ 20, `--experimental-strip-types`), `node:test`, YAML catalog, esbuild bundle. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-29-documentos-de-planeacion-design.md`

## Global Constraints

- Plugin version 0.3.0; catalog version `2026.10.9` (every new item has `since: "2026.10.9"`).
- No new runtime or dev dependencies (`docs.ts` rule: works on any machine).
- Documents live in `docs/plan/`: `PRD.md`, `TRD.md`, `FLOWS.md`, `SCHEMA.md`, `IMPLEMENTATION.md`.
- Diagrams live in `docs/plan/diagrams/<doc>-<type>[-<name>].{html,png}`, where `<doc>` is `prd|trd|flows|schema|implementation` and `<type>` is the diagram-design type name. They are committed to git.
- Engine messages, catalog text and skills are in Spanish, matching the existing files.
- diagram-design ≥ 2.6.136 and its PNG export (`scripts/export_png.py`: Python + Playwright + Chromium) are required to write the documents; there is no SVG-only fallback.
- Client versions exist only for `PRD`, `FLOWS`, `IMPLEMENTATION` and only when `context: client-project`. Client diagrams reuse only: `prd-journey`, `prd-story-map`, `prd-service-blueprint`, `implementation-gantt`, `implementation-timeline`, and end-user `flows-flowchart`. Never `state`, `swimlane`, `heatmap`, `sequence`, nor anything from TRD or SCHEMA.
- Run tests with `pnpm test` (it builds first). Run typecheck with `pnpm -s typecheck`. On Windows, `tests/verify.spec.ts` "exit 0 passes…" already fails before this work (shell `exit 3`); ignore only that one.
- Commit to `main` directly (the user's rule for this repo). Do not push.

## Review Focus

1. **Translated or renamed headings.** A document written in English with `## Summary` instead of `## Resumen` must still pass, because sections are found by `<!-- mep:<key> -->` markers. Test in Task 1.
2. **CRLF line endings** (Windows editors). Section parsing must work on `\r\n` files. Test in Task 1.
3. **Table names written differently** in migrations and SCHEMA.md (`public.orders`, `"Orders"`, `orders`). Both sides are normalized like `sql.ts` `tableName()` before comparing. Test in Task 2.
4. **Dynamic and grouped routes.** `/blog/[slug]` must be listed exactly as `routes()` returns it, and route groups like `(marketing)` never appear. Test in Task 2.
5. **Missing or odd images at export.** A missing PNG gives an error naming the file and no crash; a PNG with an alpha channel renders in the PDF. Tests in Task 4.

---

### Task 1: `plan` check type — document, sections, profile mentions, phases, diagrams

**Files:**
- Create: `engine/src/plan.ts`
- Modify: `engine/src/types.ts` (add to `Check` union), `engine/src/verify.ts` (dispatch in `runCheck`), `engine/src/catalog.ts` (`CHECK_TYPES` and `required` in `validateCheck`), `engine/src/render.ts` (check text)
- Test: `tests/plan.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PlanDoc = 'prd' | 'trd' | 'flows' | 'schema' | 'implementation'
  export type PlanRule = 'sections' | 'custom_work' | 'stack' | 'phases' | 'diagrams' | 'routes' | 'tables'
  // in types.ts Check union:
  | { type: 'plan'; doc: PlanDoc; rule: PlanRule; sections?: string[]; phases?: string[]; required?: string[]; if_capabilities?: string[] }
  export const PLAN_FILES: Record<PlanDoc, string> // 'docs/plan/PRD.md', ...
  export function section(md: string, key: string): string | undefined // text from the marker to the next '## ' heading, or undefined
  export function checkPlan(root: string, check: Extract<Check, { type: 'plan' }>, profile: Profile): CheckResult
  ```
- `required` entries are diagram types; `a|b` means either one. `if_capabilities`: the `diagrams` rule's `required` applies only when the profile has any of them.

- [ ] **Step 1: Write the failing tests** in `tests/plan.spec.ts` (use `makeRepo`, `testCatalog([])`, `profile` from `tests/helpers.ts`):
  - `missing document fails with its path`: `checkPlan` on an empty repo, rule `sections` for `prd` → `ok === false`, `detail` matches `/falta docs\/plan\/PRD\.md/`.
  - `sections are found by marker, in any language, with CRLF`: PRD with `## Summary\r\n<!-- mep:resumen -->\r\ntext` and `sections: ['resumen']` → `ok === true`; with `sections: ['resumen', 'metas']` → `ok === false`, detail contains `metas`.
  - `custom_work titles must appear (case-insensitive)`: profile `custom_work: [{ title: 'Agenda de clases por instructor', size: 'L' }]`; PRD containing `agenda de clases por instructor` passes; PRD without it fails with the title in `detail`.
  - `stack decisions must appear in TRD`: profile `stack: { decided: { framework: 'Next.js' } }`; TRD mentioning `next.js` passes, without it fails.
  - `phases: every listed phase as a code heading in the fases section; build.data only with has_db`: IMPLEMENTATION with `<!-- mep:fases -->` and `### \`foundation.setup\`` and `### \`build.ux\``, check `phases: ['foundation.setup', 'build.data', 'build.ux']`: passes when `signals.has_db` is false, fails naming `build.data` when it is true.
  - `diagrams: required types by file name, linked images must exist`: PRD linking `![j](diagrams/prd-journey.png)` with that file present and `required: ['journey|story-map']` → passes; file absent → fails naming `diagrams/prd-journey.png`; `required: ['architecture']` with no such file → fails naming `architecture`.
  - `diagrams: if_capabilities skips the requirement when no capability matches`: `required: ['sequence'], if_capabilities: ['auth', 'payments']`, profile without either → passes with no files.

- [ ] **Step 2: Run to verify they fail**

  Run: `node --test --experimental-strip-types tests/plan.spec.ts`
  Expected: FAIL (`Cannot find module '../engine/src/plan.ts'`)

- [ ] **Step 3: Implement `engine/src/plan.ts`** with the interfaces above. Normalize `\r\n` to `\n` before parsing. `section()` finds the line `<!-- mep:<key> -->` and returns text up to the next line starting with `## `. `phases` reads backticked names in `###` headings inside section `fases`. `diagrams` collects `![...](path)` links, resolves them relative to `docs/plan/`, and requires a file `docs/plan/diagrams/<doc>-<type>*.png` for each `required` entry. Each failing rule returns `{ ok: false, detail }` listing what is missing (up to 5, then ` …`). Wire the type into `types.ts`, `verify.ts` (`case 'plan': return checkPlan(root, check, profile)`), `catalog.ts` (`plan: ['doc', 'rule']`) and `render.ts` (`` `docs/plan: ${c.doc} (${c.rule})` ``).

- [ ] **Step 4: Run tests and typecheck**

  Run: `node --test --experimental-strip-types tests/plan.spec.ts && pnpm -s typecheck`
  Expected: PASS, no type errors

- [ ] **Step 5: Commit**

  ```bash
  git add engine/src/plan.ts engine/src/types.ts engine/src/verify.ts engine/src/catalog.ts engine/src/render.ts tests/plan.spec.ts
  git commit -m "feat(engine): plan check type for planning documents"
  ```

### Task 2: Drift rules — `routes` (FLOWS) and `tables` (SCHEMA)

**Files:**
- Modify: `engine/src/plan.ts`, `engine/src/framework.ts` (new `pageRoutes`), `engine/src/maps.ts:184-186` (use `pageRoutes`), `engine/src/sql.ts:8,17` (export `tableName` and `scan` as `scanMigrations`)
- Test: `tests/plan.spec.ts`

**Interfaces:**
- Consumes: `checkPlan`, `section` from Task 1.
- Produces:
  ```ts
  // framework.ts — page routes only: no /api, no .txt/.xml/.webmanifest (same filter renderCodemap uses today)
  export function pageRoutes(root: string): string[]
  // sql.ts
  export function tableName(raw: string): string | undefined
  export function scanMigrations(root: string, glob?: string): { files: number; tables: Set<string>; rls: Set<string>; policies: Map<string, Set<string>> }
  ```

- [ ] **Step 1: Write the failing tests** in `tests/plan.spec.ts`:
  - `routes: every page route appears in code in the pantallas section`: Next.js repo with `app/page.tsx`, `app/(marketing)/precios/page.tsx`, `app/blog/[slug]/page.tsx`, `app/api/x/route.ts`; FLOWS section `pantallas` listing `` `/` ``, `` `/precios` ``, `` `/blog/[slug]` `` → passes; dropping `/blog/[slug]` → fails naming it; `/api/x` is never required.
  - `tables: migrations and SCHEMA list the same tables, normalized`: migration `create table public."Orders" (...)` and `create table profiles (...)`; SCHEMA section `tablas` with `### \`orders\`` and `### \`profiles\`` → passes; SCHEMA with an extra `### \`invoices\`` → fails with `sobra invoices`; missing `profiles` → fails with `falta profiles`.
  - `codemap output is unchanged` (regression): `renderCodemap` on the routes repo above still lists the same pages as before the refactor.

- [ ] **Step 2: Run to verify they fail**

  Run: `node --test --experimental-strip-types tests/plan.spec.ts`
  Expected: FAIL on the new `routes` and `tables` tests

- [ ] **Step 3: Implement** `pageRoutes`, export `tableName` and `scanMigrations` (rename `scan`; update `checkSql`), make `renderCodemap` use `pageRoutes`, and add the `routes` and `tables` rules to `checkPlan`. Table names in SCHEMA are the backticked names in `###` headings of section `tablas`, passed through `tableName()`.

- [ ] **Step 4: Run all tests**

  Run: `pnpm test`
  Expected: PASS except the known Windows-only `verify.spec.ts` command test

- [ ] **Step 5: Commit**

  ```bash
  git add engine/src/plan.ts engine/src/framework.ts engine/src/maps.ts engine/src/sql.ts tests/plan.spec.ts
  git commit -m "feat(engine): plan drift checks for routes and migration tables"
  ```

### Task 3: Templates, catalog items and the test project

**Files:**
- Create: `templates/plan/PRD.md`, `templates/plan/TRD.md`, `templates/plan/FLOWS.md`, `templates/plan/SCHEMA.md`, `templates/plan/IMPLEMENTATION.md`, `catalog/items/plan.yaml`
- Create (fixture): `examples/estudio-saas/docs/plan/{PRD,TRD,IMPLEMENTATION,FLOWS,SCHEMA}.md` and the required PNGs in `examples/estudio-saas/docs/plan/diagrams/`
- Modify: `catalog/VERSION` (`2026.10.9`), `catalog/CHANGELOG.md`, `catalog/labels.yaml` (only if it lists categories: add `plan`)
- Test: `tests/plan.spec.ts`, `tests/e2e.spec.ts`

**Interfaces:**
- Consumes: the `plan` check from Tasks 1–2.
- Produces: section marker keys (the contract between templates, catalog and skills):

  | Doc | Markers (★ = required in `sections`) |
  |---|---|
  | PRD | `resumen`★ `usuarios`★ `metas`★ `alcance`★ `fuera-de-alcance`★ `historias`★ `riesgos` |
  | TRD | `stack`★ `arquitectura`★ `integraciones` `entornos`★ `no-funcionales`★ `decisiones-abiertas` |
  | FLOWS | `pantallas`★ `flujos`★ `estados` `roles` |
  | SCHEMA | `tablas`★ `relaciones`★ `autenticacion` `rls`★ `retencion` |
  | IMPLEMENTATION | `fases`★ `hitos`★ `dependencias` `calendario`★ `riesgos` |

- Catalog items (all `level: required`, `category: plan`, `since: "2026.10.9"`, each with `why`, `how` and `effort`):

  | id | phase | when | verify |
  |---|---|---|---|
  | `plan-prd` | foundation.setup | — | `sections` (★ list), `custom_work`, `diagrams` `required: ['journey\|story-map']` |
  | `plan-trd` | foundation.setup | — | `sections`, `stack`, `diagrams` `required: ['architecture']` |
  | `plan-implementation` | foundation.setup | — | `sections`, `phases` (all 8 from `dimensions.phases`), `diagrams` `required: ['gantt']` |
  | `plan-flows` | foundation.design | — | `sections`, `routes`, `diagrams` `required: ['flowchart']`, `diagrams` `required: ['sequence'], if_capabilities: [auth, payments]` |
  | `plan-schema` | build.data | `{ signals: { has_db: true } }` | `sections`, `tables`, `diagrams` `required: ['db-schema']` |

- [ ] **Step 1: Write the failing tests**
  - In `tests/plan.spec.ts`, `every template has every marker the catalog requires`: load the real catalog, and for each `plan` check with `sections`, assert `templates/plan/<DOC>.md` contains `<!-- mep:<key> -->` for each key.
  - `phases lists in plan.yaml are a subset of dimensions.phases`.
  - In `tests/e2e.spec.ts` step 2, assert `BRIEF.md` lists `plan-prd`, `plan-trd` and `plan-implementation`.

- [ ] **Step 2: Run to verify they fail**

  Run: `pnpm test`
  Expected: FAIL on the three new assertions

- [ ] **Step 3: Write the templates and items.** Each template has a `# <Doc> — {project}` title, one `##` heading per section from the spec's tables, the marker on the line under each heading, and an `<!-- -->` comment saying what goes there and which diagram types belong (copy the diagram lists from the spec). Templates must say: a section that does not apply is deleted, never left empty; required (★) sections are never deleted. Write the five items in `catalog/items/plan.yaml`. Bump `catalog/VERSION` and add the `2026.10.9` entry to `catalog/CHANGELOG.md`. Give the test project real documents (its `custom_work` title and stack must appear) and tiny valid PNGs for its required diagrams (generate them once with `zlib` in a throwaway script; they are fixtures, not diagrams).

- [ ] **Step 4: Run all tests**

  Run: `pnpm test`
  Expected: PASS except the known Windows-only test. If the e2e can't close a sub-phase, the fixture is missing a document or diagram: add it to the fixture, never override a `plan-*` item in the test.

- [ ] **Step 5: Commit**

  ```bash
  git add templates/plan catalog examples/estudio-saas tests
  git commit -m "feat(catalog): 2026.10.9 — planning document items and templates"
  ```

### Task 4: Images in client .docx and .pdf

**Files:**
- Modify: `engine/src/docs.ts` (new block, `zip` accepts `Buffer`, DOCX drawing, PDF image XObject), `engine/src/cli.ts:595-615` (`export` resolves images)
- Test: `tests/maintenance.spec.ts` (where `toDocx`/`toPdf` are tested today)

**Interfaces:**
- Produces:
  ```ts
  // docs.ts Block union:
  | { kind: 'image'; alt: string; path: string; data?: Buffer }
  export function loadImages(blocks: Block[], baseDir: string): Block[] // fills data; throws Error(`falta la imagen ${path}`) when the file is missing
  export function pngSize(data: Buffer): { width: number; height: number }
  ```
- A line that is only `![alt](path.png)` becomes an image block. Images scale to the text width (keep aspect ratio). Only PNG is supported; another extension throws `Error('solo PNG: <path>')`.

- [ ] **Step 1: Write the failing tests** in `tests/maintenance.spec.ts`:
  - `markdown image line becomes an image block`: `parseMarkdown('![Gantt](diagrams/implementation-gantt.png)')` → one block `{ kind: 'image', alt: 'Gantt', path: 'diagrams/implementation-gantt.png' }`.
  - `docx embeds the PNG`: build a 2×2 RGB PNG and a 2×2 RGBA PNG in a temp dir with `zlib.deflateSync`; `toDocx(loadImages(blocks, dir))` output contains `word/media/image1.png` and `[Content_Types].xml` has `Extension="png"`.
  - `pdf embeds RGB and RGBA PNGs`: `toPdf` output contains `/Subtype /Image` twice and, for the RGBA one, `/SMask`.
  - `missing image fails with its path`: `loadImages` with a missing file throws matching `/falta la imagen diagrams\/x\.png/`.
  - CLI: `mep export --in docs/client/implementation-v1.md` with a missing image exits non-zero and prints the path.

- [ ] **Step 2: Run to verify they fail**

  Run: `node --test --experimental-strip-types tests/maintenance.spec.ts`
  Expected: FAIL on the new tests

- [ ] **Step 3: Implement.** DOCX: add `word/media/imageN.png`, a relationship in `word/_rels/document.xml.rels`, `<Default Extension="png" ContentType="image/png"/>`, and an inline `<w:drawing>` sized in EMUs. PDF: an image XObject with `/Filter /FlateDecode`; decode the PNG (inflate IDAT, undo the per-row filters), and for color type 6 split RGB and alpha into the image and an `/SMask`. Use only `node:zlib`. `cli.ts` `export` calls `loadImages(blocks, dirname(join(root, input)))` and turns its error into `fail(message)`.

- [ ] **Step 4: Run all tests**

  Run: `pnpm test`
  Expected: PASS except the known Windows-only test

- [ ] **Step 5: Commit**

  ```bash
  git add engine/src/docs.ts engine/src/cli.ts tests/maintenance.spec.ts
  git commit -m "feat(export): PNG images in client docx and pdf"
  ```

### Task 5: Skills and client templates

**Files:**
- Modify: `skills/scope/SKILL.md`, `skills/mep/SKILL.md`, `skills/add/SKILL.md`, `skills/update/SKILL.md`, `skills/export/SKILL.md`
- Create: `templates/client-plan/{PRD,FLOWS,IMPLEMENTATION}.{es,en}.md`
- Test: `tests/plan.spec.ts`

**Interfaces:**
- Consumes: templates and marker keys from Task 3; `export` image support from Task 4.

- [ ] **Step 1: Write the failing test** `client templates exist and never mention internal diagrams`: for each of the six client templates, the file exists and does not contain `state`, `swimlane`, `heatmap`, `sequence`, `trd-` or `schema-` as a diagram name.

- [ ] **Step 2: Run to verify it fails**

  Run: `node --test --experimental-strip-types tests/plan.spec.ts`
  Expected: FAIL (files missing)

- [ ] **Step 3: Write the skill changes and client templates.**
  - `scope`: after `init`, (1) check diagram-design is installed and that `scripts/export_png.py` runs (Python + Playwright); if not, stop and give the install commands; (2) write `PRD.md`, `TRD.md`, `IMPLEMENTATION.md` from `${CLAUDE_PLUGIN_ROOT}/templates/plan/`, in the user's language, with their required diagrams generated by diagram-design and exported to PNG next to the HTML (running `/mep:scope` is the user's request for these exports). Before `foundation.design` closes, diagrams use diagram-design's default profile; after, the project's tokens.
  - `mep`: when the active sub-phase is `foundation.design` and `docs/plan/FLOWS.md` is missing, write it first; same for `build.data` and `SCHEMA.md` when `has_db`. Read `SCHEMA.md` before touching the database and `FLOWS.md` before building a screen. Keep documents in sync when what they describe changes; the `plan-*` items fail when they drift.
  - `add`: after a scope change, update the affected sections of `PRD.md`, `TRD.md` and `IMPLEMENTATION.md`.
  - `update`: when the update brings `plan-*` items, write the missing documents for sub-phases already open or closed, from the profile, code and migrations.
  - `export`: when `context: client-project`, also write `docs/client/<doc>-v<version>.md` for PRD, FLOWS and IMPLEMENTATION from `templates/client-plan/<doc>.<lang>.md` (fall back to `en` and translate), non-technical, reusing only the client-safe PNGs (relative links to `../plan/diagrams/`), then run `export` on each.
  - Client templates: same comment style as `templates/client-brief/brief.en.md`; FLOWS keeps only flows and screens.

- [ ] **Step 4: Run all tests and validate the plugin**

  Run: `pnpm test && pnpm validate`
  Expected: PASS except the known Windows-only test; plugin validates

- [ ] **Step 5: Commit**

  ```bash
  git add skills templates/client-plan tests/plan.spec.ts
  git commit -m "feat(skills): write, maintain and export planning documents"
  ```

### Task 6: Release 0.3.0

**Files:**
- Modify: `package.json`, `.claude-plugin/plugin.json`, `README.md`, `README.es.md` (version and catalog badges; a short "Planning documents" section next to the existing "How it works"), `CHANGELOG.md`

- [ ] **Step 1: Bump and document.** Version `0.3.0`, catalog badge `2026.10.9`. README section: the five documents, when each is written, the diagram-design requirement, and that clients get PRD, FLOWS and IMPLEMENTATION. `CHANGELOG.md` entry `## 0.3.0` in the style of `## 0.2.2`.

- [ ] **Step 2: Run everything**

  Run: `pnpm test && pnpm -s typecheck`
  Expected: PASS except the known Windows-only test

- [ ] **Step 3: Commit**

  ```bash
  git add package.json .claude-plugin/plugin.json README.md README.es.md CHANGELOG.md engine/dist/mep.mjs
  git commit -m "chore(release): 0.3.0 — planning documents"
  ```
