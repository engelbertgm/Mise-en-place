---
name: focus
description: Lista lo pendiente de un dominio o subdominio de mep, incluidos los ítems de otros dominios que enlazan a él (↗).
argument-hint: "<dominio[.subdominio]>"
allowed-tools: Bash(node *)
---

# /mep:focus

Con mods, el mod responde este comando sin turno de Claude. Si llegaste aquí (sin mods), corre
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" focus $ARGUMENTS` y muestra la salida tal cual.

Los ítems con ↗ tienen su hogar en otro dominio y aparecen aquí como sugerencia: su estado y su nivel se manejan donde viven.
Trabaja en ese dominio, sin esperar a que cierre toda la sub-etapa: un push no lo exige (ver `/mep:launch`).
