# Catálogo — cambios

Cada ítem registra `since` con la versión en que entró. `/mep:update` usa este archivo y `VERSION`.

## 2026.10.5

Reglas nuevas para lanzar (11):

- **Privacidad y legal**: `marketing-consent` (consentimiento de marketing separado y registrado), `data-subject-requests` (acceso, corrección y borrado con plazos por mercado), `data-processing-agreements` (DPA con cada proveedor; 🔴 en EU, UK, BR y CA:QC), `third-party-disclosure` (terceros en la política), `breach-response-plan` (procedimiento ante brechas), `intellectual-property` (© y cesión al cliente), `open-source-licenses` (licencias de dependencias y atribución).
- **Conversión**: `cta-above-fold` (CTA principal visible sin scroll, verificado por el test responsive), `sticky-mobile-cta` (🔴 en landing, 🟡 en sitios comerciales), `form-thank-you` (página o estado de gracias).
- **Analítica**: `analytics-installed` (instalada y midiendo en producción).
- El test responsive comprueba que `[data-cta="primary"]` está sobre el pliegue en los cinco anchos.

## 2026.10.4

- **Base de datos solo cuando hay algo que guardar.** `payments`, `uploads` y `realtime` ya no implican `has_db`; la implican `auth`, `subscriptions`, `ugc` y `admin-panel`, o el perfil explícitamente. La regla de stack recomienda `db: none` a una landing aunque venda.
- **Nueva capacidad `payment-links`**: el pago ocurre en la página del proveedor (Stripe Payment Links, botón de compra, Mercado Pago, Gumroad…). Activa los ítems de consumo y legales (términos, reembolsos, LFPC, desistimiento, IVA, CFDI…) y el nuevo `payment-links-setup`, pero no los de checkout integrado (webhooks, idempotencia, precios en servidor) ni base de datos.
- `/mep:audit`: `payments` solo si el servidor crea pagos o recibe webhooks; un enlace de compra se detecta como `payment-links`. Tener la dependencia `stripe` ya no basta.
- Preset `ecommerce`: `has_db` explícito (guarda pedidos y productos).

## 2026.10.3

- Los mercados activan sus idiomas (`market_languages` en dimensions.yaml); más de un idioma activa i18n sin indicarlo a mano.
- `strict-lint`: los umbrales (complejidad, largo de archivo y de función) se leen del perfil y se comparan con la config del linter. Relajarlos: `mep threshold … --yes` con razón.
- `font-families`, `text-hierarchy` e `interactive-states`: verificación automática de familias tipográficas, pesos de texto, colores de paleta sueltos y enlaces o botones sin hover.
- `responsive-screenshots`: `/mep:scope` instala `tests/responsive.spec.ts` (Playwright, 360–2560 px) y el script `test:responsive`.
- Señal `has_long_forms` detectada en el código (editores o formularios con 8+ campos).

## 2026.10.2

Catálogo completo de la spec (329 ítems). Los proyectos en 2026.10.1 los reciben con `/mep:update`.

- **Accesibilidad** (WCAG 2.2 AA): contraste, teclado, foco, skip link, alt, labels, errores, landmarks, movimiento reducido, zoom, declaración (🔴 en EU), axe en CI.
- **Sistema de diseño**: tokens, tema claro/oscuro, jerarquía de texto, shadcn desde tokens, /design-system, cero colores y estilos sueltos, escala de espaciado, 2 familias, estados interactivos.
- **UX**: 4 estados por vista, skeletons, progreso, feedback inmediato, UI optimista, toasts, dropzone, validación en línea, motion, leyes de UX y principios de UI.
- **Contenido, formularios, datos y tablas, búsqueda, responsive, navegación**.
- **Comportamiento**: acciones destructivas por severidad, trabajo sin guardar, zonas horarias.
- **Capacidades**: auth, pagos, contenido de usuarios, email, newsletter, notificaciones, realtime, PWA, offline, suscripciones, IA, video y audio, CMS, migración.
- **Por tipo**: reservas y SEO local.
- **Privacidad y legal**: cookies y consentimiento (EU, UK, BR, CA:QC; GPC en USA), retención, términos versionados, embeds, privacidad, términos, reembolsos, contacto, licencias.
- **Performance, i18n, calidad de código, despliegue, ADR, Git, analytics, costos y entrega al cliente**.
- **Mercados**: MX, USA, CA, EU, UK, BR e IN, con idioma, moneda y legales con fuente oficial.

Motor: verificaciones HTML nuevas (`landmarks`, `input_labels`, `iframe_title`, `skip_link`) y `maps` (REGISTRY.md y CODEMAP.md).

## 2026.10.1

Catálogo inicial (fases 1–5 de la construcción):

- **Base** (19 ítems): meta tags, Open Graph, canonical, favicon, robots, sitemap, 404/500, noindex en previews, `.env.example`, `.gitignore`, README, theme-color, manifest, og:locale.
- **SEO** (16): URLs propias, SSR, jerarquía de headings (un h1, h2/h3/body correctos), sitemap solo indexable, noindex en zonas privadas, robots sin bloquear assets, URLs limpias, 301, enlaces rastreables, og:image (por defecto, especificaciones, generada), JSON-LD, breadcrumbs, Search Console, hreflang.
- **Seguridad** (53): secretos (locked), base (headers, HSTS, lockfile, dependencias, errores), ciberseguridad (OWASP, inyección, XSS, redirecciones, SSRF, logs), y capas por formularios, auth, base de datos (RLS locked), pagos, uploads, admin y API pública.

Pendiente: capacidades restantes, accesibilidad, sistema de diseño, estados/UX, contenido, legal y mercados.
