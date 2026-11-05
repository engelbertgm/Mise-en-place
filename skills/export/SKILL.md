---
name: export
description: Generate the mep client brief as .docx and .pdf, in the client's language, with scope, out of scope, quote, acceptance criteria and version.
argument-hint: "[--format docx|pdf|both] [--lang es|en|…]"
allowed-tools: Bash(node *), Read, Write
---

# /mep:export

Arguments: $ARGUMENTS (default `--format both --lang es`).

Engine: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

1. Run `export-data --lang <language>`: structured project data, the number of the next version (`version`) and the changes from the previous one (`changes`).
2. Read the template `${CLAUDE_PLUGIN_ROOT}/templates/client-brief/brief.<language>.md` (if it does not exist for that language, use `brief.en.md` and translate it).
3. Write the document to `docs/client/brief-v<version>.md` following the template, in the client's language and in **non-technical language**:
   - Use only the Markdown the engine converts: `#`, `##`, `###`, paragraphs, `-` and `1.` lists, `| |` tables, `> quote`, `---` (page break) and `**bold**`. No emojis.
   - Acceptance criteria: translate each 🔴 into what the client can check ("The site loads with the security padlock"), not how it is implemented.
   - Out of scope: explicit, with the capabilities not included that the client might assume and the optional items not chosen.
   - Schedule: use `schedule.weeks_by_phase` in the table of deliverables per phase (estimated weeks, from `weekly_hours` in `rates.yaml`).
   - Quote: client view only (price per phase, total, extras, recurring, maintenance). Never hourly rate, margins or buffer.
   - If `changes` exists, add "Changes from the previous version".
   - Include the legal note from `legal_note`.
4. Run `export --in docs/client/brief-v<version>.md --format <format> --lang <language>`.
5. Planning documents for the client: only if the profile says `context: client-project`. For the `PRD`, `FLOWS` and `IMPLEMENTATION` that exist in `docs/plan/`:
   - Read `${CLAUDE_PLUGIN_ROOT}/templates/client-plan/<DOC>.<language>.md` (if it does not exist for that language, use `.en.md` and translate it).
   - Write `docs/client/<doc>-v<version>.md` (`prd`, `flows`, `implementation`, with the same version as the brief) from the internal document, with the brief's rules: non-technical language, the client's language, no rates or margins. `FLOWS` with end-user screens and journeys only.
   - Diagrams: reuse only the client-safe PNGs, with relative links to `../plan/diagrams/`: `prd-journey`, `prd-story-map`, `prd-service-blueprint`, `implementation-gantt`, `implementation-timeline` and the end-user `flows-flowchart-*`. Never `state`, `swimlane`, `heatmap`, `sequence` or anything from `trd-` or `schema-`. Do not generate new diagrams.
   - Run `export --in docs/client/<doc>-v<version>.md --format <format> --lang <language>` for each one. If it fails on an image, the message says which one is missing.
6. Deliver the paths of all the .docx and .pdf files.
