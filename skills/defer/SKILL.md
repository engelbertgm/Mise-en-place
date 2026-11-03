---
name: defer
description: Pospone un ítem 🔴 hasta el go-live, con razón: no frena sub-etapas ni pushes, pero mep launch lo exige. Solo la escribe el usuario.
argument-hint: "<id> <razón> · undo <id>"
disable-model-invocation: true
allowed-tools: AskUserQuestion
---

# /mep:defer

Argumentos: $ARGUMENTS

Diferir no es apagar: el ítem sigue siendo obligatorio y `/mep:launch` lo exige. Mientras tanto no cuenta para cerrar la sub-etapa ni para un push o PR, y queda con ⏳ en el panel, en `BRIEF.md` y en `.mep/log`. `/mep:defer undo <id>` lo devuelve a la lista normal.

Con mods, el mod responde este comando sin turno de Claude: escribirlo con su razón es la confirmación. Rechaza ítems 🔒 y los que no son 🔴.

Si llegaste aquí (sin mods): **no lo ejecutes tú**; la guardia de mep lo niega desde el Bash del agente. Dale el comando para su terminal (le pedirá teclear el id):
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" defer <id> <razón>`
