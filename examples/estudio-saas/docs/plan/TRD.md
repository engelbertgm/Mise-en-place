# TRD — Estudio

## Stack
<!-- mep:stack -->
Next.js con Supabase (base de datos y auth), Stripe para cobros y Resend para emails. Ver `docs/decisions/`.

## Arquitectura
<!-- mep:arquitectura -->
![Arquitectura](diagrams/trd-architecture.png)

## Entornos y despliegue
<!-- mep:entornos -->
Dev local, preview por PR y producción; llaves de prueba de Stripe en preview.

## Requisitos no funcionales
<!-- mep:no-funcionales -->
RLS en todas las tablas (`rls-all-tables`), checkout alojado (`hosted-checkout`), privacidad por mercado.
