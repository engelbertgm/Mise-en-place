<!-- Plantilla de flujos de mep. Claude la llena al empezar foundation.design. Los títulos pueden traducirse; los comentarios marcadores (mep:clave) no se tocan.
Reglas: lectura de 5 minutos como máximo. Una sección marcada (opcional) que no aplica se borra completa; las demás nunca se borran ni se dejan vacías. Diagramas en docs/plan/diagrams/flows-<tipo>[-<nombre>].{html,png}, generados con diagram-design. -->
# Flujos — {project}

## Inventario de pantallas
<!-- mep:pantallas -->
<!-- Una línea por ruta de página, escrita en código tal como la da el framework: - `/precios`: para qué sirve. El motor compara esta lista con las rutas del código. -->

## Flujos
<!-- mep:flujos -->
<!-- Uno por tarea principal: pasos, decisiones, estados (cargando, vacío, error, éxito) y salidas. Diagrama obligatorio: flowchart por flujo principal. Con auth o pagos: sequence de cada uno. Con varios roles en un mismo flujo: swimlane. -->

## Estados de entidades (opcional)
<!-- mep:estados -->
<!-- Ciclo de vida de pedidos, suscripciones, reservas: estados y qué los cambia. Diagrama: state por entidad. -->

## Roles y permisos (opcional)
<!-- mep:roles -->
<!-- Qué ve y qué hace cada rol en cada pantalla. Con más de un rol: heatmap roles × pantallas. -->
