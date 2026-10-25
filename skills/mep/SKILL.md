---
name: mep
description: Cómo trabajar en un proyecto que usa Mise en place (mep) — interpretar un scope en lenguaje natural como perfil, usar el catálogo de ítems y respetar BRIEF.md. Úsalo cuando el proyecto tenga .mep/profile.yaml o BRIEF.md, o cuando el usuario describa un website o webapp nuevo.
user-invocable: false
---

# Mise en place (mep)

mep convierte un scope en un **perfil**, el perfil en un **checklist** (🔴 obligatorio · 🟡 recomendado · ⚪ opcional) y verifica el repo contra él con un motor determinista. Tú interpretas y conversas; el motor decide qué aplica y qué está cumplido. Nunca marques un ítem como cumplido por tu cuenta.

Motor: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs" <comando>` (desde la raíz del proyecto). `help` lista los comandos.

## Perfil (`.mep/profile.yaml`)

Solo valores de `${CLAUDE_PLUGIN_ROOT}/catalog/dimensions.yaml`:

- `type` (uno), `capabilities`, `markets` (con sub-niveles: `USA:CA`, `CA:QC`, `EU:DE`), `audience`, `context` (`client-project` | `own-product`).
- `signals`: hechos del proyecto (`has_forms`, `has_db`, `db_client_access`, `has_dates`, …). Las capacidades encienden algunas solas (`auth` → formularios, DB y datos personales); tú infieres las demás de la descripción.
- `counts`: `pages`, `entities`, `languages`, `integrations` (alimentan el cotizador). Más de un idioma activa `i18n`.
- `stack.decided`: solo lo que el usuario decidió explícitamente; lo demás lo recomiendan las reglas de `catalog/stack-rules.yaml` con su porqué.

Presets de partida: `landing`, `corporate`, `ecommerce`, `saas`, `marketplace` (`catalog/presets/`). Si el usuario no elige, sugiere el más cercano.

## Las reglas se activan por el scope

Cada regla del catálogo tiene una condición (`when`) sobre el perfil: aplica o no según el scope del proyecto, nunca por defecto. Una landing sin cuentas no recibe reglas de RLS; un sitio sin cookies no recibe banner. `explain <id>` muestra la condición con ✓/✗ y por qué una regla aplica o no. En un repo existente, el scope lo da el usuario y el código es solo evidencia (`/mep:audit`).

## Cómo interpretar un scope

1. Elige `type` y preset por lo que el producto *es*, no por cómo se construye.
2. Capacidades: solo las que el scope pide o implica claramente ("cobrar mensualidad" → `subscriptions`; "subir fotos" → `uploads`).
   - Cobrar: `payment-links` si el pago ocurre en la página del proveedor (Stripe Payment Links, botón de compra, Mercado Pago, Gumroad): sin backend ni base de datos. `payments` solo si el sitio crea el pago en su servidor, recibe webhooks o guarda pedidos. Una landing que vende con un enlace es `payment-links`.
   - Base de datos (`has_db`): solo si hay que guardar algo propio (cuentas, pedidos, reservas, contenido de usuarios). Un formulario de contacto que manda email, un newsletter en el proveedor o pagos por enlace **no** necesitan base de datos. `auth`, `subscriptions`, `ugc` y `admin-panel` ya la implican.
3. Señales: infiere de verbos y objetos ("reservas con fecha" → `has_dates`; "listado de clientes" → `has_tables`; "borrar proyectos" → `has_destructive_actions`; Supabase con consultas desde el navegador → `db_client_access`).
4. Pregunta **solo** lo que cambia ítems 🔴 o los `counts`: mercados, si hay menores o datos sensibles, cliente vs. producto propio, número aproximado de páginas, entidades, idiomas e integraciones. Agrupa las preguntas (AskUserQuestion, máximo 4).

## Reglas de trabajo en un proyecto con mep

- `BRIEF.md` es la instrucción maestra; se regenera desde el perfil, no se edita a mano.
- Fases: `foundation.setup → foundation.design → build.data → build.features → build.ux → launch.content → launch.seo → launch.ops`. Trabaja la sub-etapa activa; las 🔴 de sub-etapas cerradas están protegidas contra regresiones.
- Seguridad: la implementa o la audita el agente `mep-security`. Un ítem de seguridad solo cuenta como cumplido con su reporte en `.mep/security/`.
- Para encontrar código usa el agente `mep-locator`. Mantén los mapas al día: `codemap` regenera `CODEMAP.md` (respeta "Notas manuales") y `registry` regenera `REGISTRY.md` desde los exports; "Para qué", "No usar para", "Variantes" y `@example` se escriben en el comentario `/** */` de cada export, nunca en el registro.
- Antes de abrir o fusionar un PR a `main`, mep pide una revisión de calidad (una vez por commit): `/ponytail-review branch` si Ponytail está instalado; si no, revisa duplicados, nombres, complejidad y reutilización contra `REGISTRY.md`. Luego reintenta el comando.
- Umbrales de calidad (complexity, max_lines, max_function_lines) en `quality` del perfil; relajarlos solo con `threshold … --yes` y razón del usuario.
- Features fuera del catálogo van en `custom_work` del perfil, con talla; el cotizador las marca "estimación a revisar".
- Cotización: solo corre sola al definir el scope y en cambios de scope. No la calcules en otros momentos salvo que el usuario la pida (`/mep:quote`).
- Ítems 🔒 (`locked`) no se desactivan nunca. 🟡 se omite solo con `/mep:skip` y razón; 🔴 se desactiva solo con `/mep:override`, con razón y confirmación del usuario.
- `MEP_BYPASS=1` es un escape de emergencia del usuario, no tuyo. No aplica a ítems locked.
- "Checklist orientativo, no sustituye asesoría legal."
