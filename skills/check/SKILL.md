---
name: check
description: Verifica el repo contra el checklist de mep y muestra el estado por sub-etapa (✅ ❌ ⏭️ ⚠️), más señales del código que el perfil no tiene.
argument-hint: "[--all]"
allowed-tools: Bash(node *)
---

# /mep:check

Corre `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" check $ARGUMENTS` y muestra la salida tal cual.

- Las verificaciones de HTML corren sobre el build: si salen como ❔ "sin salida de build", sugiere correr el build.
- Si el motor avisa señales que el perfil no tiene, propone `/mep:add` para incorporarlas.
- No marques nada como cumplido por tu cuenta: los ítems manuales los confirma el usuario con `/mep:confirm <id>` (tú no puedes: la guardia lo niega), y los de seguridad solo con una auditoría de `mep-security`.
