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
1. Corre `check` para ver el estado completo de la sub-etapa.
2. Si la sub-etapa es `foundation.setup`, `build.data`, `build.features` o `launch.ops`, lanza el agente `mep-security` para auditar los ítems de seguridad de esa sub-etapa (registra reportes con `security record`).
3. Revisión de calidad: si Ponytail está instalado, corre `/ponytail-review`; sus hallazgos "must fix" bloquean el cierre. Si no, haz una revisión propia de duplicados, nombres, complejidad y reutilización.
4. Corre `phase close <sub-etapa>`. Si falla, muestra lo pendiente y no insistas: arregla o pregunta.
5. Al cerrar, los 🔴 de esa sub-etapa quedan protegidos contra regresiones. Antes de `launch.*`, si Ponytail está instalado, corre `/ponytail-debt`.
