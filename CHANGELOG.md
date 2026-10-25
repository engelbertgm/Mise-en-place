# Changelog

The catalog has its own changelog in [catalog/CHANGELOG.md](catalog/CHANGELOG.md).

## 0.1.3

- Catalog 2026.10.6: things to avoid are now checked — empty view-source / Vite + React SPA without SSR, missing structured data, no llms.txt, robots.txt blocking AI crawlers, public source maps, console errors, oversized JS bundles.
- New engine checks: `build` (server_rendered, max_js_chunk, no_source_maps), `robots` (allows_ai) and the `has_text` HTML rule.
- Fix: JS files over 1 MB were measured as empty.

## 0.1.2

- Catalog 2026.10.5: 11 new launch rules (marketing consent, data subject requests, DPAs, third-party disclosure, breach procedure, intellectual property, open source licenses, CTA above the fold, sticky mobile CTA, thank-you page, analytics installed).
- The responsive test checks the primary CTA is above the fold.

## 0.1.1

- `/mep:audit`, `/mep:update`, `/mep:quote`, `/mep:export`, `/mep:log-time`.
- `CODEMAP.md` and `REGISTRY.md` generators, with `registry --check`.
- Full catalog (2026.10.4, 330 items): accessibility, design system, UX, content, legal, markets and more.
- Markets bring their languages; quality thresholds in the profile; automatic design checks; responsive Playwright test; estimated schedule; review before a PR into `main`.
- No database by default; new `payment-links` capability for payments on the provider's page.
- Test project (`examples/estudio-saas`) with an end-to-end test.

## 0.1.0

- Engine, verification, brief, base commands, mods, hooks and CI check.
