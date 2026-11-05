---
name: override
description: Turn off a 🔴 required item of the mep brief, with a reason. Only the user types it; rejects locked items.
argument-hint: "<id> <reason>"
disable-model-invocation: true
allowed-tools: AskUserQuestion
---

# /mep:override

Arguments: $ARGUMENTS

With mods (Claude Code 2.1.287 or later), the mod answers this command without a Claude turn: typing `/mep:override <id> <reason>` is the confirmation, and the engine shows the accepted risk (the item's `why`). It rejects 🔒 items and records the override in `.mep/log`; in `BRIEF.md` it is marked ⚠️ and it shows in the PR summary.

If you got here (no mods):

1. If the reason is missing, ask for it.
2. Explain in one line what risk is accepted (the item's `why` in `BRIEF.md`).
3. **Do not run it yourself**: turning off a 🔴 is the user's decision, and mep's guard denies it from the agent's Bash. Give the user the command for their own terminal (it asks them to type the id):
   `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" override <id> <reason> --yes`

To relax quality thresholds there is `/mep:threshold`.
