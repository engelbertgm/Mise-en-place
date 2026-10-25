# Mise en place (`mep`) — Especificación para construir el plugin

> Instrucciones para Claude Code. Este documento define qué construir y cómo debe comportarse.
>
> **Estado:** fases 1–10 implementadas (catálogo 2026.10.6, 345 ítems). Decisiones de implementación: motor en TypeScript publicado como `@engelbertgm/mep`; verificaciones extra `html`, `sql`, `maps`, `quality` y `design`; idiomas derivados de los mercados (`market_languages`); revisión de calidad antes del PR a `main` una vez por commit; mods en un solo módulo; export desde un subconjunto de Markdown a .docx y .pdf sin dependencias; proyecto de prueba en `examples/estudio-saas` con su test de punta a punta.
> Antes de implementar, verifica en la documentación actual de Claude Code la estructura de plugins, comandos, skills y hooks.

---

## 1. Objetivo

Plugin de Claude Code para proyectos de **websites y webapps**:

1. El usuario describe su scope en lenguaje natural.
2. El plugin lo convierte en un **perfil de proyecto** (tipo, capacidades, mercados, audiencia, contexto + señales).
3. Filtra una **lista maestra condicional** y propone lo que aplica.
4. El usuario elige y se genera un **brief**: perfil + stack justificado + checklist.
5. El brief se vuelve instrucción maestra del proyecto (se enlaza desde `CLAUDE.md`).
6. Un **hook bloquea** cerrar el trabajo si faltan ítems obligatorios.

Principio clave: el usuario no necesita saber qué pedir. El plugin sabe qué preguntar y qué exigir.

---

## 2. Estructura del plugin

```
mep/
├── .claude-plugin/
│   └── plugin.json
├── skills/               # cada /mep:<nombre> es un skill del plugin (skills/<nombre>/SKILL.md)
│   ├── mep/              # guía: interpretar scope, usar el catálogo, respetar el brief (no invocable por el usuario)
│   ├── scope/            # /mep:scope — crea el brief desde cero
│   ├── add/              # /mep:add — agrega scope y recalcula
│   ├── check/            # /mep:check — verifica el repo contra el checklist
│   ├── skip/             # /mep:skip — omite un recomendado con razón
│   ├── override/         # /mep:override — desactiva un obligatorio con razón
│   ├── phase/            # /mep:phase — estado y cierre de sub-etapas
│   ├── audit/            # /mep:audit — aplica el brief a un repo existente
│   ├── update/           # /mep:update — integra ítems nuevos del catálogo
│   ├── quote/            # /mep:quote — cotización desde el brief
│   ├── export/           # /mep:export — brief para el cliente (docx/pdf)
│   └── log-time/         # /mep:log-time — horas reales por ítem
├── agents/
│   ├── mep-locator.md    # Haiku, esfuerzo bajo/medio, solo lectura: encuentra código
│   └── mep-security.md   # Opus, esfuerzo alto: implementa y audita seguridad
├── hooks/
│   └── hooks.json        # declara el módulo de mods y los hooks de respaldo
├── mods/                 # código TypeScript que corre dentro de Claude Code
│   └── register.ts       # gate + commands + status en un solo módulo (Claude Code sigue `$` solo dentro de un archivo)
├── engine/               # evaluador determinista en TypeScript/Node, sin LLM; se publica como paquete npm `@engelbertgm/mep`
│   ├── src/evaluate.ts   # perfil + catálogo → ítems aplicables, diff, stack
│   ├── src/verify.ts     # ejecuta las verificaciones de cada ítem
│   ├── src/render.ts     # genera BRIEF.md y ADRs
│   ├── src/gate.ts       # reglas de bloqueo (Stop, preview, producción) y cierre de fases
│   ├── src/cli.ts        # CLI `mep` (skills, mods, hooks y CI la llaman)
│   └── dist/mep.mjs      # bundle sin dependencias, versionado
├── catalog/
│   ├── dimensions.yaml   # valores válidos de cada dimensión
│   ├── stack-rules.yaml  # reglas de decisión de stack
│   ├── markets/          # un archivo por mercado (con sub-niveles)
│   ├── presets/          # 5 perfiles de partida
│   ├── items/            # un archivo por categoría
│   ├── signals.yaml      # detectores de señales en el código
│   ├── sensitive.yaml    # rutas sensibles (piden auditoría de mep-security)
│   ├── VERSION
│   └── CHANGELOG.md
├── templates/
│   └── client-brief/     # plantilla del documento para el cliente
└── tests/
```

---

## 3. Perfil de proyecto (5 dimensiones + señales)

Definidas en `catalog/dimensions.yaml`. Solo se aceptan valores de ahí.

| Dimensión | Valores iniciales |
|---|---|
| `type` | landing, corporate, local-business, blog, portfolio, ecommerce, saas, marketplace, internal-app, directory, booking |
| `capabilities` | auth, payments (checkout integrado), payment-links (enlaces del proveedor, sin backend), subscriptions, ugc, uploads, email, i18n, search, notifications, realtime, admin-panel, api-public, analytics, maps, ai-features, pwa, offline, newsletter, cms, media, site-migration |
| `markets` | MX, USA, CA, EU, UK, BR, IN (CN: reservado para fase futura) |
| `audience` | b2b, b2c, minors, sensitive-data-health, sensitive-data-finance |
| `context` | client-project, own-product |

### Sub-niveles de mercado

- `USA` → estado (`USA:CA`, `USA:CO`, `USA:VA`, …)
- `CA` → provincia (`CA:QC`, `CA:ON`, …)
- `EU` → país (`EU:DE`, `EU:FR`, `EU:ES`, …)

Un ítem que aplica a `EU` aplica a todos sus países. Un ítem de `EU:DE` solo aplica si se eligió Alemania.

### Señales

Muchos bloques no dependen de una capacidad, sino de un hecho del proyecto ("hay formularios", "hay fechas"). Esos hechos son **señales**: valores booleanos que también se usan en las condiciones.

| Señal | Activa |
|---|---|
| `has_forms` | Formularios, seguridad de formularios |
| `has_long_forms` | Trabajo sin guardar |
| `has_db` | Base de datos, RLS, migraciones, backups |
| `db_client_access` | RLS `locked` (el cliente consulta la DB directo, ej. Supabase) |
| `has_personal_data` | Privacy policy, retención de datos |
| `has_dates` | Zonas horarias |
| `has_tables` | Datos y tablas |
| `has_destructive_actions` | Acciones destructivas |
| `has_embeds` | Embeds de terceros |
| `has_nonessential_cookies` | Banner de consentimiento |
| `team` (`solo` / `team`) | Nivel de los ítems de Git |

- `/mep:scope` infiere las señales a partir de la descripción y las capacidades (ej. `auth` implica `has_forms`, `has_db` y `has_personal_data`), y pregunta solo las dudosas.
- `has_db` solo cuando hay algo propio que guardar (cuentas, pedidos, reservas, contenido): lo implican `auth`, `subscriptions`, `ugc` y `admin-panel`. Pagos, uploads o un formulario de contacto no crean una base de datos por sí solos.
- `/mep:audit` y `verify` las **detectan en el código** (ej. un `<iframe>` activa `has_embeds`). Si el código muestra una señal que el perfil no tiene, el plugin avisa y propone actualizar el perfil.

### Archivo de estado del proyecto

`.mep/profile.yaml` (fuente de verdad, editable):

```yaml
version: 1
catalog_version: "2026.10.1"   # versión del catálogo con la que se generó
project: "nombre"
phase:
  closed: [foundation.setup, foundation.design]
  active: build.data
type: saas
capabilities: [auth, payments, subscriptions, email]
markets: [MX, USA:CA, EU:DE]
audience: [b2c]
context: client-project
preset: saas
counts:                      # alimentan el cotizador
  pages: 12
  entities: 6                # tablas o modelos de datos principales
  languages: 2
  integrations: 3
signals:
  has_forms: true
  has_db: true
  db_client_access: true
  has_personal_data: true
  has_dates: true
  has_tables: true
  has_destructive_actions: true
  has_embeds: false
  has_nonessential_cookies: false
  team: solo
selections:
  optional_added: [dark-mode, csv-export]
  recommended_skipped:
    - id: status-page
      reason: "MVP; se agrega post-lanzamiento"
      date: 2026-10-12
  overrides: []              # 🔴 desactivados con /mep:override (id, razón, fecha)
  manual_confirmed:          # ítems con verify manual, confirmados por el usuario
    - id: owasp-top10-review
      by: "Engel"
      date: 2026-10-12
stack:
  decided: { db: postgresql, framework: nextjs, hosting: vercel }
```

---

## 4. Esquema de un ítem del catálogo

```yaml
- id: refund-policy
  title: Página de política de reembolsos
  category: legal
  level: required            # required | recommended | optional
  phase: launch.content      # sub-etapa donde se exige (ver sección 5)
  locked: false              # true = no se puede desactivar nunca
  conflicts_with: []         # ítems incompatibles; el usuario elige cuál desactivar
  since: "2026.10.1"         # versión del catálogo en que se agregó
  effort:                    # alimenta el cotizador (sección 12)
    size: S                  # XS | S | M | L | XL
    hours: [1, 3]            # rango base
    scales_with: languages   # opcional: pages | entities | languages | markets | integrations
  when:                      # condición estructurada (no strings)
    all:
      - capabilities: [payments]
      - type: { any: [ecommerce, saas, marketplace] }
  level_overrides:           # el nivel sube según el contexto
    - when: { markets: { any: [EU, UK] } }
      level: required
  depends_on: [terms-of-service]
  why: "Requerida por procesadores de pago y por ley de consumo en varios mercados."
  how: "Ruta /refunds, enlazada en footer y checkout."
  verify:
    - type: route_exists
      path: /refunds
    - type: grep
      pattern: "href=[\"']/refunds"
      glob: "**/*.{tsx,jsx,html}"
  references: ["fuente oficial"]
```

