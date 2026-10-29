<!-- Plantilla del PRD de mep. Claude la llena en /mep:scope, en el idioma del usuario. Los títulos pueden traducirse; los comentarios marcadores (mep:clave) no se tocan: el motor los usa para encontrar cada sección.
Reglas: lectura de 5 minutos como máximo. Una sección marcada (opcional) que no aplica se borra completa; las demás nunca se borran ni se dejan vacías. Cada diagrama se genera con diagram-design, se exporta a PNG junto a su HTML en docs/plan/diagrams/prd-<tipo>[-<nombre>].{html,png} y se muestra con ![descripción](diagrams/prd-<tipo>.png). -->
# PRD — {project}

## Resumen
<!-- mep:resumen -->
<!-- Un párrafo con las palabras del usuario: qué es, para quién y qué debe lograr (sale de summary del perfil). -->

## Problema y usuarios
<!-- mep:usuarios -->
<!-- Quién lo usa (personas o roles) y qué trabajo necesita hacer (Jobs-to-be-Done). Diagrama obligatorio: journey o story-map. Con operación humana detrás (reservas, marketplace, soporte): también service-blueprint. -->

## Metas y métricas
<!-- mep:metas -->
<!-- Qué es éxito, medible: número, plazo, cómo se mide (AARRR cuando aplica). -->

## Alcance
<!-- mep:alcance -->
<!-- Features con prioridad: debe / debería / podría. Incluye cada custom_work del perfil con su título exacto. Con más de 7 features: diagrama quadrant de prioridad. -->

## Fuera de alcance
<!-- mep:fuera-de-alcance -->
<!-- Explícito: lo que alguien podría suponer y no se hace. -->

## Historias de usuario
<!-- mep:historias -->
<!-- "Como <rol> quiero <acción> para <beneficio>", cada una con criterios de aceptación que se pueden comprobar. -->

## Riesgos y supuestos (opcional)
<!-- mep:riesgos -->
<!-- Lo que, si resulta falso, cambia el plan. -->
