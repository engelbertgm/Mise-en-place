---
name: confirm
description: Confirma un ítem manual del brief de mep (lo que solo una persona puede afirmar). Solo la escribe el usuario.
argument-hint: "<id>"
disable-model-invocation: true
---

# /mep:confirm

Argumentos: $ARGUMENTS

Con mods, el mod responde este comando sin turno de Claude: el motor registra la confirmación con el usuario de git (nombre y email), no con un nombre escrito, y la anota en `.mep/log` (aparece en el resumen del PR). Los ítems de seguridad no se confirman así: los confirma una auditoría de `mep-security`.

Si llegaste aquí (sin mods), **no lo ejecutes tú**: la guardia de mep niega confirmaciones desde el Bash del agente. Dale al usuario el comando para su propia terminal (le pedirá teclear el id):
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" confirm <id>`
