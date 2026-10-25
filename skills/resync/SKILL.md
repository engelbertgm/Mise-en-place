---
name: resync
description: Vuelve a sellar el estado de mep cuando cambió fuera de la CLI (por ejemplo, al resolver un conflicto de merge en .mep/log). Solo la escribe el usuario.
disable-model-invocation: true
---

# /mep:resync

El estado de mep (`.mep/profile.yaml`, `log`, `security/`, `reviews/`) solo cambia con la CLI; cada cambio queda sellado en `.mep/log`. Si algo lo editó por fuera, `mep verify` bloquea hasta que el usuario lo revise y lo acepte como suyo.

Antes de re-sellar, revisa el cambio: `git diff -- .mep`. El re-sellado queda en `.mep/log` con el usuario de git y aparece en el resumen del PR.

Con mods, el mod responde este comando sin turno de Claude. Si llegaste aquí (sin mods), **no lo ejecutes tú**: dale al usuario el comando para su propia terminal (le pedirá teclear `resync`):
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" resync`
