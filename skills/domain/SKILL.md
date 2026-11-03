---
name: domain
description: Apaga o enciende un dominio o subdominio entero de mep (por ejemplo, el backend que lleva otro equipo), con razón. Apagar solo lo escribe el usuario.
argument-hint: "off <dominio[.subdominio]> <razón> · on <dominio[.subdominio]>"
disable-model-invocation: true
allowed-tools: AskUserQuestion
---

# /mep:domain

Argumentos: $ARGUMENTS

Apagar un dominio deja de contar todos sus ítems (los 🔒 siguen activos) y queda marcado ⚠️ en `BRIEF.md`, en `.mep/log` y en el resumen del PR. Encenderlo lo devuelve. Mira los nombres con `/mep:domains`.

Con mods, el mod responde este comando sin turno de Claude: escribirlo con su razón es la confirmación.

Si llegaste aquí (sin mods): **no lo ejecutes tú** para apagar; la guardia de mep lo niega. Dale el comando para su terminal:
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" domain off <ruta> <razón>`
Para encender (`on`) no hay restricción.