### Lenguaje de condiciones

- `all:` todas se cumplen · `any:` al menos una · `not:` negación
- Cada hoja compara una dimensión: `capabilities: [x]` significa "contiene x"
- Las señales se comparan igual: `signals: { has_forms: true }`
- Mercado padre cubre a sus hijos (`EU` coincide con `EU:DE`)

### Tipos de verificación (`verify`)

| Tipo | Qué hace |
|---|---|
| `file_exists` | El archivo existe (`public/robots.txt`) |
| `route_exists` | La ruta existe según el framework detectado |
| `grep` | Patrón presente en archivos |
| `json_key` | Llave presente (`package.json`, configs) |
| `command` | Comando que debe salir con código 0 (tests, lint) |
| `html` | Regla sobre el HTML de la salida del build (`out/`, `.next/server/app`, `dist/`): `meta`, `link`, `html_lang`, `charset`, `unique_title`, `unique_description`, `single_h1`, `heading_order`, `absolute_og_image`, `img_dimensions`, `img_alt`. Sin build, el resultado es "desconocido", nunca "cumple" |
| `sql` | Regla sobre las migraciones SQL: `rls_enabled` (cada `create table` con su `enable row level security`), `policies_per_operation` |
| `manual` | Requiere confirmación explícita en el brief (ej. "abogado revisó ToS") |

Todas las verificaciones las corre el motor, no el LLM. El resultado debe ser reproducible.

- `grep` con `expect: absent` (y `sql rls_enabled`) detecta una **violación**: algo presente que no debe estar.
- Modo `fast` (Stop, preview, línea de estado): no corre `command` ni `html`. Modo `full` (`/mep:check`, cierre de fase, producción, CI): corre todo.

---

## 5. Niveles y comportamiento del hook

| Nivel | Símbolo | Efecto |
|---|---|---|
| required | 🔴 | **Bloquea según fase** (ver abajo). Siempre bloquea el deploy a producción |
| recommended | 🟡 | **Alerta.** Se puede omitir solo con razón escrita (`/mep:skip`) |
| optional | ⚪ | **Aviso.** Solo informa |

### Fases y sub-etapas

Evitan bloqueos agresivos: al inicio todo está pendiente, así que solo se exige lo que corresponde al momento del proyecto.

| Fase | Sub-etapa | Contenido típico |
|---|---|---|
| foundation | `setup` | repo, formato, lint, reglas de calidad de código, CI, `.gitignore`, `.env.example`, escaneo de secretos |
| foundation | `design` | tokens, jerarquía de texto, sistema de diseño, `/design-system` |
| build | `data` | modelo de datos, migraciones, RLS, auth |
| build | `features` | features según capacidades, seguridad por capa |
| build | `ux` | estados, feedback, formularios, tablas, responsive, accesibilidad |
| launch | `content` | contenido final, legales, i18n |
| launch | `seo` | SEO, `og:image`, performance |
| launch | `ops` | monitoreo, backups, dominio, entrega al cliente |

- Cada ítem pertenece a una sub-etapa (`phase`).
- Una sub-etapa se cierra con `/mep:phase close <sub-etapa>`, y solo si sus 🔴 están cumplidos.
- Al cerrarse, sus 🔴 quedan **protegidos contra regresiones**: si algo se rompe después, el hook bloquea.
- Se pueden trabajar ítems de sub-etapas futuras; simplemente aún no bloquean.

### Hooks

1. **Stop**: bloquea solo por 🔴 de sub-etapas **cerradas** (regresiones) y por **violaciones** de ítems `locked` (ej. un secreto expuesto o una tabla sin RLS bloquean en cualquier momento). Un `locked` al que solo le falta algo aún no construido (ej. HSTS antes del deploy) sigue la regla normal de fases. Los 🔴 de la sub-etapa activa se muestran como información. Si Claude ya continúa por un bloqueo (`stop_hook_active`), el hook avisa sin volver a bloquear, para no entrar en bucle.
2. **PreToolUse (Bash)** sobre comandos de despliegue:
   - Deploy de **preview**: misma regla que Stop.
   - Deploy a **producción** (`vercel deploy --prod`, push a `main`): bloquea por **cualquier** 🔴 pendiente de todas las sub-etapas.
3. **SessionStart**: muestra la sub-etapa activa y sus pendientes, en pocas líneas.
4. **Check de CI** (fuera de Claude Code): un paso `pnpm dlx @engelbertgm/mep verify --prod` (después del build) como check obligatorio del PR a `main`. `/mep:scope` instala `.github/workflows/mep.yml`. Es la barrera real, porque el deploy a producción suele dispararse al hacer merge en GitHub, donde los hooks de Claude Code no corren.

### Ítems de seguridad y `mep-security`

Un ítem de `category: security` cuenta como cumplido solo si su `verify` automático pasa **y** existe un reporte vigente de `mep-security` en `.mep/security/<id>.json`. El reporte guarda el hash de los archivos que se revisaron; si alguno cambia, vence. El CI solo revisa que el reporte exista y esté vigente; no vuelve a correr la auditoría (que no es determinista). Los `manual` de un ítem de seguridad los cubre ese reporte, no una persona.

### Mods (preferidos) y hooks (respaldo)

Desde Claude Code v2.1.287 los plugins pueden incluir **mods**: funciones TypeScript que corren dentro de Claude Code. El plugin los usa para:

| Mod | Qué hace | Ventaja sobre un hook |
|---|---|---|
| `gate` | Escucha `tool.call`: retiene deploys hasta pasar el gate del motor y rechaza escribir un secreto en un archivo versionado. Editar archivos sensibles avisa que hace falta auditoría (hook `PostToolUse`) | Decide dentro del proceso, sin lanzar un script por cada llamada |
| `commands` | `/mep:check` y `/mep:phase` (sin `close`) corren el motor directamente; `/mep:phase close` sigue al skill (auditoría + revisión). `/mep:quote` se agrega en la fase 9 | **Respuesta instantánea y sin gastar tokens**: no necesitan un turno de Claude |
| `status` | Muestra la sub-etapa activa y el conteo de 🔴/🟡 pendientes | Visible siempre, sin pedirlo |

Reglas:
- La lógica de verificación vive en `engine/`; mods y hooks solo la llaman. Una sola fuente de verdad.
- Los hooks descritos arriba se mantienen como **respaldo** donde los mods no estén disponibles (verificar en la documentación actual: superficies y versión mínima).
- Los mods no tienen sandbox: el código debe ser mínimo, legible, sin red y validado con `claude plugin validate` antes de publicar.
- El check de CI sigue siendo la barrera final.

### Desactivar ítems y conflictos

- 🟡 se omite con `/mep:skip <id> <razón>`.
- 🔴 se desactiva con `/mep:override <id> <razón>`: pide confirmación explícita, queda marcado ⚠️ en el brief y se registra en `.mep/log`.
- Ítems `locked: true` **no se pueden desactivar**: secretos, RLS, hashing de contraseñas, autorización por recurso, datos de tarjeta, HTTPS.
- Si dos ítems activos tienen `conflicts_with`, el plugin avisa y pide desactivar uno con razón.

### Reglas generales

- El hook nunca corre si no existe `.mep/profile.yaml` (el proyecto no usa el plugin).
- Escape de emergencia: `MEP_BYPASS=1`. No aplica a ítems `locked`. Se registra en `.mep/log`.
- Salida del hook: corta, agrupada por nivel y con `id` + `how` de cada pendiente.

---

## 6. Reglas de stack

`catalog/stack-rules.yaml`. Recomendación según el caso, siempre con razón escrita.

```yaml
- id: db-relational
  when: { capabilities: { any: [auth, payments, subscriptions] } }
  recommend: { db: postgresql }
  why: "Datos relacionales, transacciones y consistencia para usuarios y pagos."
  alternatives:
    - { db: sqlite, when: "internal-app de bajo volumen" }

- id: static-first
  when: { all: [ { type: { any: [landing, blog, portfolio] } }, { not: { capabilities: [auth] } } ] }
  recommend: { rendering: static, backend: none }
  why: "Sin datos de usuario no hace falta backend; más rápido y barato."
```

- UI: si el framework es React, la regla recomienda shadcn/ui (sección Sistema de diseño); si no, la regla indica el equivalente.
- Cada decisión queda en el brief con su `why` y genera su ADR.
- Cambiar una decisión de stack requiere actualizar `profile.yaml` y regenerar el brief.

---

## 7. Comandos

