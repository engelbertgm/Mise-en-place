# Documentos de planeación — diseño

Fecha: 2026-10-29 · Versión objetivo: plugin 0.3.0, catálogo 2026.10.9

## Intención

Hoy mep produce `SCOPE.md` (qué es el proyecto), `BRIEF.md` (stack y checklist) y ADRs en `docs/decisions/`. Falta lo que un equipo serio escribe antes de construir: qué se construye y para quién (PRD), cómo se construye (TRD), por dónde se mueve el usuario (flujos), cómo se guardan los datos (esquema) y en qué orden se construye (implementación).

El usuario ve estos documentos como lo que hace a mep robusto: Claude construye contra un plan escrito y no contra lo que recuerda de la sesión anterior, y el cliente ve y aprueba lo que le concierne.

## Metas

- G1. Cinco documentos con plantilla fija: misma estructura en todo proyecto y en toda sesión.
- G2. Sintaxis simple pero completa, clara y bien definida.
- G3. Diagramas donde aportan, hechos con diagram-design.
- G4. Cada documento se escribe cuando hay información real para escribirlo, no antes.
- G5. El motor verifica que cada documento exista al cerrar su sub-etapa y que no se haya desviado del código.
- G6. El cliente recibe versiones sin jerga de los documentos que le conciernen, con diagramas, en .docx y .pdf.

## No-metas

- No genera el contenido el motor: lo escribe Claude desde la plantilla. El motor solo verifica.
- No reemplaza `SCOPE.md`, `BRIEF.md` ni los ADRs: los documentos se apoyan en ellos y los citan.
- No verifica la calidad de la prosa ni la exactitud de cada diagrama.

## Anti-metas (sería un fracaso aunque funcione)

- Documentos largos que nadie lee. Si un documento no cabe en una lectura de 5 minutos, sobra contenido.
- Documentos que se pudren: dicen una cosa y el código hace otra sin que nada avise.
- Que el cliente vea jerga técnica, tarifas internas o la estructura de la base de datos.
- Diagramas decorativos que repiten lo que ya dice una tabla.

## Decisiones del usuario

- Varios documentos pequeños, no uno grande.
- Se escriben por etapas, y el motor vigila que sigan al día con el código (aprobado tal como se propuso abajo).
- Diagramas con el plugin diagram-design (`cathrynlavery/diagram-design`, ≥ 2.6.136), que pasa a ser dependencia requerida para estos documentos.
- Lectores: el usuario, Claude y el cliente, este último solo en los documentos que le conciernen; el tono se adapta a quien lee.
- Documentos que ve el cliente: `IMPLEMENTATION.md`, `PRD.md` y `FLOWS.md` (simplificado). Internos: `TRD.md` y `SCHEMA.md`.
- Diagramas del cliente: se reusan los internos seguros; no se generan nuevos.

## Los cinco documentos

Todos viven en `docs/plan/`. Las plantillas viven en `templates/plan/<doc>.md`, con comentarios `<!-- -->` que dicen qué va en cada sección (mismo patrón que `templates/client-brief/`). Una sección que no aplica al proyecto se borra; no se deja vacía ni con "N/A".

### `PRD.md` — qué y para quién

| Sección | Contenido |
|---|---|
| Resumen | Un párrafo, con las palabras del usuario (sale de `summary` del perfil) |
| Problema y usuarios | Quién lo usa, qué trabajo necesita hacer (Jobs-to-be-Done), personas o roles |
| Metas y métricas | Qué es éxito, medible (AARRR cuando aplica) |
| Alcance | Features con prioridad (debe / debería / podría) |
| Fuera de alcance | Explícito |
| Historias de usuario | "Como X quiero Y para Z", con criterios de aceptación verificables |
| Riesgos y supuestos | Lo que, si es falso, cambia el plan |

Diagramas: `journey` o `story-map` (obligatorio uno de los dos), `quadrant` de prioridad cuando hay más de 7 features, `service-blueprint` cuando hay operación humana detrás (reservas, marketplace, soporte).

### `TRD.md` — cómo se construye

| Sección | Contenido |
|---|---|
| Stack | Cada pieza con su porqué en una línea; enlaza el ADR |
| Arquitectura | Componentes y cómo se comunican |
| Integraciones | Servicios externos: qué hace cada uno, llaves y webhooks |
| Entornos y despliegue | Dev, preview, producción; variables por entorno |
| Requisitos no funcionales | Rendimiento, seguridad, accesibilidad, mercados (los 🔴 de BRIEF.md que pesan en el diseño) |
| Decisiones abiertas | Lo que aún no se decide y cuándo se decide |

Diagramas: `architecture` (obligatorio), `deployment`, `data-flow` cuando hay integraciones, `architecture-delta` cuando es un sistema existente que cambia.

### `FLOWS.md` — por dónde se mueve el usuario

