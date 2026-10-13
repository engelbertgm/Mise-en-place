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
3. Propón el perfil (tipo, capacidades, mercados, audiencia, contexto, señales, counts) en una tabla corta. Pregunta **solo** lo que cambia 🔴 o los counts (ver skill `mep`).
4. Escribe la propuesta en `.mep/draft.yaml` (incluye `project` y `preset` si aplica) y corre `evaluate --from .mep/draft.yaml`. Si el motor rechaza un valor, corrígelo; no inventes valores.
5. Muestra el resultado agrupado (🔴, 🟡, ⚪ por categoría) y las recomendaciones de stack con su porqué. Pide al usuario que elija los ⚪ que quiere y confirme.
6. Con la confirmación:
   - `init --from .mep/draft.yaml` (crea `.mep/profile.yaml`, `BRIEF.md`, ADRs de stack, enlaza `CLAUDE.md` y agrega `.github/workflows/mep.yml`).
   - `select <id> <id>…` con los ⚪ elegidos (si hay).
   - Borra `.mep/draft.yaml`.
7. Si el plugin Ponytail no está instalado, sugiérelo una vez (`DietrichGebert/ponytail`); mep funciona igual sin él.
8. Cierra con: sub-etapa activa (`foundation.setup`), cuántos 🔴 tiene y el siguiente paso. Recuerda hacer `mep` check obligatorio del PR a `main` en GitHub.
