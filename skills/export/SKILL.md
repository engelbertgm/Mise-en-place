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
5. Documentos de planeación para el cliente: solo si el perfil dice `context: client-project`. Para `PRD`, `FLOWS` e `IMPLEMENTATION` que existan en `docs/plan/`:
   - Lee `${CLAUDE_PLUGIN_ROOT}/templates/client-plan/<DOC>.<idioma>.md` (si no existe para ese idioma, usa `.en.md` y tradúcela).
   - Escribe `docs/client/<doc>-v<version>.md` (`prd`, `flows`, `implementation`, con la misma versión del brief) desde el documento interno, con las mismas reglas del brief: lenguaje no técnico, idioma del cliente, sin tarifas ni márgenes. `FLOWS` solo con pantallas y recorridos del usuario final.
   - Diagramas: reusa solo los PNG seguros para el cliente, con enlaces relativos a `../plan/diagrams/`: `prd-journey`, `prd-story-map`, `prd-service-blueprint`, `implementation-gantt`, `implementation-timeline` y los `flows-flowchart-*` de recorridos del usuario final. Nunca `state`, `swimlane`, `heatmap`, `sequence` ni nada de `trd-` o `schema-`. No generes diagramas nuevos.
   - Corre `export --in docs/client/<doc>-v<version>.md --format <formato> --lang <idioma>` por cada uno. Si falla por una imagen, el mensaje dice cuál falta.
6. Entrega las rutas de todos los .docx y .pdf.
