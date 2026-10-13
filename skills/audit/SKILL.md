---
name: audit
description: Aplica mep a un repo que ya existe — infiere el perfil desde el código, lo confirma con el usuario y genera un reporte de brecha por sub-etapa y nivel, sin modificar código ni bloquear nada.
argument-hint: ""
allowed-tools: Bash(node *), Read, Write, AskUserQuestion, Skill
---

# /mep:audit

Motor: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`. No modifiques código del proyecto en este comando.

1. Si ya existe `.mep/profile.yaml`, el repo ya usa mep: sugiere `/mep:check` y detente.
2. Corre `audit`. Muestra el perfil inferido y la evidencia de cada suposición (framework, dependencias, rutas, DB, auth, pagos).
3. Propón el perfil al usuario para que lo confirme o corrija (skill `mep`). Pregunta solo lo que el código no puede decir y cambia 🔴: mercados, audiencia (menores, datos sensibles), contexto (cliente o propio). Escribe el perfil confirmado en `.mep/draft.yaml`.
4. Corre `audit --from .mep/draft.yaml`: reporte de brecha ordenado por sub-etapa y nivel. Muéstralo tal cual.
5. Si Ponytail está instalado, corre `/ponytail-audit` y agrega su ranking de qué arreglar primero al final del reporte.
6. Recuerda que nada se bloquea hasta adoptar el brief. Si el usuario lo adopta: `init --from .mep/draft.yaml --close-passing` (cierra en orden las sub-etapas que ya cumplen sus 🔴) y borra `.mep/draft.yaml`. Si no, borra `.mep/draft.yaml` y no dejes rastro.
