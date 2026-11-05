---
name: add
description: Add or change scope in a project with mep and show only the checklist diff (items that are new, move up a level or stop applying).
argument-hint: "<scope change in natural language>"
allowed-tools: Bash(node *), Bash(python *), Bash(python3 *), Read, Write, Edit, AskUserQuestion, Skill
---

# /mep:add

Requested change: $ARGUMENTS

Engine: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

1. Read `.mep/profile.yaml`. Translate the change into profile fields (`mep` skill): capabilities, markets, audience, signals, counts or stack. Ask only if it changes a 🔴.
2. Write into `.mep/change.yaml` **only** the fields that change, with their full value (e.g. the whole `capabilities` list or the whole `tailoring`). Re-fit as you go: a change can make something left out apply again (adding teams brings back `saas-teams`: remove it from `tailoring.not_applicable`) or make new items not fit this project (add them with a reason). Ask if unsure.
3. Run `add --from .mep/change.yaml` and show the diff as is, with its impact line in hours and price. Do not show the full checklist.
4. If the change alters what the project is, update `summary` too. If the user confirms: `add --from .mep/change.yaml --apply` (it recalculates and saves the internal quote outside the repo). Delete `.mep/change.yaml`.
5. If a stack decision changed, the engine writes a new ADR that replaces the old one; mention it.
6. If the project keeps planning docs in `docs/plan/` (the user chose them), update the affected sections and run `check`. If it has none, do not create them.
