# Security Policy

## Supported versions

Only the latest release on `main` receives fixes.

## Reporting a vulnerability

Do not open a public issue. Report privately through GitHub: go to this repository's **Security** tab and choose **Report a vulnerability**.

Include what you found, how to reproduce it and the impact. You will get an acknowledgement within 7 days, and we will coordinate a fix and disclosure with you.

## Scope

mep runs code on your machine and in CI: the engine (`engine/dist/mep.mjs`), the mods (`mods/register.ts`) and the hooks. Relevant reports include:

- A way to bypass a block: deploying to production or ending a turn with pending 🔴 items without `MEP_BYPASS`, or bypassing a 🔒 locked item at all.
- The engine running unexpected commands, or `command` checks running from anywhere but the project's own catalog.
- Anything that exposes secrets: in reports, logs, `BRIEF.md` or `.mep/`.
- A security item marked as done without a current `mep-security` report.
- Catalog checks that pass on clearly insecure code (false negatives on secrets, RLS, card data).

Out of scope: issues in Claude Code itself or in the models (report those to Anthropic), and in third-party tools or plugins such as ponytail or gitleaks (report to their maintainers).

Note: mep is a guided checklist, not a security guarantee. The CI check is the real barrier only when it is a required status check on `main`.
