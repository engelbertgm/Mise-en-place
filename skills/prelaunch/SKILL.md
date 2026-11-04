---
name: prelaunch
description: Revisión de seguridad antes de salir en vivo, línea por línea (hashing de contraseñas, llaves, RLS, HTTPS, XSS/SQL, rate limit, CSRF, cookies, subidas —formatos permitidos y contenido revisado—, admin, precios, debug, paquetes, historial de git). Se puede correr a cualquier hora.
argument-hint: "[--full]"
allowed-tools: Bash(node *)
---

# /mep:prelaunch

Con mods, el mod responde este comando sin turno de Claude. Si llegaste aquí (sin mods), corre
`node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" prelaunch $ARGUMENTS` y muestra la salida tal cual.

Cada línea junta los ítems del catálogo que la cumplen: ✅ lista · ❌ falta algo (dice qué) · ❔ falta correr comandos o el build (`--full`) · ⊘ no aplica a este scope (sin subidas, sin admin, sin cobros…). Los ítems de seguridad solo cuentan con su auditoría de `mep-security`.

No cambia nada y no exige nada por sí sola: `/mep:launch` pide estos mismos ítems junto con todo lo demás, así que conviene correrla antes y arreglar sin prisa. Para trabajar un área: `/mep:focus security`.
