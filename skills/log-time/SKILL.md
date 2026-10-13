---
name: log-time
description: Registra horas reales por ítem del brief de mep (fuera del repo) para calibrar estimaciones futuras.
argument-hint: "<id> <horas>"
disable-model-invocation: true
allowed-tools: Bash(node *)
---

# /mep:log-time

Corre `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" log-time $ARGUMENTS` y muestra la salida.

- Las horas se guardan en `~/.config/mep-check/actuals/<proyecto>.yaml`, nunca en el repo.
- Para trabajo a la medida usa `custom:<nombre>` como id.
- Después de registrar, corre `calibrate`: si un ítem tiene 3 o más mediciones con la mediana fuera de su rango, muestra la sugerencia de ajuste.
