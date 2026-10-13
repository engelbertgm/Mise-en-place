# Mise en place (`mep`)

Plugin de Claude Code para websites y webapps. Describes el proyecto en lenguaje natural y `mep`:

1. Lo convierte en un **perfil** (tipo, capacidades, mercados, audiencia, contexto y señales).
2. Filtra un **catálogo** de requisitos y propone lo que aplica: 🔴 obligatorio · 🟡 recomendado · ⚪ opcional.
3. Genera `BRIEF.md` con el perfil, el stack justificado (con ADRs) y el checklist, y lo enlaza desde `CLAUDE.md`.
4. Verifica el repo con un motor determinista y **bloquea** cerrar el trabajo o desplegar si faltan obligatorios.

No necesitas saber qué pedir: el plugin sabe qué preguntar y qué exigir.

## Instalación

En una sesión de Claude Code, en la terminal:

```
/plugin install mep --marketplace engelbertgm/Mise-en-place
```

Responde `y` para agregar el marketplace y elige el alcance. Requiere Node 20 o superior.

## Uso

| Comando | Qué hace |
|---|---|
| `/mep:scope [--preset saas] <descripción>` | Crea perfil, `BRIEF.md`, ADRs de stack, enlace en `CLAUDE.md` y el check de CI |
| `/mep:add <cambio>` | Cambia el scope y muestra solo el diff del checklist |
| `/mep:check` | Estado por sub-etapa: ✅ cumplido · ❌ pendiente · ⏭️ omitido · ⚠️ desactivado |
| `/mep:phase [close <sub-etapa>]` | Sub-etapa activa y qué falta; `close` la cierra si sus 🔴 están cumplidos |
| `/mep:skip <id> <razón>` | Omite un 🟡 |
| `/mep:override <id> <razón>` | Desactiva un 🔴 con confirmación (nunca un 🔒 locked) |

Presets: `landing`, `corporate`, `ecommerce`, `saas`, `marketplace`.

Agentes: `mep-locator` (Haiku, encuentra código leyendo `CODEMAP.md` y `REGISTRY.md`) y `mep-security` (Opus, implementa y audita seguridad; sus reportes en `.mep/security/` son lo único que da por cumplido un ítem de seguridad).

## Cómo bloquea

| Momento | Regla |
|---|---|
| Cerrar el trabajo (Stop) y deploy de preview | 🔴 de sub-etapas **cerradas** (regresiones) + violaciones de ítems 🔒 (secreto expuesto, tabla sin RLS) |
| Deploy a producción (`vercel --prod`, push a `main`) | Cualquier 🔴 pendiente |
| CI (`.github/workflows/mep.yml`) | `mep verify --prod` como check obligatorio del PR a `main`: la barrera real |

Sub-etapas: `foundation.setup → foundation.design → build.data → build.features → build.ux → launch.content → launch.seo → launch.ops`.

- Nada corre en un repo sin `.mep/profile.yaml`.
- Escape de emergencia: `MEP_BYPASS=1` (no aplica a 🔒, queda en `.mep/log`).
- Los **mods** (Claude Code 2.1.287+) responden `/mep:check` y `/mep:phase` al instante, retienen deploys, impiden escribir secretos y muestran la sub-etapa en la línea de estado. Los hooks clásicos son el respaldo donde no hay mods.

## Estructura

```
.claude-plugin/   plugin.json, marketplace.json
skills/           /mep:<comando> + la guía `mep`
agents/           mep-locator, mep-security
hooks/hooks.json  mods + hooks clásicos (SessionStart, Stop, PreToolUse, PostToolUse)
mods/             register.ts (gate, comandos, estado) + su test
engine/src/       motor TypeScript: evaluate, verify, render, gate, cli
engine/dist/      bundle sin dependencias (versionado; lo usan plugin y CI)
catalog/          dimensiones, ítems, reglas de stack, presets, señales
templates/        bloque de CLAUDE.md y workflow de CI
docs/spec.md      especificación
```

## Desarrollo

```
pnpm install
pnpm test              # build + tests del motor (node:test)
pnpm typecheck
claude plugin test .   # tests de los mods
claude plugin validate .claude-plugin/plugin.json
```

Después de cambiar `engine/src`, corre `pnpm build` y versiona `engine/dist/mep.mjs` (el CI revisa que coincidan).

El CI de cada proyecto usa el paquete npm `@engelbertgm/mep`. Para publicarlo: `pnpm publish --access public` (incluye `engine/dist`, `catalog` y `templates`).

## Estado

Fases 1–5 de la spec: motor, verificaciones (incluye `html` sobre el build y `sql` para RLS), render, comandos base, mods, hooks y CI, y catálogo de base, SEO y seguridad.

Pendiente: `/mep:audit`, `/mep:update`, catálogo de capacidades, accesibilidad, diseño, UX, contenido, legal y mercados, proyecto de prueba, cotizador, export y calibración.

> Checklist orientativo, no sustituye asesoría legal.
