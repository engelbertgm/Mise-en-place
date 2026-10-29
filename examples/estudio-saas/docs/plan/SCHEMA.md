# Esquema de datos — Estudio

## Tablas
<!-- mep:tablas -->
![Esquema](diagrams/schema-db-schema.png)

### `classes`
| Columna | Tipo | Nulo |
| --- | --- | --- |
| id | uuid | no |

## Relaciones
<!-- mep:relaciones -->
Por ahora una sola tabla.

## Seguridad por fila
<!-- mep:rls -->
`classes`: lectura pública, escritura solo del estudio.
