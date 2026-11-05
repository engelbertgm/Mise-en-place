---
name: threshold
description: Change a mep quality threshold (complexity, lines per file or per function). Relaxing one needs a reason and only the user types it.
argument-hint: "<complexity|max_lines|max_function_lines|max_params> <value> [reason]"
disable-model-invocation: true
---

# /mep:threshold

Arguments: $ARGUMENTS

Defaults: complexity 10, 300 lines per file, 50 per function. Making them stricter needs no reason. Relaxing them does: it is marked ⚠️ in `BRIEF.md`, in `.mep/log` and in the PR summary.

With mods, the mod answers this command without a Claude turn: typing it with its reason is the confirmation.

If you got here (no mods) and the value relaxes the threshold, **do not run it yourself**: give the user the command for their own terminal (it asks them to type the key):
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" threshold <key> <value> <reason> --yes`
