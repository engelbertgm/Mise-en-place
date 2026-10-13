---
name: quote
description: Muestra la cotización del proyecto desde el brief de mep (vista interna o vista cliente).
argument-hint: "[--client]"
disable-model-invocation: true
allowed-tools: Bash(node *)
---

# /mep:quote

Corre `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" quote $ARGUMENTS` y muestra la salida tal cual.

- Sin `--client`: vista interna (horas por ítem y sub-etapa, tarifa, gestión y colchón). Es para el usuario, nunca para el cliente.
- Con `--client`: precio por fase y total, extras opcionales, costos recurrentes y planes de mantenimiento; sin tarifa, márgenes ni colchón.
- Si la tarifa está en 0, indica que se define en `~/.config/mep-check/rates.yaml` (fuera del repo).
- La cotización corre sola solo al definir el scope (`/mep:scope`) y en cambios de scope (`/mep:add`). Este comando es la consulta manual.
