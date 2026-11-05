---
name: check
description: Check the repo against the mep checklist and show the state by sub-phase (✅ ❌ ⏭️ ⚠️), plus signals in the code that the profile lacks.
argument-hint: "[--all]"
allowed-tools: Bash(node *)
---

# /mep:check

Run `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" check $ARGUMENTS` and show the output as is.

- HTML checks run on the build: if they show ❔ "no build output", suggest running the build.
- If the engine reports signals the profile lacks, suggest `/mep:add` to add them.
- Never mark anything as done yourself: manual items are confirmed by the user with `/mep:confirm <id>` (you cannot: the guard denies it), and security items only by a `mep-security` audit.
