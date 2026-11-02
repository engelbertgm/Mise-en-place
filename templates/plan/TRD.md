<!-- Plantilla del TRD de mep. Claude la llena en /mep:scope. Los títulos pueden traducirse; los comentarios marcadores (mep:clave) no se tocan.
Reglas: lectura de 5 minutos como máximo. Una sección marcada (opcional) que no aplica se borra completa; las demás nunca se borran ni se dejan vacías. Diagramas en docs/plan/diagrams/trd-<tipo>[-<nombre>].{html,png}, generados con diagram-design. -->
# TRD — {project}

## Stack
<!-- mep:stack -->
<!-- Cada pieza con su porqué en una línea y el enlace a su ADR en docs/decisions/. Menciona cada decisión de stack.decided del perfil con su nombre exacto. -->

## Arquitectura
<!-- mep:arquitectura -->
<!-- Componentes y cómo se comunican. Diagrama obligatorio: architecture. Si es un sistema existente que cambia: architecture-delta. -->

## Integraciones (opcional)
<!-- mep:integraciones -->
<!-- Cada servicio externo: qué hace, qué llaves usa (nombre de la variable, nunca el valor) y qué webhooks recibe. Con integraciones: diagrama data-flow. -->

## Entornos y despliegue
<!-- mep:entornos -->
<!-- Dev, preview y producción: dónde corre cada uno y qué variables cambian. Diagrama: deployment. -->

## Requisitos no funcionales
<!-- mep:no-funcionales -->
<!-- Rendimiento, seguridad, accesibilidad y mercados: los 🔴 de BRIEF.md que cambian el diseño, con su id. -->

## Decisiones abiertas (opcional)
<!-- mep:decisiones-abiertas -->
<!-- Lo que aún no se decide, quién lo decide y antes de qué sub-etapa. -->
