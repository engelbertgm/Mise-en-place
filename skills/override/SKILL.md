---
name: override
description: Desactiva un ítem 🔴 obligatorio del brief de mep, con razón y confirmación explícita. Rechaza ítems locked.
argument-hint: "<id> <razón>"
disable-model-invocation: true
allowed-tools: Bash(node *), AskUserQuestion
---

# /mep:override

Argumentos: $ARGUMENTS

1. Si falta la razón, pídela.
2. Explica en una línea qué riesgo se acepta al desactivar el ítem (lee su `why` en el catálogo o en `BRIEF.md`).
3. Pide confirmación explícita con AskUserQuestion ("Desactivar <id>" / "Cancelar").
4. Solo si confirma: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" override <id> <razón> --yes`.

El motor rechaza ítems 🔒 locked y registra el override en `.mep/log`; en `BRIEF.md` queda marcado ⚠️.
