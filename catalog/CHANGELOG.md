# Catálogo — cambios

Cada ítem registra `since` con la versión en que entró. `/mep:update` usa este archivo y `VERSION`.

## 2026.10.1

Catálogo inicial (fases 1–5 de la construcción):

- **Base** (19 ítems): meta tags, Open Graph, canonical, favicon, robots, sitemap, 404/500, noindex en previews, `.env.example`, `.gitignore`, README, theme-color, manifest, og:locale.
- **SEO** (16): URLs propias, SSR, jerarquía de headings (un h1, h2/h3/body correctos), sitemap solo indexable, noindex en zonas privadas, robots sin bloquear assets, URLs limpias, 301, enlaces rastreables, og:image (por defecto, especificaciones, generada), JSON-LD, breadcrumbs, Search Console, hreflang.
- **Seguridad** (53): secretos (locked), base (headers, HSTS, lockfile, dependencias, errores), ciberseguridad (OWASP, inyección, XSS, redirecciones, SSRF, logs), y capas por formularios, auth, base de datos (RLS locked), pagos, uploads, admin y API pública.

Pendiente: capacidades restantes, accesibilidad, sistema de diseño, estados/UX, contenido, legal y mercados.
