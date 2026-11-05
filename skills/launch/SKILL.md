---
name: launch
description: mep go-live. Runs the full gate once (every 🔴 of the active domains, in every sub-phase); if it passes, the project is live and every push to main is a production deploy.
disable-model-invocation: true
allowed-tools: Bash(node *)
---

# /mep:launch

While the project is **building** (`stage: building`), a push or PR to `main` only stops on secrets, violated 🔒 items or regressions in already closed sub-phases: nothing needs to be closed to push progress. `/mep:launch` is the moment to go live.

With mods, the mod answers this command without a Claude turn. If you got here (no mods), run
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" launch` and show the output as is.

- Before, at any time: `/mep:prelaunch` reviews security line by line without requiring anything.
- If 🔴 items are missing, the engine lists them grouped by domain (`Por dominio: seguridad 8 · pagos 5`). Fix them, defer them with `/mep:defer` only if they can truly wait (go-live still requires them), or switch a domain off with `/mep:domain off` if it is not part of the project.
- Once live, going back to building is the user's decision: `mep stage building`.
