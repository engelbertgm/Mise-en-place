---
name: prelaunch
description: Security review before going live, line by line (password hashing, keys, RLS, HTTPS, XSS/SQL, rate limits, CSRF, cookies, uploads — allowed formats and content checked —, admin, prices, debug, packages, git history). Can run at any time.
argument-hint: "[--full]"
allowed-tools: Bash(node *)
---

# /mep:prelaunch

With mods, the mod answers this command without a Claude turn. If you got here (no mods), run
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" prelaunch $ARGUMENTS` and show the output as is.

Each line gathers the catalog items that fulfil it: ✅ done · ❌ something is missing (says what) · ❔ commands or the build still need to run (`--full`) · ⊘ not applicable to this scope (no uploads, no admin, no payments…). Security items only count with their `mep-security` audit.

It changes nothing and requires nothing by itself: `/mep:launch` asks for these same items together with everything else, so run it early and fix without hurry. To work on one area: `/mep:focus security`.
