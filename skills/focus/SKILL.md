---
name: focus
description: List what is pending in a mep domain or subdomain, including items from other domains that link to it (↗).
argument-hint: "<domain[.subdomain]>"
allowed-tools: Bash(node *)
---

# /mep:focus

With mods, the mod answers this command without a Claude turn. If you got here (no mods), run
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" focus $ARGUMENTS` and show the output as is.

Items marked ↗ live in another domain and show here as a suggestion: their state and level are managed where they live.
Work in that domain without waiting for the whole sub-phase to close: a push does not require it (see `/mep:launch`).
