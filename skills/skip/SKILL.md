---
name: skip
description: Skip a 🟡 recommended item of the mep brief, with a written reason.
argument-hint: "<id> <reason>"
disable-model-invocation: true
allowed-tools: Bash(node *)
---

# /mep:skip

Run `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" skip $ARGUMENTS` and show the output.

Accepts 🟡 only. If the reason is missing, ask for it. If the item is 🔴, explain that `/mep:override` is the command.
