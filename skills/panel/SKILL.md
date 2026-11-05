---
name: panel
description: Open the mep panel beside the chat: pending items by sub-phase or domain, each item's detail (what it asks, why, everything that fails), the flow line and the user's actions.
---

# /mep:panel

With mods (Claude Code 2.1.287 or later), the mod opens the panel without a Claude turn. In the panel, a click on an item shows what it asks, why, how to meet it and the full list of what fails; there the user confirms a manual item, skips a 🟡, postpones a 🔴 until go-live or turns it off with a reason. The 🔴 and 🟡 counts at the top open the first pending item of their level. ⇢ Flow shows which command to run and when (a click writes it in the chat). ⚙ Tools gathers the pre-deploy and pre-PR checks, mep's commands and the recent activity of .mep/log.

If you got here (no mods), the panel is not available: run `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" check` and show the output as is.
