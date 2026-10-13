---
name: skip
description: Omite un ítem 🟡 recomendado del brief de mep, con razón escrita.
argument-hint: "<id> <razón>"
disable-model-invocation: true
allowed-tools: Bash(node *)
---

# /mep:skip

Corre `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" skip $ARGUMENTS` y muestra la salida.

Solo acepta 🟡. Si falta la razón, pídela. Si el ítem es 🔴, explica que se usa `/mep:override`.
