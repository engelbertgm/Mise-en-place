---
name: domain
description: Switch a whole mep domain or subdomain off or on (for example, the backend another team owns), with a reason. Only the user switches off.
argument-hint: "off <domain[.subdomain]> <reason> · on <domain[.subdomain]>"
disable-model-invocation: true
allowed-tools: AskUserQuestion
---

# /mep:domain

Arguments: $ARGUMENTS

Switching a domain off stops counting all its items (🔒 stay active) and marks it ⚠️ in `BRIEF.md`, in `.mep/log` and in the PR summary. Switching it on brings it back. See the names with `/mep:domains`.

With mods, the mod answers this command without a Claude turn: typing it with its reason is the confirmation.

If you got here (no mods): **do not run `off` yourself**; mep's guard denies it. Give the user the command for their terminal:
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" domain off <path> <reason>`
`on` has no restriction.