### `/mep:scope <descripción>`
1. Interpreta la descripción y propone el perfil (5 dimensiones + señales), partiendo de un preset si aplica.
2. Hace preguntas **solo** si falta algo que cambia ítems obligatorios (ej. mercados, si hay menores) o los `counts` del cotizador (páginas, entidades, idiomas, integraciones).
3. Corre `evaluate` y muestra: 🔴 obligatorios, 🟡 recomendados, ⚪ opcionales, agrupados por categoría.
4. El usuario elige opcionales y confirma.
5. Escribe `.mep/profile.yaml` y genera `SCOPE.md` (resumen del scope en lenguaje claro: qué es, qué incluye, qué no incluye, tecnología, cuántas reglas aplican y qué falta definir) y `BRIEF.md`. Ambos se regeneran con cada `/mep:add`; no se editan a mano.
6. Agrega a `CLAUDE.md` (sin borrar lo existente):
   ```
   Este proyecto se rige por BRIEF.md. Los ítems 🔴 son requisitos no negociables.

   Mantra de código: claro, simple, bonito y reutilizado.
   - Para encontrar algo, consulta primero CODEMAP.md y REGISTRY.md; no busques archivo por archivo.
   - Antes de crear algo, revisa REGISTRY.md y reutiliza lo que exista.
   - Todo lo relacionado con seguridad lo hace o lo audita el agente mep-security.
   - Si Ponytail está instalado: sigue su escalera (¿hace falta? → ¿ya existe aquí? → librería estándar → función nativa → dependencia instalada → mínimo que funciona). Su paso "¿ya existe aquí?" se resuelve con REGISTRY.md.
   - La solución más simple que funcione; nada "por si acaso".
   - Nombres que explican; comentarios solo para el porqué.
   - Cada cambio deja el código igual o más limpio que antes.
   ```

### `/mep:add <cambio>`
Actualiza el perfil y muestra **solo el diff**: ítems nuevos, ítems que suben de nivel, ítems que dejan de aplicar.

### `/mep:check`
Corre todas las verificaciones y muestra el estado por sub-etapa: ✅ cumplido · ❌ pendiente · ⏭️ omitido (🟡 con razón) · ⚠️ desactivado (🔴 con override). Avisa si detecta señales que el perfil no tiene.

### `/mep:skip <id> <razón>`
Solo para 🟡.

### `/mep:override <id> <razón>`
Desactiva un 🔴 con confirmación explícita. Rechaza ítems `locked`.

### `/mep:phase [close <sub-etapa>]`
Sin argumentos: muestra en qué sub-etapa está el proyecto y qué falta para cerrarla. Con `close`: cierra la sub-etapa si sus 🔴 están cumplidos.

### `/mep:audit`
Para repos que ya existen. El scope decide qué reglas aplican; el código es evidencia:
1. Obtiene el scope del usuario (o de README/BRIEF, confirmado con él). Sin scope no hay audit.
2. Infiere desde el código lo que muestra (framework, dependencias, rutas, DB, auth, pagos) como evidencia.
3. Arma el perfil desde el scope y pregunta donde scope y código no coinciden (lo que sobra en el código, lo que el scope pide y aún no existe).
4. Reporta cuántas reglas activa ese scope y cuántas no, las diferencias scope vs código y la brecha por sub-etapa y nivel. `mep explain <id>` dice por qué una regla aplica o no.
5. No bloquea nada hasta que el usuario adopte el brief.

### `/mep:update`
Cuando la lista maestra crece:
1. Compara el `catalog_version` del proyecto con el actual.
2. Muestra solo los ítems nuevos o modificados que aplican a este perfil.
3. Los aceptados entran como pendientes en su sub-etapa. Si caen en una sub-etapa ya cerrada, no bloquean hasta el siguiente cierre o el deploy a producción (periodo de gracia).
4. Actualiza `catalog_version`.

El catálogo lleva su versión en `catalog/VERSION` y cada ítem registra `since`. Los cambios se documentan en `catalog/CHANGELOG.md`.

### `/mep:quote [--client]`
Genera la cotización desde el brief (ver sección 12).

Toggle: la cotización corre **solo** al definir el scope (`/mep:scope`) y en cambios de scope (`/mep:add`). No corre en `/mep:check`, cierres de fase ni hooks.

### `/mep:export [--format docx|pdf] [--lang en|es|…]`
Genera el documento del brief para el cliente (ver sección 14). Claude escribe `docs/client/brief-vN.md` en el idioma del cliente desde `templates/client-brief/` y los datos de `mep export-data`; el motor lo convierte a .docx y .pdf y registra la versión en `.mep/exports.yaml`.

### `/mep:log-time <id> <horas>`
Registra horas reales por ítem en `~/.config/mep-check/actuals/<proyecto>.yaml` (fuera del repo) para calibrar estimaciones futuras.

### Qué vive dentro y fuera del repo

| Dentro del repo (`.mep/`, versionado) | Fuera del repo (`~/.config/mep-check/`) |
|---|---|
| `profile.yaml`, `log`, `BRIEF.md`, ADRs | `rates.yaml`, horas reales, cotizaciones internas |

En un `client-project` el repo se entrega al cliente: nada interno de tu negocio debe quedar ahí.

---

## 8. Formato de `BRIEF.md`

```
# Brief — <proyecto>
## Perfil
## Stack (decisión + por qué)
## Fase actual (sub-etapas cerradas y activa)
## Checklist (agrupado por sub-etapa)
### 🔴 Obligatorios
- [ ] id — título — cómo se verifica
### 🟡 Recomendados
### ⚪ Opcionales elegidos
### ⏭️ Omitidos (🟡, con razón)
### ⚠️ Desactivados (🔴 con override, con razón)
## Costos recurrentes estimados
## Notas legales
```

Se regenera desde `profile.yaml`. No se edita a mano (se indica en la cabecera).

---

## 9. Catálogo inicial (semilla)

Construye cada categoría en su propio archivo. Esta lista es punto de partida; amplíala con fuentes oficiales.

**Base (todo website)**

🔴 Obligatorios siempre:
- `<meta charset="utf-8">` · `<meta name="viewport">` · `lang` en `<html>`
- `<title>` y `<meta name="description">` **únicos por página** (el verify revisa que no se repitan)
- Open Graph mínimo: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- `<link rel="canonical">`
- favicon (ico/svg) + apple-touch-icon
- robots.txt · sitemap.xml · páginas 404 y 500 · HTTPS/HSTS
- `noindex` en entornos de preview/staging (y nunca en producción)
- `.env.example` · `.gitignore` · README

🟡 Recomendados:
- `theme-color` · web manifest · `og:locale` (si i18n)

Nota: los meta tags dinámicos (por producto, post o perfil) se verifican por plantilla, no por página.

**SEO**

🔴 Obligatorios:
- Cada página pública tiene **URL propia** (`/servicios`, `/blog/post`), no solo un estado interno de la SPA
- Contenido público renderizado en el HTML (SSR/SSG), no solo por JavaScript en el cliente
- Un solo `<h1>` por página y uso correcto de `h2`, `h3` y `body` (y otros niveles si aplican): sin saltar niveles, cada nivel con su token de texto según su rol, no por apariencia (`heading-hierarchy`)
- `sitemap.xml` incluye **solo** páginas indexables
- `noindex` + fuera del sitemap: dashboard, cuenta, checkout, resultados de búsqueda interna
- robots.txt no bloquea CSS/JS
- URLs limpias: minúsculas, guiones, sin IDs innecesarios; trailing slash consistente
- 301 cuando una URL cambia (nunca dejar 404 de URLs que existían)
- Enlaces internos con `<a href>` rastreable (no solo `onClick`)
- **Imagen de preview al compartir link** (`og:image`):
  - Una por defecto para todo el sitio + una propia por página clave (producto, post, perfil)
  - 1200×630 px, JPG o PNG, idealmente < 300 KB (WhatsApp falla con imágenes pesadas)
  - URL absoluta con `https://` (las rutas relativas no funcionan)
  - `og:image:width`, `og:image:height` y `og:image:alt`
  - `twitter:card = summary_large_image` para que se vea grande en X
  - Texto importante dentro del área central (algunas apps recortan los bordes)
  - 🟡 Generación automática por página (ej. título del post sobre plantilla de marca)

🟡 Recomendados:
- JSON-LD: Organization + WebSite siempre; Product / Article / LocalBusiness según `type`
- Breadcrumbs (con JSON-LD) en sitios con más de 2 niveles
- Search Console verificado y sitemap enviado

🔴 si `i18n`: hreflang, URL por idioma (`/es/`, `/en/`), `lang` correcto por página

**Performance**

🔴 Obligatorios:
- Imágenes raster en **WebP o AVIF** con `srcset` responsive. Excepciones: SVG para logos e íconos; `og:image` en JPG/PNG (las redes sociales no soportan bien WebP/AVIF)
- Lazy loading en imágenes **bajo el pliegue**; la imagen principal (LCP) va `eager` + `fetchpriority="high"` (hacerla lazy empeora la carga)
- `width`/`height` en todas las imágenes y videos
- Fuentes: `font-display: swap`, subset y preferentemente self-hosted
- Compresión (Brotli/gzip) y caché larga en assets con hash

🟡 Recomendados:
- Presupuesto Core Web Vitals: LCP < 2.5s · INP < 200ms · CLS < 0.1
- Presupuesto de tamaño de bundle JS · `preconnect` a dominios críticos

