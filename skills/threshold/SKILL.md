---
name: threshold
description: Cambia un umbral de calidad de mep (complejidad, líneas por archivo o por función). Relajarlo pide razón y solo lo escribe el usuario.
argument-hint: "<complexity|max_lines|max_function_lines|max_params> <valor> [razón]"
disable-model-invocation: true
---

# /mep:threshold

Argumentos: $ARGUMENTS

Por defecto: complejidad 10, 300 líneas por archivo, 50 por función. Hacerlos más estrictos no requiere razón. Relajarlos sí: queda marcado ⚠️ en `BRIEF.md`, en `.mep/log` y en el resumen del PR.

Con mods, el mod responde este comando sin turno de Claude: escribirlo con su razón es la confirmación.

Si llegaste aquí (sin mods) y el valor relaja el umbral, **no lo ejecutes tú**: dale al usuario el comando para su propia terminal (le pedirá teclear la clave):
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" threshold <clave> <valor> <razón> --yes`
