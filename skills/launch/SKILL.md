---
name: launch
description: Go-live de mep. Corre la barrera completa una vez (todos los 🔴 de los dominios activos, en todas las sub-etapas); si pasa, el proyecto queda en vivo y cada push a main es un deploy a producción.
disable-model-invocation: true
allowed-tools: Bash(node *)
---

# /mep:launch

Mientras el proyecto está **en construcción** (`stage: building`), un push o un PR a `main` solo se detiene por secretos, ítems 🔒 violados o regresiones en sub-etapas ya cerradas: no hace falta cerrar nada para subir avance. `/mep:launch` es el momento de salir en vivo.

Con mods, el mod responde este comando sin turno de Claude. Si llegaste aquí (sin mods), corre
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" launch` y muestra la salida tal cual.

- Antes, a cualquier hora: `/mep:prelaunch` revisa la seguridad línea por línea sin exigir nada.
- Si faltan 🔴, el motor los lista agrupados por dominio (`Por dominio: seguridad 8 · pagos 5`). Arréglalos, difiérelos con `/mep:defer` solo si de verdad pueden esperar (igual los exige el go-live), o apaga un dominio con `/mep:domain off` si no es del proyecto.
- Ya en vivo, volver a construcción lo decide el usuario: `mep stage building`.