**Accesibilidad** — 🔴 siempre, todo el bloque
- Contraste WCAG AA · navegación completa por teclado · foco visible · skip link
- Alt text (vacío `alt=""` en imágenes decorativas) · labels en formularios
- Errores de formulario anunciados y asociados al campo
- Landmarks (`header`, `nav`, `main`, `footer`) · jerarquía de headings
- Respeta `prefers-reduced-motion` · zoom al 200% sin romper el layout

- **Declaración de accesibilidad** (🔴 si EU, 🟡 en los demás): nivel de conformidad, limitaciones conocidas y contacto para reportar barreras

🟡 Test automatizado (axe o similar) en CI

**Seguridad** — se construye por capas

*Base · 🔴 siempre*
- HTTPS + HSTS · redirección canónica http→https y www↔sin-www
- Headers: `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`
- **Cero secretos**: escaneo del repo y del bundle del cliente; solo variables públicas con prefijo explícito
- Lockfile versionado · sin vulnerabilidades críticas en `npm audit` (o equivalente)
- Errores en producción sin stack traces ni detalles internos
- 🟡 CSP estricta · `security.txt` · Dependabot/Renovate

*Secretos · 🔴 siempre · `locked`*

Se considera secreto todo lo que da acceso o firma algo:
- API keys de terceros (Stripe, OpenAI, Resend, Maps…)
- Credenciales: contraseñas de DB y connection strings, SMTP, usuarios de servicio
- OAuth client secrets · secretos de firma de webhooks · llaves de firma de JWT/sesiones
- Llaves privadas y certificados (`.pem`, `.key`, `.p12`) · JSON de cuentas de servicio (Google Cloud, Firebase admin)
- Tokens personales (GitHub, Vercel, npm)
- Las credenciales de prueba en seeds o fixtures son ficticias, nunca reales

