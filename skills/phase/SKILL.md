---
name: phase
description: Muestra la sub-etapa activa de mep y qué falta para cerrarla, o la cierra (close) si sus 🔴 están cumplidos.
argument-hint: "[close <sub-etapa>]"
allowed-tools: Bash(node *), Agent, Skill
---

# /mep:phase

Argumentos: $ARGUMENTS

Motor: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

**Sin argumentos:** corre `phase` y muestra la salida.

**`close <sub-etapa>`:** cerrar es cuando se revisa que estemos cumpliendo.
1. Regenera los mapas (`codemap` y `registry`) y corre `check` para ver el estado completo de la sub-etapa. Si `registry` reporta piezas sin "Para qué", escríbelo en el comentario `/** */` de cada una.
2. Si la sub-etapa es `foundation.setup`, `build.data`, `build.features` o `launch.ops`, lanza el agente `mep-security` para auditar los ítems de seguridad de esa sub-etapa (registra reportes con `security record`).
3. Revisión de calidad (el motor la exige para cerrar). Corre `review` para saber si Ponytail está instalado.
   - Con Ponytail: corre `/ponytail-review` y registra el resultado: `review record --tool ponytail --must-fix <n> --notes "..."`.
   - Sin Ponytail: revisa duplicados, nombres, complejidad y reutilización contra REGISTRY.md y registra: `review record --tool mep --must-fix <n>`.
   - Si hay "must fix", arréglalos y vuelve a revisar y registrar con `--must-fix 0`. Registra la revisión al final: si el código cambia después, vence.
4. Corre `phase close <sub-etapa>`. Si falla, muestra lo pendiente y no insistas: arregla o pregunta.
5. Al cerrar, los 🔴 de esa sub-etapa quedan protegidos contra regresiones. Antes de `launch.*`, si Ponytail está instalado, corre `/ponytail-debt`.
