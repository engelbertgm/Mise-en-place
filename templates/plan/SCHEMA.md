<!-- Plantilla del esquema de datos de mep. Claude la llena al empezar build.data, antes de escribir migraciones. Los títulos pueden traducirse; los comentarios marcadores (mep:clave) no se tocan.
Reglas: lectura de 5 minutos como máximo. Una sección marcada (opcional) que no aplica se borra completa; las demás nunca se borran ni se dejan vacías. Diagramas en docs/plan/diagrams/schema-<tipo>[-<nombre>].{html,png}, generados con diagram-design. -->
# Esquema de datos — {project}

## Tablas
<!-- mep:tablas -->
<!-- Una subsección por tabla con el nombre en código: ### `orders`. Debajo, una tabla con columna, tipo, nulo, default, índice y llave foránea. El motor compara estos nombres con las tablas de las migraciones. Diagrama obligatorio: db-schema. -->

## Relaciones
<!-- mep:relaciones -->
<!-- Cardinalidad de cada relación y qué pasa al borrar: cascade, restrict o soft delete. -->

## Autenticación (opcional)
<!-- mep:autenticacion -->
<!-- Proveedor, sesión, registro, verificación de email y recuperación de contraseña. Con auth: diagrama sequence del flujo. -->

## Seguridad por fila
<!-- mep:rls -->
<!-- Política RLS por tabla y operación (select, insert, update, delete): quién puede y por qué. Con más de un rol: heatmap tablas × roles × operaciones. -->

## Retención (opcional)
<!-- mep:retencion -->
<!-- Qué datos se borran y cuándo; enlaza el ítem data-retention si aplica. -->
