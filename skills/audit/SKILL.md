---
name: audit
description: Aplica mep a un repo que ya existe — parte del scope del proyecto (qué debe ser), lo contrasta con lo que muestra el código y genera un reporte de brecha con solo las reglas que aplican a ese scope, sin modificar código ni bloquear nada.
argument-hint: "[descripción del scope, opcional]"
allowed-tools: Bash(node *), Read, Write, AskUserQuestion, Skill
---

# /mep:audit

Scope indicado: $ARGUMENTS

Motor: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`. No modifiques código del proyecto en este comando.

Las reglas de mep se activan por el **scope** del proyecto (tipo, capacidades, mercados, audiencia, contexto, señales), no por lo que haya en el código. El código es evidencia; el scope decide qué aplica.

1. Si ya existe `.mep/profile.yaml`, el repo ya usa mep: sugiere `/mep:check` y detente.
2. **Scope primero.** Si no vino en los argumentos, pide al usuario que describa en sus palabras qué es el proyecto, para quién, en qué mercados y qué debe hacer (o léelo de README, BRIEF o docs si existen, y confírmalo con el usuario). Sin scope no sigas: el audit no se adivina desde el código.
3. Corre `audit`: lo que muestra el código, con evidencia por cada suposición. Es contraste, no verdad.
4. Arma el perfil desde el scope (skill `mep`), usando el código solo como evidencia. Donde no coincidan, pregunta (AskUserQuestion, máximo 4):
   - algo en el código que el scope no menciona (ej. dependencia `stripe` sin cobrar nada): ¿es parte del scope o sobra?
   - algo del scope que el código aún no tiene: va al perfil igual; es trabajo pendiente, no un error.
   Pregunta también lo que el código no puede decir y cambia 🔴: mercados, audiencia (datos sensibles), contexto (cliente o propio). Si el proyecto es para menores o verifica edad, mep no lo cubre: dilo y detente. Escribe el perfil confirmado en `.mep/draft.yaml`, con `summary`: un párrafo en palabras del usuario sobre qué es el proyecto.
5. Corre `audit --from .mep/draft.yaml`. Muestra tal cual: cuántas reglas aplican por el scope y cuántas no, las diferencias scope vs código, y la brecha por sub-etapa y nivel. Si el usuario pregunta por una regla que no aparece o que sí aparece, `explain <id> --from .mep/draft.yaml` dice por qué.
6. Si Ponytail está instalado, corre `/ponytail-audit` y agrega su ranking de qué arreglar primero al final del reporte.
7. Nada se bloquea hasta adoptar el brief. Si el usuario lo adopta: `init --from .mep/draft.yaml --close-passing` (cierra en orden las sub-etapas que ya cumplen sus 🔴) y borra `.mep/draft.yaml`. Si no, borra `.mep/draft.yaml` y no dejes rastro.
