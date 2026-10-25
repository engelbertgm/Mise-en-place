---
name: override
description: Desactiva un ítem 🔴 obligatorio del brief de mep, con razón. Solo la escribe el usuario; rechaza ítems locked.
argument-hint: "<id> <razón>"
disable-model-invocation: true
allowed-tools: AskUserQuestion
---

# /mep:override

Argumentos: $ARGUMENTS

Con mods (Claude Code 2.1.287 o posterior), el mod responde este comando sin turno de Claude: escribir `/mep:override <id> <razón>` es la confirmación, y el motor muestra el riesgo aceptado (`why` del ítem). Rechaza ítems 🔒 y lo registra en `.mep/log`; en `BRIEF.md` queda marcado ⚠️ y aparece en el resumen del PR.

Si llegaste aquí (sin mods):

1. Si falta la razón, pídela.
2. Explica en una línea qué riesgo se acepta (el `why` del ítem en `BRIEF.md`).
3. **No lo ejecutes tú**: desactivar un 🔴 es decisión del usuario, y la guardia de mep lo niega desde el Bash del agente. Dale el comando para su propia terminal (le pedirá teclear el id):
   `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" override <id> <razón> --yes`

Para relajar umbrales de calidad está `/mep:threshold`.
