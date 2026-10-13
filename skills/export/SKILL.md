---
name: export
description: Genera el brief para el cliente de mep en .docx y .pdf, en el idioma del cliente, con alcance, fuera de alcance, cotización, criterios de aceptación y versión.
argument-hint: "[--format docx|pdf|both] [--lang es|en|…]"
allowed-tools: Bash(node *), Read, Write
---

# /mep:export

Argumentos: $ARGUMENTS (por defecto `--format both --lang es`).

Motor: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

1. Corre `export-data --lang <idioma>`: datos estructurados del proyecto, número de la próxima versión (`version`) y cambios respecto a la anterior (`changes`).
2. Lee la plantilla `${CLAUDE_PLUGIN_ROOT}/templates/client-brief/brief.<idioma>.md` (si no existe para ese idioma, usa `brief.en.md` y tradúcela).
3. Escribe el documento en `docs/client/brief-v<version>.md` siguiendo la plantilla, en el idioma del cliente y en **lenguaje no técnico**:
   - Usa solo el Markdown que el motor convierte: `#`, `##`, `###`, párrafos, listas `-` y `1.`, tablas `| |`, `> cita`, `---` (salto de página) y `**negritas**`. Sin emojis.
   - Criterios de aceptación: traduce cada 🔴 a lo que el cliente puede comprobar ("El sitio carga con candado de seguridad"), no a cómo se implementa.
   - Fuera de alcance: explícito, con las capacidades no incluidas que el cliente podría suponer y los opcionales no elegidos.
   - Cronograma: usa `schedule.weeks_by_phase` en la tabla de entregables por fase (semanas estimadas, según `weekly_hours` de `rates.yaml`).
   - Cotización: solo la vista cliente (precio por fase, total, extras, recurrentes, mantenimiento). Nunca tarifa por hora, márgenes ni colchón.
   - Si `changes` existe, agrega "Cambios respecto a la versión anterior".
   - Incluye la nota legal de `legal_note`.
4. Corre `export --in docs/client/brief-v<version>.md --format <formato> --lang <idioma>`.
5. Entrega las rutas del .docx y del .pdf.
