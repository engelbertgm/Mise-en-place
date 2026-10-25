---
name: scope
description: Crea el brief de un website o webapp desde una descripción en lenguaje natural — perfil, stack justificado y checklist 🔴🟡⚪.
argument-hint: "[--preset landing|corporate|ecommerce|saas|marketplace] <descripción del proyecto>"
allowed-tools: Bash(node *), Read, Write, Edit, AskUserQuestion
---

# /mep:scope

Scope del usuario: $ARGUMENTS

Sigue el skill `mep` para interpretar el scope. Motor: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

1. Si ya existe `.mep/profile.yaml`, detente y sugiere `/mep:add`.
2. Lee `${CLAUDE_PLUGIN_ROOT}/catalog/dimensions.yaml` (valores válidos) y, si se indicó `--preset` o hay uno cercano, `${CLAUDE_PLUGIN_ROOT}/catalog/presets/<preset>.yaml`.
3. Propón el perfil (tipo, capacidades, mercados, audiencia, contexto, señales, counts) en una tabla corta. Pregunta **solo** lo que cambia 🔴 o los counts (ver skill `mep`). Si el scope cobra algo y no queda claro, pregunta si el pago es con enlace del proveedor (`payment-links`) o con checkout propio (`payments`); no marques `has_db` sin algo que guardar.
4. Escribe en `summary` un párrafo con las palabras del usuario: qué es el proyecto, para quién y qué debe lograr (encabeza SCOPE.md). Las features del scope que no están en el catálogo (ej. "agenda por instructor") van en `custom_work` con su talla: `[{ title, size: XS|S|M|L|XL, phase }]`. Escribe la propuesta en `.mep/draft.yaml` (incluye `project` y `preset` si aplica) y corre `evaluate --from .mep/draft.yaml`. Si el motor rechaza un valor, corrígelo; no inventes valores.
5. Muestra el resultado agrupado (🔴, 🟡, ⚪ por categoría) y las recomendaciones de stack con su porqué. Pide al usuario que elija los ⚪ que quiere y confirme.
6. Con la confirmación:
   - `init --from .mep/draft.yaml` (crea `.mep/profile.yaml`, `SCOPE.md`, `BRIEF.md`, ADRs de stack, enlaza `CLAUDE.md` y agrega `.github/workflows/mep.yml`).
   - `select <id> <id>…` con los ⚪ elegidos (si hay).
   - Borra `.mep/draft.yaml`.
   - `codemap` y `registry` para crear `CODEMAP.md` y `REGISTRY.md`.
   - `init` instala `tests/responsive.spec.ts` y el script `test:responsive`: pide editar `PAGES` con las rutas clave y agregar `@playwright/test` si no está.
   - `init` ya calcula la cotización (el toggle: solo corre al definir el scope y en cambios de scope). Muestra su línea; si la tarifa está en 0, indica dónde definirla.
7. Si el plugin Ponytail no está instalado, sugiérelo una vez (`DietrichGebert/ponytail`); mep funciona igual sin él.
8. Cierra con: sub-etapa activa (`foundation.setup`), cuántos 🔴 tiene y el siguiente paso. Recuerda hacer `mep` check obligatorio del PR a `main` en GitHub.
