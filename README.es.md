<div align="center">

# mise en place

**Scope → brief → checklist verificado, para websites y webapps hechos con Claude Code.**<br>
Tú describes el proyecto. mep sabe qué preguntar y qué exigir.

[![Licencia](https://img.shields.io/badge/licencia-Apache--2.0-blue.svg)](LICENSE)
[![Versión](https://img.shields.io/badge/versión-0.1.0-informational.svg)](.claude-plugin/plugin.json)
[![Catálogo](https://img.shields.io/badge/catálogo-2026.10.1-informational.svg)](catalog/CHANGELOG.md)
[![Plugin de Claude Code](https://img.shields.io/badge/Claude_Code-plugin-D97757.svg)](https://docs.claude.com/en/docs/claude-code/plugins)
[![Funciona con ponytail](https://img.shields.io/badge/funciona_con-ponytail-555.svg)](https://github.com/DietrichGebert/ponytail)
[![PRs bienvenidos](https://img.shields.io/badge/PRs-bienvenidos-brightgreen.svg)](CONTRIBUTING.md)

[English](README.md) · **Español**

</div>

---

La mayoría de los proyectos web salen sin etiqueta canonical, con una tabla sin RLS o con un secreto en el repo. Nadie lo pidió, así que nadie lo hizo. mep convierte un scope en lenguaje natural en un **perfil de proyecto**, filtra un catálogo condicional hasta lo que aplica, escribe un **brief** con stack justificado y checklist, y **bloquea** cerrar el trabajo o desplegar mientras falten obligatorios. Un motor determinista revisa el repo, no el modelo.

## Cómo funciona

```mermaid
flowchart TD
    U(["/mep:scope<br/>scope en lenguaje natural"]) --> P["Perfil<br/>tipo · capacidades · mercados<br/>audiencia · contexto · señales"]
    P --> E["El motor evalúa<br/>el catálogo"]
    E --> B["BRIEF.md<br/>stack + ADRs + checklist<br/>🔴 obligatorio · 🟡 recomendado · ⚪ opcional"]
    B --> W["Trabajar la sub-etapa activa"]
    W --> C{"/mep:phase close"}
    C -->|"🔴 pendientes"| W
    C -->|"todos los 🔴 cumplen +<br/>auditoría de mep-security"| L["Sub-etapa protegida<br/>contra regresiones"]
    L --> W
    W --> D{"Deploy"}
    D -->|"preview"| G1["Bloquea por regresiones<br/>y violaciones de locked"]
    D -->|"producción"| G2["Bloquea por cualquier<br/>🔴 pendiente"]
    G2 --> CI["CI: mep verify --prod<br/>check obligatorio en main"]
```

| Nivel | Efecto |
| --- | --- |
| 🔴 obligatorio | Bloquea según la sub-etapa. Siempre bloquea el deploy a producción. Solo se desactiva con `/mep:override`, razón escrita y confirmación explícita |
| 🟡 recomendado | Alerta. Solo se omite con `/mep:skip` y razón escrita |
| ⚪ opcional | Informa. Se elige en `/mep:scope` |
| 🔒 locked | No se desactiva nunca: secretos, RLS, hashing de contraseñas, autorización por recurso, datos de tarjeta, HTTPS. Una violación detectada bloquea en cualquier momento |

Las sub-etapas van en orden: `foundation.setup → foundation.design → build.data → build.features → build.ux → launch.content → launch.seo → launch.ops`. Los obligatorios solo bloquean cuando su sub-etapa está cerrada, así que el trabajo inicial no se atora con checks de lanzamiento.

| Agente | Modelo | Esfuerzo | Rol |
| --- | --- | --- | --- |
| `mep-locator` | Haiku | bajo | Encuentra código y piezas reutilizables leyendo primero `CODEMAP.md` y `REGISTRY.md`. Solo lectura |
| `mep-security` | Opus | alto | Implementa y audita los ítems de seguridad. Sus reportes en `.mep/security/` son lo único que da por cumplido un ítem de seguridad |

> [!NOTE]
> Un ítem de seguridad cuenta como cumplido solo si sus verificaciones automáticas pasan **y** `mep-security` dejó un reporte vigente. El reporte guarda un hash de los archivos que revisó; si alguno cambia, el reporte vence y el ítem vuelve a estar pendiente.

## Requisitos

- Claude Code (los mods necesitan la versión 2.1.287 o posterior; las anteriores usan los hooks incluidos)
- Node.js 20 o posterior
- Proyectos en un repositorio git
- Recomendado: el plugin [ponytail](https://github.com/DietrichGebert/ponytail). mep funciona sin él y usa su propia revisión de calidad

## Instalación

```
/plugin marketplace add engelbertgm/Mise-en-place
/plugin install mep@mise-en-place
```

Luego, en la carpeta de un proyecto nuevo o existente:

```
/mep:scope --preset saas "app de reservas para estudios de danza, México y California, planes mensuales"
```

> [!TIP]
> Pruébalo sin instalar: `claude --plugin-dir <ruta-a-este-repo>` y corre `/mep:scope` en una carpeta vacía.

## Uso

| Comando | Qué hace |
| --- | --- |
| `/mep:scope [--preset <nombre>] <descripción>` | Pregunta solo lo que cambia ítems 🔴 y escribe `.mep/profile.yaml`, `BRIEF.md`, los ADRs de stack, el bloque de `CLAUDE.md` y el workflow de CI |
| `/mep:add <cambio>` | Actualiza el scope y muestra **solo el diff**: ítems nuevos, ítems que suben de nivel e ítems que dejan de aplicar |
| `/mep:check` | Estado por sub-etapa: ✅ cumplido · ❌ pendiente · ⏭️ omitido · ⚠️ desactivado. Avisa si el código muestra señales que el perfil no tiene |
| `/mep:phase [close <sub-etapa>]` | Sub-etapa activa y qué falta; `close` corre la auditoría de seguridad y la revisión de calidad, y la cierra |
| `/mep:skip <id> <razón>` | Omite un ítem 🟡 |
| `/mep:override <id> <razón>` | Desactiva un ítem 🔴 tras confirmar; rechaza ítems 🔒 |

Presets: `landing`, `corporate`, `ecommerce`, `saas`, `marketplace`.

<details>
<summary><b>Perfil del proyecto</b> (<code>.mep/profile.yaml</code>, la fuente de verdad)</summary>

```yaml
project: "estudio-de-danza"
phase:
  closed: [foundation.setup]
  active: foundation.design
type: saas
capabilities: [auth, payments, subscriptions, email]
markets: [MX, USA:CA]
audience: [b2c]
context: client-project
counts: { pages: 12, entities: 6, languages: 2, integrations: 3 }
signals:
  has_forms: true
  has_db: true
  db_client_access: true
  has_dates: true
selections:
  optional_added: []
  recommended_skipped:
    - { id: csp-strict, reason: "MVP; se agrega post-lanzamiento", date: 2026-10-12 }
  overrides: []
stack:
  decided: { framework: nextjs, hosting: vercel, db: postgresql }
```

Solo se aceptan valores de [`catalog/dimensions.yaml`](catalog/dimensions.yaml). Las capacidades encienden señales por sí solas (`auth` → formularios, base de datos, datos personales); más de un idioma activa `i18n`.

</details>

<details>
<summary><b>Ítem del catálogo</b> (una entrada de <code>catalog/items/*.yaml</code>)</summary>

```yaml
- id: rls-all-tables
  title: RLS activo en todas las tablas
  category: security
  level: required
  phase: build.data
  locked: true
  since: "2026.10.1"
  effort: { size: M, hours: [2, 6], scales_with: entities }
  when: { signals: { has_db: true, db_client_access: true } }
  why: "Con acceso directo desde el cliente (Supabase), una tabla sin RLS es pública para cualquiera con la anon key."
  how: "Cada create table en migraciones va con su enable row level security."
  verify:
    - { type: sql, rule: rls_enabled }
```

Tipos de verificación: `file_exists`, `route_exists` (Next.js, Astro, Vite/React, estático), `grep` (presente o ausente), `json_key`, `command`, `html` (reglas sobre la salida del build: títulos únicos, un `h1`, orden de headings, meta tags…), `sql` (RLS en migraciones) y `manual`. Todas las corre el motor, nunca el modelo.

</details>

<details>
<summary><b>Cuándo bloquea</b></summary>

| Momento | Bloquea por |
| --- | --- |
| Terminar un turno (Stop) | 🔴 de sub-etapas **cerradas** (regresiones) y violaciones 🔒. Los 🔴 pendientes de la sub-etapa activa se muestran como información |
| Deploy de preview (`vercel`, `netlify deploy`) | Lo mismo que Stop |
| Deploy a producción (`vercel --prod`, push a `main`) | Cualquier 🔴 pendiente, en todas las sub-etapas |
| Pull request a `main` | `mep verify --prod` en CI. Es la barrera real: el deploy a producción suele correr al hacer merge, donde los hooks de Claude Code no corren |
| Escribir un archivo | Se rechaza escribir un secreto en un archivo versionado |

Nada corre en un repo sin `.mep/profile.yaml`. Escape de emergencia: `MEP_BYPASS=1` (nunca para ítems 🔒; queda registrado en `.mep/log`).

</details>

<details>
<summary><b>Qué vive dónde</b></summary>

| Dentro del repo (versionado) | Fuera del repo (`~/.config/mep-check/`) |
| --- | --- |
| `.mep/profile.yaml`, `.mep/log`, `.mep/security/`, `BRIEF.md`, `docs/decisions/` | Tarifas, horas reales, cotizaciones internas |

En un `client-project` el repo se entrega al cliente, así que nada interno de tu negocio se queda en él.

</details>

## Por dentro

- **Motor** ([`engine/src`](engine/src)): TypeScript, sin LLM. Mismo perfil, mismos ítems, mismo resultado. Se empaqueta en [`engine/dist/mep.mjs`](engine/dist/mep.mjs) sin dependencias en tiempo de ejecución y se publica como `@engelbertgm/mep` para el CI.
- **Mods** ([`mods/register.ts`](mods/register.ts)): corren dentro de Claude Code. `/mep:check` y `/mep:phase` responden al instante, sin turno de Claude; los deploys esperan al gate del motor; la línea de estado muestra la sub-etapa activa y los 🔴/🟡 pendientes.
- **Hooks** ([`hooks/hooks.json`](hooks/hooks.json)): SessionStart, Stop, PreToolUse y PostToolUse, como respaldo donde no hay mods.
- **CI** ([`templates/ci/mep.yml`](templates/ci/mep.yml)): lo instala `/mep:scope`. Corre gitleaks, `pnpm audit`, el build y `mep verify --prod`.

## Limitaciones

> [!WARNING]
> mep es un checklist guiado, no asesoría legal. Los ítems legales citan fuentes oficiales, pero un abogado debe revisarlos para tu mercado.

- El check de CI solo bloquea merges cuando lo marcas como **obligatorio** en la protección de ramas del repo.
- Las verificaciones de HTML necesitan una salida de build (`out/`, `.next/server/app`, `dist/`). Sin ella, esos ítems quedan pendientes en lugar de pasar.
- El catálogo `2026.10.1` cubre base, SEO y seguridad. Accesibilidad, sistema de diseño, UX, contenido, legal, mercados, `/mep:audit`, `/mep:update`, cotizador y export están planeados.

El diseño completo está en [docs/spec.md](docs/spec.md).

## Desarrollo

```
pnpm install
pnpm test                 # compila el motor y corre sus tests
pnpm typecheck
claude plugin test .      # tests de los mods
claude plugin validate .
```

Después de cambiar `engine/src`, corre `pnpm build` y versiona `engine/dist/mep.mjs`; el CI revisa que coincidan.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) y el [Código de Conducta](CODE_OF_CONDUCT.md). Reporta vulnerabilidades en privado como se describe en [SECURITY.md](SECURITY.md).

## Licencia

[Apache-2.0](LICENSE)