Reglas:
- `.env*` en `.gitignore` (excepto `.env.example`, sin valores reales)
- Escaneo de secretos en pre-commit y en CI (gitleaks o similar), **incluido el historial de git**
- Solo llegan al cliente variables con prefijo público (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`), y ninguna es secreta
- Llaves privilegiadas solo en servidor (ej. `service_role` de Supabase, secret key de Stripe)
- Llaves distintas por entorno (desarrollo, preview, producción)
- Variables guardadas en el gestor del hosting, no en archivos del repo
- Procedimiento de rotación documentado: si una llave se filtra, se rota de inmediato (borrarla del repo no basta, queda en el historial)

*Ciberseguridad · 🔴 siempre*
- Checklist OWASP Top 10 revisado (verificación `manual` con referencias)
- **Inyección**: consultas parametrizadas u ORM; nunca SQL armado con strings
- **XSS**: nada de HTML crudo sin sanitizar (`dangerouslySetInnerHTML`, `v-html`, `innerHTML`); verificable por `grep`
- **Redirecciones abiertas**: los parámetros de redirect se validan contra una lista permitida
- **SSRF**: si el servidor descarga URLs dadas por el usuario, lista permitida de dominios
- **Dependencias**: escaneo en CI (npm audit u OSV) que falla con vulnerabilidades críticas; revisar paquetes nuevos antes de instalarlos (evitar typosquatting)
- Logs sin contraseñas, tokens ni datos personales
- 🟡 Análisis estático en CI (Semgrep o CodeQL) · firewall/WAF del hosting · protección DDoS
- 🟡 Pentest antes de lanzar (🔴 si `payments` o datos sensibles)

*+ Formularios · 🔴 si hay cualquier formulario*
- Validación server-side · anti-spam (honeypot o captcha) · rate limit

*+ Usuarios · 🔴 si `auth`*
- Hashing con argon2 o bcrypt · cookies `HttpOnly` + `Secure` + `SameSite`
- Protección CSRF · rate limit en login, registro y recuperación
- Mensajes que no revelan si un email existe
- Expiración de sesión · invalidar sesiones al cambiar contraseña
- **Autorización server-side por recurso** (un usuario no puede ver datos de otro cambiando un ID)
- 🟡 MFA opcional · aviso de inicio de sesión nuevo

*+ Base de datos · 🔴 si hay DB*
- **RLS activo en todas las tablas** cuando el cliente accede directo a la DB (ej. Supabase) · `locked`
  - Políticas separadas por operación: select, insert, update, delete
  - Una tabla nueva sin RLS bloquea
  - Verificación: cada `create table` en migraciones tiene su `enable row level security`, más los advisors de Supabase cuando aplique
  - Tests de políticas: el usuario A no puede leer ni modificar datos del usuario B
- Usuario de DB de la app con privilegios mínimos
- Conexión cifrada (SSL)

*+ Pagos · 🔴 si `payments`*
- Checkout o elementos alojados del procesador (nunca tocar datos de tarjeta)
- Firma de webhooks verificada · idempotencia
- Montos y precios calculados en servidor, nunca confiados al cliente

*+ Uploads · 🔴 si `uploads`*
- Validar tipo real y tamaño · nombres aleatorios · storage separado del código · nunca ejecutar archivos subidos
- 🟡 Escaneo antivirus

*+ Admin · 🔴 si `admin-panel`*
- Roles y permisos · MFA obligatorio para admins · log de auditoría de acciones

*+ API pública · 🔴 si `api-public`*
- Auth por API key o token · rate limit · CORS restrictivo · versionado

**Auth — funcionalidad** (si `auth`)
🔴 recuperación de contraseña · verificación de email · borrar cuenta · exportar datos (si EU/UK/BR/CA:QC)

**Pagos — funcionalidad** (si `payments`)
🔴 página de éxito/fallo · recibos · manejo de impuestos · ToS + refund policy

**Contenido de usuarios** (si `ugc`)
🔴 reportar contenido · moderación · términos de contenido · aviso DMCA (USA)

**Email** (si `email`)
🔴 SPF/DKIM/DMARC · enlace de baja en marketing · plantillas transaccionales
🔴 Plantillas bajo los tokens del sistema de diseño · versión en texto plano · links absolutos · texto de preheader · probadas en Gmail, Outlook y Apple Mail (claro y oscuro) · responsive
🟡 Plantillas como componentes (ej. React Email)

**Newsletter** (si `newsletter`)

*Unirse · 🔴*
- Formulario simple (email + nombre opcional) con anti-spam y rate limit
- Casilla de consentimiento **sin marcar por defecto**, separada de la aceptación de ToS
- Dice qué se va a recibir y con qué frecuencia
- **Doble opt-in**: email de confirmación antes de agregar a la lista (🔴 en EU, UK, CA y BR; 🟡 en los demás)
- Registro del consentimiento: fecha, origen (formulario o página) y texto aceptado
- Estado de éxito claro: "Revisa tu correo para confirmar"

*Dejar de recibir · 🔴*
- Enlace para darse de baja **en cada email**, visible en el footer
- Baja en un clic, sin iniciar sesión ni pedir datos
- Encabezados `List-Unsubscribe` y one-click (exigidos por Gmail y Yahoo para envíos masivos)
- La baja se aplica de inmediato (la ley de USA da un plazo máximo, pero lo correcto es inmediato)
- Página de confirmación de baja con opción de volver a suscribirse si fue un error
- Darse de baja del newsletter **no** detiene emails transaccionales (recibos, contraseñas)
- Dirección física del remitente en el footer (exigido en USA)

*Otros*
- 🔴 Nunca usar listas compradas o importadas sin consentimiento
- 🟡 Centro de preferencias (temas y frecuencia) como alternativa a la baja total
- 🟡 Email de bienvenida · archivo público de ediciones anteriores · RSS

**Legal general**
🔴 Privacy policy (si `has_personal_data`: formulario, analytics, cookies) · ToS (si `auth`, `payments` o `ugc`) · consentimiento de cookies (ver bloque Cookies) · contacto o responsable visible · licencias válidas de fuentes, imágenes e íconos

**Sistema de diseño** — 🔴 siempre

Se genera **antes** de construir páginas. Todo componente del proyecto sale de aquí.

- **Tokens** en un solo lugar: colores (semánticos: `primary`, `muted`, `destructive`…), tipografía, espaciado, radios, sombras, z-index, breakpoints y **motion** (duraciones y curvas)
- Tokens preparados para tema claro y oscuro (cambiar de tema = cambiar tokens, sin tocar componentes). Publicar el modo oscuro es ⚪ (`dark-mode`)
- **Jerarquía de texto** con pocos estilos, cada uno con un rol claro:
  - Máximo ~6 tamaños: `display`, `h1`, `h2`, `h3`, `body`, `small`
  - Máximo 3 pesos: regular (400), medio (500–600), bold (700)
  - Máximo 3 colores de texto: `foreground` (principal), `muted` (secundario), `subtle` (terciario); más `link` y `destructive` con rol propio
  - Cada estilo combina tamaño + peso + color + interlineado y se usa como token (`text-h2`, `text-muted`), nunca armado a mano
  - Cada nivel se distingue del siguiente en al menos dos de los tres ejes (tamaño, peso, color)
  - Verificación automática: tamaños, pesos o colores de texto fuera de los tokens
- **Tokens y tema completos desde el inicio; componentes cuando se necesitan**:
  - El tema de shadcn/ui (variables CSS, radios, tipografía) se configura desde los tokens en `foundation.design` (stack React). En stacks sin React: mismos tokens + componentes equivalentes
  - Cada componente de shadcn se agrega la primera vez que se usa; como hereda los tokens, sale congruente automáticamente
  - Al agregarlo: se adapta si hace falta, se registra en `REGISTRY.md` y aparece en `/design-system`
  - Nunca se crea un componente propio si shadcn o el registro ya tienen uno que sirve
- Componentes propios que shadcn no trae, también al primer uso: empty state, dropzone, page header, skeletons por patrón (tabla, card, lista, perfil), indicador de conexión, barra de progreso de página
- Página `/design-system` con los componentes instalados y sus estados, más la muestra de tokens y jerarquía de texto (`noindex`, fuera del sitemap)
- Verificación automática: **cero colores hardcodeados** (hex, rgb o valores arbitrarios de Tailwind como `bg-[#...]`) fuera del archivo de tokens; nada de estilos inline para color o espaciado

**Estados, feedback y motion** — 🔴 siempre

*Cada vista con datos tiene 4 estados:* cargando · vacío · error (con acción para reintentar) · con datos

*Carga*
- **Skeletons** con la forma del contenido real (no spinners genéricos en layouts)
- Barra de progreso en navegación entre páginas
- Progreso real (%) en operaciones largas: uploads, exports, procesos

*Feedback inmediato (< 100 ms visual, aunque el servidor tarde)*
- Botones con estado pendiente y bloqueo de doble envío
- **UI optimista** donde se pueda revertir (likes, toggles, editar texto), con rollback si falla
- Toasts para confirmar acciones y para errores
- **Dropzone viva**: reposo → arrastrando encima (cambia visualmente) → subiendo (progreso) → éxito o error por archivo
- Validación de formularios en línea, al salir del campo, no solo al enviar

*Motion*
- Transiciones en aperturas y cierres (modales, menús, acordeones), cambios de estado y entrada de listas
- Duraciones cortas desde tokens (150–300 ms)
- Respeta `prefers-reduced-motion`: se reduce a fades o se elimina

*Leyes de UX aplicadas*
- **Doherty**: respuesta perceptible en < 400 ms → feedback inmediato
- **Fitts**: acciones principales grandes y cerca; objetivos táctiles ≥ 44 px
- **Hick**: pocas opciones por decisión; un CTA principal por vista
- **Miller / chunking**: formularios largos en pasos o grupos
- **Jakob**: patrones conocidos (logo arriba a la izquierda, carrito arriba a la derecha)
- **Proximidad y región común (Gestalt)**: agrupar lo relacionado
- **Von Restorff**: solo una cosa destaca por vista
- **Tesler**: el sistema absorbe la complejidad (autocompletar, valores por defecto)
- **Goal-gradient / Zeigarnik**: progreso visible en onboarding y procesos de varios pasos
- **Peak-end**: cuidar el final de los flujos (confirmación de compra, registro exitoso)

*Principios de UI aplicados*
- **Jerarquía visual**: tamaño, peso y color indican importancia; se entiende qué leer primero
- **Retícula y alineación**: todo alineado a una grid; nada "flotando"
- **Escala de espaciado** (base 4 u 8 px): solo valores de la escala, nunca arbitrarios
- **Escala tipográfica** definida (ej. ratio 1.25): máximo 2 familias tipográficas
- **Largo de línea**: 60–80 caracteres en textos de lectura
- **Espacio en blanco** como separador antes que bordes y líneas
- **Color 60-30-10**: dominante, secundario y acento; el acento solo para acciones
- **Gestalt**: similitud (lo que funciona igual se ve igual), continuidad, cierre, figura-fondo
- **Affordances y signifiers**: lo clicable parece clicable; estados hover, focus, active y disabled en todo elemento interactivo
- **Consistencia**: mismo componente, mismo comportamiento en todo el sitio
- **Heurísticas de Nielsen**: visibilidad del estado del sistema, control y libertad (deshacer, cancelar), prevención de errores, reconocer antes que recordar

Verificación: los skeletons, empty states y estados de error se revisan por `grep` de componentes. Espaciado arbitrario, más de 2 familias tipográficas y elementos interactivos sin estados `hover`/`focus` se detectan automáticamente. El resto de las leyes de UI y UX se verifica como `manual` en el brief.

**Contenido** — 🔴 siempre
- Cero lorem ipsum, placeholders o "TODO" visibles (verificable por `grep`)
- Textos finales en todas las páginas, incluidas 404 y 500 (útiles, con salida)
- Microcopy: botones con verbo claro ("Guardar cambios", no "OK"), errores que dicen qué pasó y cómo arreglarlo
- Textos de empty states con acción ("Aún no tienes proyectos · Crear proyecto")
- Alt text real, no nombres de archivo
- Legales con fecha de última actualización
- Textos fuera del código en archivos de traducción (aunque haya un solo idioma)

🟡 Recomendados:
- Guía de voz y tono · página About / Nosotros · FAQ · favicon y nombre consistentes en emails

**Formularios** — 🔴 si hay cualquier formulario
- **El label nunca desaparece**: dentro del campo en reposo; al enfocar o tener valor, se reduce y sube dentro del mismo campo con una transición (label flotante). Nunca usar el placeholder como único label
- Tipo de input correcto (`email`, `tel`, `url`, `number`, `date`) e `inputmode` para el teclado móvil adecuado
- Atributos `autocomplete` correctos (`email`, `given-name`, `new-password`, `one-time-code`…) para autocompletar y gestores de contraseñas
- **Validación sin regaños prematuros**:
  - No se marca error mientras el usuario escribe por primera vez
  - Se valida al salir del campo (`blur`)
  - Una vez marcado con error, se revalida en cada tecla para que el error desaparezca apenas se corrige
  - Al enviar: valida todo y lleva el foco al primer error
- Nunca borrar lo escrito si hay un error
- Campos obligatorios u opcionales marcados (se marca lo que sea minoría)
- Contraseña con botón mostrar/ocultar; pegar siempre permitido
- 🟡 Contador de caracteres en campos con límite · máscaras de formato (teléfono, tarjeta) que no bloqueen la escritura

**Datos y tablas** — 🔴 si hay listados o tablas con datos
- Paginación, filtros, orden y búsqueda **guardados en la URL** (la vista se puede compartir y sobrevive al recargar)
- Estados: cargando (skeleton de tabla), vacío, sin resultados con filtros (con botón para limpiar filtros), error
- Encabezado fijo en tablas largas
- En móvil, las tablas se convierten en cards o tienen scroll horizontal contenido (nunca de toda la página)
- 🟡 Acciones en lote · exportar (CSV) · virtualización en listas muy largas · columnas configurables

**Búsqueda** (si `search`)
🔴 Consulta en la URL (`?q=`) · debounce al escribir · tolerancia a errores de escritura · resaltado de coincidencias · estado "sin resultados" con sugerencias
🟡 Atajo de teclado (⌘K / Ctrl+K) · búsquedas recientes

**Responsive y portabilidad** — 🔴 siempre

| Rango | Ancho | Comportamiento |
|---|---|---|
| Móvil | 360–767 px | Una columna, navegación compacta, objetivos táctiles ≥ 44 px |
| Tablet | 768–1023 px | Layouts intermedios; vertical y horizontal |
| Laptop / desktop | 1024–1919 px | Layout completo |
| Ultra wide+ | ≥ 1920 px | Mismo formato que desktop: contenido con ancho máximo centrado; fondos y secciones full-bleed se extienden a los bordes |

- Mobile-first
- Verificación automática: capturas en 360, 768, 1280, 1920 y 2560 px (Playwright) sin scroll horizontal ni elementos encimados
- Orientación horizontal en móvil y tablet sin romper
- Nada depende solo de `hover` (en touch no existe)
- Áreas seguras en pantallas con notch (`env(safe-area-inset-*)`)
- Alturas completas con `dvh`, no `vh` (las barras del navegador móvil rompen `vh`)
- El largo de línea máximo se respeta también en ultra wide

**Navegación** — 🔴 siempre
- Menú móvil accesible: cierra con Esc, mantiene el foco dentro mientras está abierto
- Página activa indicada en el menú
- El botón "atrás" del navegador funciona como se espera (tabs, filtros y modales relevantes se reflejan en la URL)
- Restauración del scroll al volver atrás
- Toda vista compartible tiene su URL
- Logo enlaza al inicio · footer con legales y contacto

**Acciones destructivas** — 🔴 si hay acciones que borran o cambian datos

| Severidad | Ejemplos | Patrón |
|---|---|---|
| Leve (reversible) | archivar, quitar de una lista, marcar como leído | Se ejecuta directo + toast con **Deshacer** (5–10 s) |
| Media | borrar un elemento | **Long press** (mantener ~1 s con progreso visual) o diálogo breve · deshacer cuando sea posible |
| Alta | borrar varios elementos, cancelar suscripción | Diálogo que dice exactamente qué se pierde · botón con verbo específico ("Eliminar 12 archivos") en color destructivo |
| Extrema (irreversible) | borrar cuenta, proyecto o base de datos; transferir propiedad | **Confirmación escrita** (escribir el nombre del recurso) + reautenticación si hay `auth` + periodo de gracia cuando se pueda (ej. 30 días) |

Reglas:
- Borrado lógico (soft delete) por defecto en datos de usuario
- El long press siempre tiene alternativa por teclado y lector de pantalla (accesibilidad)
- El botón destructivo nunca tiene el foco por defecto
- En móvil, el long press muestra progreso visual y vibración leve donde se soporte

**Trabajo sin guardar** — 🔴 si hay formularios largos o editores
- Aviso al salir de la página con cambios sin guardar (cierre de pestaña y navegación interna)
- Autoguardado o borrador local en formularios largos
- Aviso antes de que expire la sesión, con opción de extenderla
- Si hay que volver a iniciar sesión, se conserva lo escrito

**Zonas horarias** — 🔴 si se muestran o guardan fechas y horas
- Guardar siempre en UTC (`timestamptz` en PostgreSQL)
- Mostrar en la zona horaria del usuario
- Indicar la zona cuando hay ambigüedad (citas, eventos, fechas límite)
- Fechas relativas ("hace 2 h") con la fecha exacta al pasar el cursor o tocar
- Tareas programadas calculadas en la zona del usuario
- Cuidar los cambios de horario de verano: USA, CA, EU y UK los tienen; México (salvo la franja fronteriza) ya no

**Notificaciones** (si `notifications`)
🔴 Centro de notificaciones in-app · preferencias por canal (in-app, email, push) · el permiso de push se pide **después** de una acción del usuario, nunca al cargar · forma de desactivarlas
🟡 Agrupar notificaciones repetidas · resumen diario por email

**Realtime** (si `realtime`)
🔴 Reconexión automática · indicador de estado de conexión · reconciliar con el servidor al reconectar · autorización por canal
🟡 Presencia ("quién está viendo") · indicador de "escribiendo…"

**PWA** (si `pwa`)
🔴 Web manifest completo · íconos maskable · service worker · página offline de respaldo · HTTPS
🟡 Prompt de instalación propio, mostrado en el momento adecuado

**Offline** (si `offline`)
🔴 Estrategia de caché definida por tipo de recurso · indicador de "sin conexión" · cola de acciones que se sincroniza al volver · resolución de conflictos definida
🟡 Aviso de qué funciones no están disponibles offline

**Cookies y consentimiento** — 🔴 siempre

*Base (todos los mercados)*
- Inventario de todo lo que se guarda en el navegador (cookies, localStorage, píxeles), con categoría: esencial, preferencias, analítica, marketing
- Política de cookies basada en ese inventario
- Cookies propias con `Secure`, `HttpOnly` cuando aplique, `SameSite` y expiración mínima necesaria

*Si hay cookies no esenciales y mercado EU, UK, BR o CA:QC*
- Banner con "Aceptar" y "Rechazar" **igual de visibles** en el primer nivel
- Consentimiento granular por categoría
- **Nada no esencial se carga antes del consentimiento** (scripts de terceros condicionados; verificable)
- Cambiar o retirar el consentimiento en cualquier momento (enlace en el footer)
- Registro del consentimiento: fecha, versión de la política y categorías aceptadas
- Volver a preguntar cuando cambia la política

*Si USA:CA*
- Respetar la señal Global Privacy Control (GPC)
- Enlace "Do Not Sell or Share My Personal Information" si se comparten datos para publicidad

🟡 Analítica sin cookies (ej. Plausible o Vercel Analytics) para evitar el banner donde sea posible

**Retención de datos** — 🔴 si se guardan datos personales
- Tabla de retención: cada tipo de dato, cuánto tiempo se guarda y por qué
- Borrado o anonimización automática al vencer el plazo (tarea programada)
- Borrar una cuenta elimina sus datos en DB, storage y servicios de terceros; los backups expiran en un plazo definido
- Logs con retención limitada
- La tabla se refleja en la privacy policy

**Suscripciones** (si `subscriptions`)
🔴 Obligatorios:
- Cancelar en línea tan fácil como suscribirse, sin llamadas ni pasos de retención forzados (leyes de renovación automática en USA:CA, EU y otros)
- Antes de pagar: precio, periodicidad, renovación automática y cómo cancelar, todo visible
- Aviso antes de renovar planes anuales y antes de que termine una prueba gratuita
- Cobros fallidos: reintentos, email al usuario y periodo de gracia
- Upgrade y downgrade con prorrateo definido
- Portal de facturación: historial, facturas y método de pago
- Estado de la suscripción sincronizado por webhooks

**IA** (si `ai-features`)
🔴 Obligatorios:
- Límites de gasto por usuario y globales + rate limit + alertas de costo
- Protección contra prompt injection: instrucciones separadas de los datos del usuario; la IA no ejecuta acciones peligrosas sin confirmación humana
- API keys solo en servidor (ver Secretos)
- Aviso claro cuando el usuario interactúa con IA o ve contenido generado por IA (obligatorio en la EU; buena práctica en todos)
- Moderación de entradas y salidas cuando el contenido es público
- Respaldo si la API falla o tarda: timeout, mensaje claro, reintento
- Streaming en respuestas largas (feedback inmediato)
- No enviar datos sensibles sin necesidad; revisar la retención de datos del proveedor

🟡 Casos de prueba para evaluar calidad · registro de prompts y respuestas sin datos personales

**Control de costos** — 🔴 siempre
- Alertas de presupuesto en hosting, DB, APIs pagadas y email
- Límites duros de gasto en los servicios que lo permitan
- Costos recurrentes estimados documentados en el brief (hosting, dominio, servicios), sobre todo en `client-project`

🟡 Revisión mensual de costos

**SEO local** (si `type: local-business`)
🔴 JSON-LD LocalBusiness (dirección, horario, teléfono) · nombre, dirección y teléfono idénticos en todo el sitio y perfiles externos · página de contacto con mapa y horario
🟡 Google Business Profile reclamado y enlazado · una página por sucursal · reseñas visibles

**Términos versionados** — 🔴 si `auth`
- Guardar por usuario qué versión de ToS y privacy aceptó, y cuándo
- Si cambian de forma importante, pedir nueva aceptación en el siguiente inicio de sesión (o avisar por email, según el cambio)
- Versiones anteriores archivadas y consultables
- Casilla de aceptación sin marcar por defecto en el registro

**Embeds de terceros** — 🔴 si hay cualquier embed (YouTube, mapas, chats, redes sociales)
- **Fachada**: se muestra una imagen o vista previa; el embed real carga al hacer clic
- Si el embed pone cookies y el mercado exige consentimiento, carga solo después de aceptarlo
- Versiones con menos rastreo cuando existan (ej. `youtube-nocookie.com`)
- `title` descriptivo en cada `iframe` (accesibilidad)
- Espacio reservado con dimensiones fijas (sin saltos de layout)
- Widgets de chat cargados de forma diferida

**Video y audio** (si `media`)
🔴 Obligatorios:
- Subtítulos en video; transcripción en audio
- Sin autoplay con sonido; el autoplay solo se permite silenciado y con pausa visible
- Controles visibles y operables por teclado
- Miniatura y dimensiones reservadas
- Lazy load de videos bajo el pliegue
- Videos largos con streaming adaptativo o hosting especializado (no archivos pesados servidos directo)

🟡 Audiodescripción en videos informativos · capítulos en videos largos

**Reservas** (si `type: booking` o hay agenda de citas)
🔴 Obligatorios:
- Sin dobles reservas: bloqueo a nivel de base de datos, no solo en la interfaz
- Disponibilidad calculada en la zona horaria correcta (ver Zonas horarias)
- Confirmación por email con archivo `.ics` y enlaces para cancelar o reprogramar
- Recordatorios antes de la cita
- Política de cancelación visible antes de reservar
- Horario del negocio, buffers entre citas y días bloqueados configurables
- Panel para el negocio: ver, bloquear y mover citas

🟡 Sincronización con Google o Outlook Calendar · depósito o pago anticipado (activa `payments`) · lista de espera

**CMS** (si `cms`)
🔴 Obligatorios:
- El cliente edita sin código: textos, imágenes, blog y SEO por página (title, description, `og:image`)
- Bloques predefinidos que respetan el sistema de diseño (nada de HTML libre)
- Vista previa antes de publicar
- Roles: editor y administrador
- Imágenes subidas se optimizan automáticamente (WebP/AVIF, tamaños responsive)
- Alt text obligatorio al subir imágenes
- Guía corta de uso para el cliente
- La elección del CMS se documenta como ADR

🟡 Historial de versiones con restauración · publicación programada · contenido multilenguaje desde el CMS (si `i18n`)

**Migración de sitio anterior** (si `site-migration`)
🔴 Obligatorios:
- Inventario de todas las URLs actuales (sitemap, rastreo y páginas con tráfico)
- Mapa URL vieja → URL nueva en un archivo versionado (`redirects.csv`)
- Redirección 301 específica por URL (nunca mandar todo a la página de inicio)
- Conservar títulos y descripciones de las páginas que ya posicionan bien
- Migrar contenido e imágenes con su alt text
- Verificación automática antes de lanzar: cada URL vieja responde 301 hacia una página que existe
- Después de lanzar: reenviar sitemap y vigilar errores 404 durante 2–4 semanas

🟡 Respaldo completo del sitio anterior · comparación de tráfico antes y después

**Calidad de código** — 🔴 siempre · mantra del proyecto

*Principios*
- **Simple primero**: la solución más simple que resuelve el problema; nada construido "por si acaso"
- **Reutilizar antes de crear**: buscar componente, hook o utilidad existente antes de escribir uno nuevo. Al tercer uso de un patrón, se extrae
- **Una responsabilidad por función, componente y archivo**
- **Nombres que explican**: el código se entiende sin comentarios; los comentarios dicen el *porqué*, no el *qué*
- **Consistencia**: mismo problema, misma solución en todo el proyecto
- **Regla del boy scout**: cada cambio deja el código igual o más limpio

*Estructura*
- Carpetas por feature o dominio, con convención documentada en el README
- Componentes de UI solo desde el sistema de diseño; lógica de negocio fuera de los componentes
- Utilidades, tipos y constantes compartidos en un solo lugar
- Manejo de errores consistente (un patrón para todo el proyecto)

*Reglas verificables*

| Regla | Herramienta (ejemplo) | Umbral por defecto |
|---|---|---|
| Formato automático | Prettier o equivalente | sin diferencias |
| Lint estricto | ESLint o equivalente | 0 errores |
| Tipado estricto | TypeScript `strict` | 0 `any` explícitos |
| Complejidad por función | regla de complejidad del linter | ≤ 10 |
| Largo de archivo | regla del linter | ≤ 300 líneas |
| Largo de función | regla del linter | ≤ 50 líneas |
| Código duplicado | jscpd o similar | ≤ 3% |
| Código muerto y exports sin uso | knip o similar | 0 |
| Sin `console.log`, código comentado ni `TODO` sin referencia (`shortcut:` de Ponytail permitido) | `grep` | 0 |

Los umbrales son configurables por proyecto en `profile.yaml`; bajarlos requiere `/mep:override` con razón.

*Mapas de referencia* (ver sección 15)
- `CODEMAP.md` y `REGISTRY.md` existen y están al día; un export nuevo sin entrada en el registro bloquea

*Pruebas*
- Lógica de negocio con tests unitarios (cálculos, permisos, validaciones)
- 🟡 Cobertura mínima en lógica de negocio (ej. 70%)

*Revisión*
- 🟡 Revisión de calidad antes de cerrar cada sub-etapa: duplicados, nombres, complejidad, oportunidades de reutilizar

**Calidad y despliegue**

🔴 Obligatorios:
- Build, lint y type-check pasan (verificación por comando)
- Entornos separados (producción / preview) con variables distintas
- Monitoreo de errores en producción
- Si hay base de datos: migraciones versionadas + backups con restauración probada

🟡 Recomendados:
- Tests end-to-end en flujos críticos (login, checkout)
- Uptime monitoring · rollback documentado · navegadores soportados definidos

**Registro de decisiones (ADR)** — 🔴 siempre
- `docs/decisions/`: un archivo por decisión con contexto, decisión, alternativas y consecuencias
- Las decisiones de stack del brief generan los primeros ADR automáticamente
- Cambiar una decisión = nuevo ADR que reemplaza al anterior (no se borra)

**Git** — 🔴 si `client-project` o hay más de una persona; 🟡 en proyectos propios individuales
- `main` protegida: sin push directo, PR con checks obligatorios (build, lint, tests, mep verify)
- Commits con formato consistente (Conventional Commits)
- Plantilla de PR que referencia los ítems del brief afectados
- 🟡 Tags de versión · CODEOWNERS

**Analytics** — 🔴 si `analytics`, `payments` o `type: saas`; 🟡 en los demás
- Plan de eventos definido antes de lanzar (registro, activación, compra, cancelación)
- Cumple con la sección de cookies y consentimiento
- 🟡 Embudo de conversión y panel con métricas clave

**Entrega al cliente** (si `client-project`)

🔴 Dominio y cuentas (hosting, DB, pagos) a nombre del cliente · credenciales transferidas de forma segura · README de operación

🟡 Manual de uso para el cliente · acceso del cliente a analytics

### Mercados (`catalog/markets/`)

| Mercado | Puntos a cubrir |
|---|---|
| MX | LFPDPPP, aviso de privacidad (integral/simplificado), PROFECO para e-commerce, CFDI si facturas |
| USA | CCPA/CPRA (USA:CA) y leyes estatales, COPPA (menores), ADA (accesibilidad), CAN-SPAM, DMCA |
| CA | PIPEDA, Quebec Ley 25 + francés (CA:QC), CASL (email), AODA (CA:ON) |
| EU | GDPR, ePrivacy/consentimiento de cookies, European Accessibility Act, derecho de desistimiento, SCA/3DS, IVA, DSA (si ugc), Impressum (EU:DE) |
| UK | UK GDPR, PECR (cookies), Consumer Contracts Regulations |
| BR | LGPD, encargado de datos (DPO), Código de Defensa del Consumidor |
| IN | DPDP Act, consentimiento explícito, oficial de quejas |

### Idiomas y formatos por mercado

Elegir mercados activa idiomas y formatos automáticamente. Si hay más de un idioma, se activa `i18n`.

| Mercado | Idioma | Nivel | Formatos |
|---|---|---|---|
| MX | es-MX | 🔴 | MXN · dd/mm/aaaa |
| USA | en-US | 🔴 | USD · mm/dd/yyyy · unidades imperiales |
| USA | es-US | 🟡 (gran población hispanohablante) | |
| CA | en-CA | 🔴 | CAD |
| CA:QC | fr-CA | 🔴 (ley de Quebec) | |
| CA (resto) | fr-CA | 🟡 | |
| EU:<país> | idioma del país | 🔴 para legales y checkout | EUR (o moneda local) · dd/mm/aaaa |
| UK | en-GB | 🔴 | GBP · dd/mm/yyyy |
| BR | pt-BR | 🔴 | BRL |
| IN | en-IN | 🔴 | INR · lakh/crore |
| IN | hi | 🟡 | |

Reglas 🔴 si hay más de un idioma:
- URL por idioma (`/es/`, `/en/`) + hreflang + `lang` por página
- Formatos con `Intl` (fechas, números, moneda), nunca concatenados a mano
- Selector de idioma visible y persistente
- Layouts que aguanten textos más largos (alemán y francés crecen ~30%)
- Precios en la moneda del mercado si hay `payments`

Todo ítem legal lleva `references` a fuente oficial y el brief incluye: *"Checklist orientativo, no sustituye asesoría legal."*

---

## 10. Fases de construcción

1. **Esquema + motor**: `dimensions.yaml`, esquema de ítems, `evaluate` con tests de condiciones.
2. **Verificación**: `verify` con los 6 tipos y detección de framework (Next.js, Astro, Vite/React primero).
3. **Render**: generar `BRIEF.md` desde el perfil.
4. **Comandos base**: `/mep:scope`, `/mep:add`, `/mep:check`, `/mep:skip`, `/mep:override`, `/mep:phase`.
5. **Hooks y CI**: Stop, PreToolUse (despliegue), SessionStart y el check de CI.
6. **Comandos de mantenimiento**: `/mep:audit`, `/mep:update`.
7. **Catálogo**: base + SEO + seguridad primero; luego capacidades; luego mercados.
8. **Proyecto de prueba**: un SaaS ficticio (auth + pagos, MX + USA:CA + EU:DE) para validar todo el flujo.
9. **Presets, cotizador y export**: los 5 presets, `/mep:quote` y `/mep:export`.
10. **Calibración**: `/mep:log-time` y ajuste de rangos con horas reales.

---

## 11. Criterios de aceptación

- [ ] Con el mismo perfil, el motor siempre devuelve los mismos ítems.
- [ ] El hook bloquea por 🔴 pendientes de sub-etapas cerradas y no bloquea si están cumplidos.
- [ ] El hook no hace nada en repos sin `.mep/`.
- [ ] `/mep:add` muestra solo el diff.
- [ ] Cada ítem del catálogo tiene `why`, `how` y al menos un `verify`.
- [ ] Hay tests para el evaluador de condiciones y para cada tipo de verificación.
- [ ] Agregar un mercado nuevo (ej. CN) solo requiere agregar archivos al catálogo, sin tocar el motor.
- [ ] Ningún dato interno (tarifas, horas reales, cotización interna) queda dentro del repo.
- [ ] El check de CI bloquea el merge a `main` con 🔴 pendientes, aunque el deploy ocurra fuera de Claude Code.
- [ ] Un ítem de seguridad sin reporte vigente de `mep-security` no cuenta como cumplido.
- [ ] `registry --check` falla si un export público no está en `REGISTRY.md` o si una entrada apunta a algo que ya no existe.
- [ ] `mep-locator` responde con rutas exactas leyendo primero los mapas, sin recorrer el repo completo.
- [ ] Los ítems de seguridad solo se marcan como cumplidos tras una auditoría de `mep-security`.
- [ ] `/mep:skip` solo acepta 🟡; `/mep:override` rechaza ítems `locked`.
- [ ] El hook de Stop no bloquea por 🔴 de sub-etapas abiertas, excepto ítems `locked`.
- [ ] El deploy a producción bloquea por cualquier 🔴 pendiente.
- [ ] `/mep:audit` genera un perfil y un reporte en un repo existente sin modificar código.
- [ ] `/mep:update` muestra solo los ítems nuevos que aplican al perfil.
- [ ] Cada ítem del catálogo tiene `effort` y `phase`.
- [ ] Con el mismo perfil y tarifas, `/mep:quote` devuelve la misma cotización.
- [ ] La vista `--client` no expone tarifa por hora, márgenes ni colchón.
- [ ] `/mep:add` muestra el impacto del cambio en horas y precio.
- [ ] Los 5 presets cargan un perfil válido.
- [ ] `/mep:export` genera docx y pdf con sección "fuera de alcance" y versión del brief.

---

## 12. Cotizador

Cada ítem del catálogo tiene esfuerzo estimado. El brief se convierte en cotización.

### Tallas

| Talla | Horas base | Ejemplos |
|---|---|---|
| XS | 0.5–1 | robots.txt, meta charset, `.gitignore` |
| S | 1–3 | `og:image` por defecto, página 404, headers de seguridad |
| M | 3–8 | banner de cookies, formulario con validación, sitemap dinámico |
| L | 8–20 | auth completa, sistema de diseño, checkout |
| XL | 20–40+ | suscripciones completas, i18n de todo el sitio, realtime |

### Cálculo

1. Suma del rango de horas de cada ítem activo.
2. Multiplicado por `scales_with` cuando aplica (ej. un ítem por idioma × `counts.languages`).
3. **Trabajo a la medida**: las features propias del scope que no están en el catálogo. Claude las desglosa en tareas con talla y las marca como "estimación a revisar".
4. + gestión de proyecto (% configurable).
5. + colchón de riesgo (% configurable).
6. Redondeo configurable.

### Tarifas

En `~/.config/mep-check/rates.yaml`, **fuera del repo**:

```yaml
currency: USD
hourly_rate: 0        # define tu tarifa
pm_overhead: 0.10     # gestión de proyecto
risk_buffer: 0.20     # colchón de riesgo
rounding: 50          # redondear precios a múltiplos de 50
maintenance_plans:    # precio mensual; horas incluidas por mes
  basic:    { price: 0, hours: 0 }   # actualizaciones de seguridad + backups
  standard: { price: 0, hours: 0 }   # + cambios menores
  premium:  { price: 0, hours: 0 }   # + monitoreo y soporte prioritario
```

### Salidas

- **Vista interna**: horas por ítem y por sub-etapa, mínimo y máximo, tarifa, gestión y colchón.
- **Vista cliente** (`--client`): precio por fase y total, sin tarifas, márgenes ni colchón.
- **Opcionales como extras**: cada ⚪ con su precio individual, para que el cliente elija.
- **Costos recurrentes estimados**: hosting, dominio y servicios, separados del precio del proyecto.
- **Plan de mantenimiento** (si `client-project`): niveles básico, estándar y premium como ingreso mensual, con lo que incluye cada uno y qué se cobra aparte.
- **Cambios de scope**: `/mep:add` muestra el delta en horas y precio antes de aceptar.

### Calibración

`/mep:log-time` guarda horas reales por ítem. Con datos suficientes, el plugin sugiere ajustar los rangos del catálogo.

---

## 13. Presets

Perfiles de partida en `catalog/presets/`. El usuario los ajusta en `/mep:scope`. Si no elige uno, Claude sugiere el más cercano.

| Preset | Tipo | Capacidades por defecto |
|---|---|---|
| `landing` | landing | formulario de contacto, analytics |
| `corporate` | corporate / local-business | varias páginas, cms, blog opcional, formulario, SEO local si es negocio físico |
| `ecommerce` | ecommerce | payments, email, search, uploads (admin de productos), admin-panel |
| `saas` | saas | auth, subscriptions, payments, email, notifications, admin-panel, analytics |
| `marketplace` | marketplace | auth, payments (pagos divididos), ugc, uploads, search, notifications, admin-panel |

Uso: `/mep:scope --preset saas "app para gestionar reservas de estudios de danza"`.

---

## 14. Brief para el cliente

`/mep:export` genera un documento (.docx y .pdf) desde `templates/client-brief/`, en el idioma del cliente.

Contenido:
1. Resumen del proyecto y objetivos
2. **Alcance incluido**: páginas, features y capacidades
3. **Fuera de alcance**: explícito, para evitar malentendidos
4. Mercados y cumplimiento (legal, accesibilidad, privacidad)
5. Stack y por qué (desde los ADR)
6. Entregables por fase y cronograma estimado
7. Cotización por fase + extras opcionales + costos recurrentes + planes de mantenimiento
8. Supuestos y lo que el cliente debe entregar (contenido, accesos, aprobaciones, fechas)
9. Proceso de cambios: todo cambio de scope pasa por `/mep:add` con nueva cotización
10. Criterios de aceptación (el checklist 🔴, en lenguaje no técnico)
11. Firmas

Cada export lleva número de versión (v1, v2…) y una lista de cambios respecto a la versión anterior. El documento incluye la nota: *"Checklist orientativo, no sustituye asesoría legal."*

---

## 15. Mapas de referencia y modelos

Objetivo: que Claude encuentre las cosas en un paso, no recorriendo archivo por archivo, y que cada tarea use el modelo adecuado.

### `CODEMAP.md` — dónde está qué

En la raíz del proyecto:
- Árbol de carpetas principales con una línea por carpeta: qué contiene y qué **no** va ahí
- Puntos de entrada: rutas, API, jobs, configuración, tokens de diseño
- Convenciones: dónde crear un componente nuevo, una ruta, una migración, un test
- Sección de notas manuales para lo que el generador no puede inferir

### `REGISTRY.md` — catálogo de piezas reutilizables

Una entrada por componente, hook, utilidad, tipo compartido y servicio:

```
### Button
- Ruta: src/components/ui/button.tsx
- Para qué: acción principal o secundaria
- Variantes: primary · secondary · ghost · destructive · sizes sm/md/lg
- Ejemplo: <Button variant="destructive">Eliminar 3 archivos</Button>
- No usar para: navegación (usar Link)
```

Reglas:
- **Referencia, no copia**: el registro apunta a la ruta y muestra la firma y un ejemplo corto. Nunca duplica el código, porque una copia se desactualiza y engaña.
- **Generado, no escrito a mano**: `engine/registry` lee los exports y sus comentarios de documentación y regenera el archivo. Solo las líneas "Para qué" y "No usar para" se escriben a mano, en el comentario del propio componente.
- **Siempre al día**: `registry --check` corre en el hook de Stop (sub-etapas cerradas) y en CI. Falla si hay un export sin entrada, sin descripción, o una entrada que apunta a algo que ya no existe.
- La página `/design-system` muestra visualmente lo mismo que el registro lista para los componentes de UI.

### Agentes y modelos

| Agente | Modelo | Esfuerzo | Herramientas | Cuándo |
|---|---|---|---|---|
| `mep-locator` | Haiku | bajo; medio en búsquedas amplias | solo lectura | Cada vez que hay que encontrar código o una pieza reutilizable. Lee `CODEMAP.md` y `REGISTRY.md` primero, abre solo lo necesario y devuelve rutas exactas con extractos breves al modelo principal |
| `mep-security` | Opus | alto | lectura + escáneres (secretos, dependencias, análisis estático) | Implementar o auditar cualquier ítem de seguridad |

`mep-security` se activa:
- Al cerrar las sub-etapas `setup`, `data`, `features` y `ops`
- Antes de cualquier deploy a producción
- Cuando se modifican archivos sensibles: auth, pagos, políticas RLS, migraciones, middleware, manejo de secretos, webhooks (hook `PostToolUse` sobre Edit/Write que detecta esas rutas)

Su resultado es un reporte por ítem (cumple / no cumple / riesgo) guardado en `.mep/security/`. Los ítems de seguridad con verificación `manual` solo se marcan cumplidos con un reporte de esta auditoría.

### Integración con Ponytail

Ponytail (`DietrichGebert/ponytail`) es un plugin siempre activo que hace que el agente escriba solo el código necesario, sin recortar validación, seguridad ni accesibilidad. Mise en place lo trata como dependencia recomendada y lo usa así:

| Momento | Comando de Ponytail | Rol en Mise en place |
|---|---|---|
| Siempre | `/ponytail` (nivel `full` por defecto) | Aplica el mantra de código en cada cambio |
| Cerrar una sub-etapa | `/ponytail-review` | Reemplaza la revisión de calidad propia. El motor exige la revisión registrada (`mep review record`), sin "must fix" y sobre el código actual (hash); si Ponytail está instalado, solo cuenta `/ponytail-review` |
| PR a `main` | `/ponytail-review branch` | Revisión antes del merge |
| `/mep:audit` en repos existentes | `/ponytail-audit` | Aporta el ranking de qué arreglar primero al reporte de brecha |
| Antes de `launch` | `/ponytail-debt` | Revisa los atajos diferidos; los que afectan ítems 🔴 se resuelven antes de lanzar |

Reglas de convivencia:
- Los comentarios `shortcut:` de Ponytail **están permitidos** (no cuentan como `TODO` sin referencia), porque Ponytail los recolecta en su ledger.
- Seguridad: Ponytail no recorta seguridad, pero la responsabilidad sigue siendo de `mep-security`.
- Detección: `enabledPlugins` en `.claude/settings.local.json`, `.claude/settings.json` o `~/.claude/settings.json`, o `~/.claude/plugins/installed_plugins.json`. `MEP_PONYTAIL=1|0` lo fuerza.
- Si Ponytail no está instalado, `/mep:scope` lo sugiere una vez; el plugin funciona igual sin él, usando la revisión de calidad propia.

Notas de implementación:
- Verificar en la documentación actual de Claude Code cómo se declaran modelo y esfuerzo en el frontmatter de los agentes.
- Si el proyecto usa otro plugin de ruteo de modelos (ej. Batuta), estos dos agentes son excepciones fijas: el ruteo general lo decide ese plugin; localizar y seguridad siempre van a estos agentes.