| Sección | Contenido |
|---|---|
| Inventario de pantallas | Cada ruta de página, en código (`` `/dashboard` ``), con su propósito |
| Flujos | Uno por tarea principal: pasos, decisiones, estados (cargando, vacío, error, éxito) y salidas |
| Estados de entidades | Ciclos de vida (pedido, suscripción, reserva) |
| Roles y permisos | Qué ve y hace cada rol, por pantalla |

Diagramas: `flowchart` por flujo principal (obligatorio), `sequence` para auth y pagos, `state` por ciclo de vida, `swimlane` cuando intervienen varios roles, `heatmap` de roles × pantallas cuando hay más de un rol.

### `SCHEMA.md` — cómo se guardan los datos

| Sección | Contenido |
|---|---|
| Tablas | Una subsección por tabla con nombre en código (`` `orders` ``): columnas, tipos, nulos, defaults, índices, llaves foráneas |
| Relaciones | Cardinalidad y qué pasa al borrar (cascade, restrict, soft delete) |
| Autenticación | Proveedor, sesión, flujo de registro, verificación y recuperación |
| Seguridad por fila | Política RLS por tabla y operación |
| Retención | Qué se borra, cuándo (enlaza `data-retention` si aplica) |

Diagramas: `db-schema` (obligatorio), `sequence` del flujo de auth cuando hay `auth`, `heatmap` tablas × roles × operaciones para RLS.

### `IMPLEMENTATION.md` — en qué orden se construye

| Sección | Contenido |
|---|---|
| Fases | Una por sub-etapa de mep, con sus entregables y su criterio de "listo" |
| Hitos | Qué ve el cliente al final de cada fase |
| Dependencias | Qué bloquea a qué (cuentas, dominio, contenido del cliente, accesos) |
| Calendario | Semanas por fase (de `schedule.weeks_by_phase`, como el brief del cliente) |
| Riesgos | Lo que puede mover el calendario |

Diagramas: `gantt` (obligatorio), `timeline` de hitos para el cliente.

## Cuándo se escribe cada uno

| Documento | Lo escribe | Aplica cuando |
|---|---|---|
| `PRD.md`, `TRD.md`, `IMPLEMENTATION.md` | `/mep:scope`, después de `init` | siempre |
| `FLOWS.md` | al empezar `foundation.design` | siempre |
| `SCHEMA.md` | al empezar `build.data` | `signals.has_db` |

"Al empezar" significa: la skill `mep` indica a Claude que, si la sub-etapa activa es esa y el documento no existe, lo escriba antes de cualquier otra cosa de esa sub-etapa.

Los documentos se actualizan cuando cambia lo que describen. `/mep:add` (cambio de scope) revisa `PRD.md`, `TRD.md` e `IMPLEMENTATION.md`.

## Tono y audiencia

- **Versión interna** (`docs/plan/`): técnica y precisa, para el usuario y Claude. Todos los documentos la tienen.
- **Versión del cliente**: solo para `PRD.md`, `IMPLEMENTATION.md` y `FLOWS.md`, y solo si `context: client-project`. Con `own-product` no existe.
  - Se genera en `/mep:export`, no se mantiene a mano: Claude la reescribe desde la interna con las mismas reglas que el brief del cliente (lenguaje no técnico, idioma del cliente, sin tarifas ni márgenes).
  - `FLOWS.md` del cliente: solo flujos y pantallas, sin estados internos ni permisos técnicos.
  - Diagramas del cliente (decisión del usuario): se reusan solo los PNG internos seguros para el cliente, sin generar nuevos. Lista fija: `prd-journey`, `prd-story-map`, `prd-service-blueprint`, `implementation-gantt`, `implementation-timeline` y los `flows-flowchart` de flujos del usuario final. Nunca `state`, `swimlane`, `heatmap`, `sequence`, ni nada de `TRD.md` o `SCHEMA.md`. Así `/mep:export` no depende de diagram-design ni de Playwright.
  - Plantillas en `templates/client-plan/<doc>.<idioma>.md` (con `en` como respaldo que se traduce, igual que hoy).
  - Salida: `docs/client/<doc>-v<version>.md` → .docx y .pdf.

## Diagramas

- diagram-design genera HTML con SVG. Cada diagrama se guarda en `docs/plan/diagrams/<doc>-<tipo>[-<nombre>].html` y su exportación `.png` junto a él; el documento lo muestra con `![descripción](diagrams/<doc>-<tipo>[-<nombre>].png)` y enlaza el HTML. El `<tipo>` es el nombre del tipo en diagram-design (`journey`, `db-schema`, `gantt`…): es el contrato que lee el motor. Llamada mía.
- Los `.html` y `.png` se versionan en git: el CI y otras máquinas los necesitan para la verificación `diagrams`. Llamada mía.
- diagram-design exporta PNG con `scripts/export_png.py` (Python + Playwright + Chromium) y no instala Playwright solo. `/mep:scope` comprueba las dos cosas (plugin instalado y exportación a PNG funcionando) y, si falta algo, se detiene y da los comandos para instalarlo. Sin respaldo solo-SVG: dejaría los ítems en 🔴 y el export sin imágenes. Llamada mía.
- Estilo: antes de cerrar `foundation.design` los diagramas usan el perfil por defecto de diagram-design; después, los tokens del proyecto. Llamada mía: el usuario no lo decidió.
- `/mep:export` necesita mostrar imágenes: `engine/src/docs.ts` gana un bloque de imagen (`![alt](ruta.png)`) en .docx y .pdf, sin dependencias nuevas (es la regla del archivo).

