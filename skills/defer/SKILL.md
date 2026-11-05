---
name: defer
description: Postpone a 🔴 item until go-live, with a reason: it does not stop sub-phases or pushes, but mep launch requires it. Only the user types it.
argument-hint: "<id> <reason> · undo <id>"
disable-model-invocation: true
allowed-tools: AskUserQuestion
---

# /mep:defer

Arguments: $ARGUMENTS

Deferring is not turning off: the item stays required and `/mep:launch` requires it. Meanwhile it does not count to close the sub-phase or for a push or PR, and it shows ⏳ in the panel, in `BRIEF.md` and in `.mep/log`. `/mep:defer undo <id>` returns it to the normal list.

With mods, the mod answers this command without a Claude turn: typing it with its reason is the confirmation. It rejects 🔒 items and anything that is not 🔴.

If you got here (no mods): **do not run it yourself**; mep's guard denies it from the agent's Bash. Give the user the command for their terminal (it asks them to type the id):
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" defer <id> <reason>`
