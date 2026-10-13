---
name: add
description: Agrega o cambia scope en un proyecto con mep y muestra solo el diff del checklist (ítems nuevos, que suben de nivel o que dejan de aplicar).
argument-hint: "<cambio de scope en lenguaje natural>"
allowed-tools: Bash(node *), Read, Write, AskUserQuestion
---

# /mep:add

Cambio pedido: $ARGUMENTS

Motor: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

1. Lee `.mep/profile.yaml`. Traduce el cambio a campos del perfil (skill `mep`): capacidades, mercados, audiencia, señales, counts o stack. Pregunta solo si cambia 🔴.
2. Escribe en `.mep/change.yaml` **solo** los campos que cambian, con su valor completo (ej. la lista entera de `capabilities`).
3. Corre `add --from .mep/change.yaml` y muestra el diff tal cual. No muestres el checklist completo.
4. Si el usuario confirma: `add --from .mep/change.yaml --apply`. Borra `.mep/change.yaml`.
5. Si cambió una decisión de stack, el motor escribe un ADR nuevo que reemplaza al anterior; menciónalo.