## Verificación del motor

Cinco ítems nuevos en `catalog/items/plan.yaml`, 🔴, categoría `plan`:

| Ítem | Sub-etapa | `when` | Comprueba |
|---|---|---|---|
| `plan-prd` | `foundation.setup` | siempre | existe, tiene sus secciones obligatorias y cada `custom_work` del perfil aparece |
| `plan-trd` | `foundation.setup` | siempre | existe, tiene sus secciones y menciona cada decisión de `stack` |
| `plan-implementation` | `foundation.setup` | siempre | existe y tiene una fase por sub-etapa de mep |
| `plan-flows` | `foundation.design` | siempre | existe, y cada ruta de página del código aparece en el inventario de pantallas |
| `plan-schema` | `build.data` | `has_db` | existe, y las tablas de las migraciones y las del documento son las mismas |

Además, cada ítem comprueba sus diagramas obligatorios por nombre de archivo. Solo se verifican los que el motor puede decidir con el perfil: `prd-journey` o `prd-story-map`, `trd-architecture`, `flows-flowchart`, `schema-db-schema`, `implementation-gantt`, y `flows-sequence` cuando hay `auth` o `payments`. Los condicionales que dependen de la prosa (`quadrant` con más de 7 features, `heatmap` con más de un rol, `service-blueprint`) son guía: los revisa la revisión de cierre de la sub-etapa, no el motor. Llamada mía.

Nuevo tipo de verificación `{ type: plan, doc, rule }` en `engine/src/plan.ts`:

- `sections`: los encabezados `##` obligatorios de la plantilla están.
- `custom_work`, `stack`: cada título o decisión del perfil aparece en el texto.
- `phases`: cada sub-etapa con al menos un ítem activo para el perfil aparece como encabezado (`build.data` sin `has_db` no se exige). Llamada mía.
- `routes`: cada ruta que da `routes()` de `framework.ts` aparece en código en `FLOWS.md`.
- `tables`: el conjunto de tablas de `scan()` de `sql.ts` (hoy no exportada: se exporta) es igual al de los nombres en código bajo `## Tablas` de `SCHEMA.md`; el detalle lista lo que sobra y lo que falta.
- `diagrams`: cada imagen enlazada existe.

Cuando el código cambia y el documento no (una migración nueva, una ruta nueva), el ítem vuelve a 🔴 pendiente: así el documento no se pudre. Como son ítems de sub-etapas cerradas, la regresión bloquea igual que cualquier otra.

Proyectos existentes: los ítems nuevos llegan por `/mep:update` con el periodo de gracia normal, y la skill `update` escribe los documentos que falten para las sub-etapas ya abiertas o cerradas, desde lo que ya existe en el repo (perfil, código, migraciones). Llamada mía.

## Cambios por archivo

- `templates/plan/{PRD,TRD,FLOWS,SCHEMA,IMPLEMENTATION}.md` y `templates/client-plan/{PRD,FLOWS,IMPLEMENTATION}.{es,en}.md`: nuevos.
- `catalog/items/plan.yaml`: nuevo; `catalog/VERSION` 2026.10.9 y su CHANGELOG.
- `engine/src/plan.ts`: nuevo; `types.ts` (tipo `plan`), `verify.ts` (despacho), `render.ts` (texto del check).
- `engine/src/docs.ts`: bloque de imagen en .docx y .pdf.
- `skills/scope/SKILL.md`: escribir PRD, TRD e IMPLEMENTATION después de `init`; comprobar diagram-design.
- `skills/mep/SKILL.md`: escribir FLOWS y SCHEMA al empezar su sub-etapa; leer el documento relevante antes de trabajar (SCHEMA antes de tocar la base de datos, FLOWS antes de una pantalla).
- `skills/update/SKILL.md`: escribir los documentos que falten en proyectos existentes.
- `skills/add/SKILL.md`: revisar los documentos afectados por el cambio de scope.
- `skills/export/SKILL.md`: generar las versiones del cliente.
- `tests/`: `plan.spec.ts` (cada regla, con repos de prueba) y el e2e de `examples/estudio-saas` con sus cinco documentos.
- README (en y es), CHANGELOG, versión 0.3.0.

## Lo que queda al builder

- Redacción exacta de las plantillas, dentro de las secciones de arriba.
- Cómo se nombran los diagramas dentro de `<doc>-<nombre>`.
- Cómo se incrusta el PNG en .docx y .pdf (PNG con canal alfa incluido).
- Si `routes` ignora rutas técnicas (`/api`, `sitemap.xml`, etc.): sí deben ignorarse, igual que `renderCodemap`.
