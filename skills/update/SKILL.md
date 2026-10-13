---
name: update
description: Integra al proyecto los ítems nuevos o modificados del catálogo de mep que aplican a su perfil.
argument-hint: ""
allowed-tools: Bash(node *), AskUserQuestion
---

# /mep:update

Motor: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

1. Corre `update`. Muestra solo los ítems nuevos (＋) o modificados (✎) que aplican a este perfil.
2. Explica en una línea cada 🔴 nuevo (su `why`) y aclara: los que caen en una sub-etapa ya cerrada tienen periodo de gracia; no bloquean hasta el siguiente cierre de fase o el deploy a producción.
3. Con la confirmación del usuario: `update --apply`.
4. Si el usuario no quiere un 🟡 nuevo, `/mep:skip`; si no quiere un 🔴 nuevo, `/mep:override` (con razón y confirmación).
