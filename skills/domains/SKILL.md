---
name: domains
description: Muestra el avance de mep por dominio (UI, UX, seguridad, pagos, base de datos…) y por subdominio, con qué está apagado o diferido.
argument-hint: "[dominio]"
allowed-tools: Bash(node *)
---

# /mep:domains

Con mods, el mod responde este comando sin turno de Claude. Si llegaste aquí (sin mods), corre
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" domains $ARGUMENTS` y muestra la salida tal cual.

Cada dominio muestra una barra de avance de sus 🔴 y cuántos quedan (● obligatorios, ● recomendados). Sin argumento lista los dominios; con uno, sus subdominios.
Para trabajar uno: `/mep:focus <dominio[.subdominio]>`.
