---
name: confirm
description: Confirm a manual item of the mep brief (what only a person can state). Only the user types it.
argument-hint: "<id>"
disable-model-invocation: true
---

# /mep:confirm

Arguments: $ARGUMENTS

With mods, the mod answers this command without a Claude turn: the engine records the confirmation with the git user (name and email), not a typed name, and writes it to `.mep/log` (it shows in the PR summary). Security items are not confirmed this way: a `mep-security` audit confirms them.

If you got here (no mods), **do not run it yourself**: mep's guard denies confirmations from the agent's Bash. Give the user the command for their own terminal (it asks them to type the id):
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" confirm <id>`
