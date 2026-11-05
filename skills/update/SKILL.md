---
name: update
description: Bring into the project the new or modified mep catalog items that apply to its profile.
argument-hint: ""
allowed-tools: Bash(node *), Bash(python *), Bash(python3 *), Read, Write, Edit, AskUserQuestion, Skill
---

# /mep:update

Engine: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

1. Run `update`. It shows only the new (＋) or modified (✎) items that apply to this profile.
2. Explain each new 🔴 in one line (its `why`) and clarify: those that land in an already closed sub-phase get a grace period; they do not block until the next phase close or the production deploy.
3. With the user's confirmation: `update --apply`.
4. `plan-*` items are optional. Do not write planning documents for the update; mention they exist and write them only if the user asks.
5. If the user does not want a new 🟡, `/mep:skip`; if they do not want a new 🔴, `/mep:override` (with a reason and confirmation).
