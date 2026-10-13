# Estudio

App de reservas para estudios de danza (proyecto de prueba de mep).

## Instalación

```
pnpm install
cp .env.example .env.local
pnpm dev
```

## Estructura

- `app/`: rutas (App Router).
- `components/ui/`: sistema de diseño (shadcn).
- `lib/`: clientes y lógica compartida.
- `supabase/migrations/`: migraciones SQL, siempre con RLS.
