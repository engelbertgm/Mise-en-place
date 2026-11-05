---
name: quote
description: Show the project quote from the mep brief (internal view or client view).
argument-hint: "[--client]"
disable-model-invocation: true
allowed-tools: Bash(node *)
---

# /mep:quote

Run `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" quote $ARGUMENTS` and show the output as is.

- Without `--client`: internal view (hours per item and sub-phase, rate, management and buffer). For the user, never for the client.
- With `--client`: price per phase and total, optional extras, recurring costs and maintenance plans; no rate, margins or buffer.
- If the rate is 0, say it is set in `~/.config/mep-check/rates.yaml` (outside the repo).
- The quote runs by itself only when the scope is defined (`/mep:scope`) and when it changes (`/mep:add`). This command is the manual lookup.
