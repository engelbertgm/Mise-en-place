---
name: log-time
description: Log real hours per mep brief item (outside the repo) to calibrate future estimates.
argument-hint: "<id> <hours>"
disable-model-invocation: true
allowed-tools: Bash(node *)
---

# /mep:log-time

Run `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" log-time $ARGUMENTS` and show the output.

- Hours are stored in `~/.config/mep-check/actuals/<project>.yaml`, never in the repo.
- For custom work use `custom:<name>` as the id.
- After logging, run `calibrate`: if an item has 3 or more measurements and their median falls outside its range, show the suggested adjustment.
