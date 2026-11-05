---
name: domains
description: Show mep progress by domain (UI, UX, security, payments, database…) and subdomain, with what is switched off or deferred.
argument-hint: "[domain]"
allowed-tools: Bash(node *)
---

# /mep:domains

With mods, the mod answers this command without a Claude turn. If you got here (no mods), run
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" domains $ARGUMENTS` and show the output as is.

Each domain shows a progress bar of its 🔴 and how many are left (● required, ● recommended). No argument lists the domains; with one, its subdomains.
To work on one: `/mep:focus <domain[.subdomain]>`.
