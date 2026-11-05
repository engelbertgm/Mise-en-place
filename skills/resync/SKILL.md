---
name: resync
description: Re-seal mep's state when it changed outside the CLI (for example, resolving a merge conflict in .mep/log). Only the user types it.
disable-model-invocation: true
---

# /mep:resync

mep's state (`.mep/profile.yaml`, `log`, `security/`, `reviews/`) only changes through the CLI; every change is sealed in `.mep/log`. If something edited it from outside, `mep verify` blocks until the user reviews it and accepts it as theirs.

Before re-sealing, review the change: `git diff -- .mep`. The re-seal is recorded in `.mep/log` with the git user and shows in the PR summary.

With mods, the mod answers this command without a Claude turn. If you got here (no mods), **do not run it yourself**: give the user the command for their own terminal (it asks them to type `resync`):
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" resync`
