---
name: panel
description: Abre el panel de mep junto al chat: pendientes por sub-etapa, el detalle de cada ítem (qué pide, por qué, todo lo que falla) y las acciones del usuario.
---

# /mep:panel

Con mods (Claude Code 2.1.287 o posterior), el mod abre el panel sin turno de Claude. En el panel, un clic en un ítem muestra qué pide, por qué, cómo cumplirlo y la lista completa de lo que falla; ahí mismo el usuario confirma un ítem manual, omite un 🟡 o desactiva un 🔴 con razón. Los conteos 🔴 y 🟡 de arriba abren el primer pendiente de su nivel. ⚙ Herramientas reúne la consulta previa al deploy y al PR, los comandos de mep (check, phase, quote, audit, update, export, phase close, scope, add, log-time) y la actividad reciente de .mep/log.

Si llegaste aquí (sin mods), el panel no está disponible: corre `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" check` y muestra la salida tal cual.
