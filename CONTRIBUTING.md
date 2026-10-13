# Contributing

Thanks for helping improve mise en place.

## Before you start

- Open an issue for anything beyond a small fix, so we can agree on the approach first.
- Keep changes minimal. mep follows its own mantra: clear, simple, reused. Nothing "just in case".
- Catalog levels (🔴/🟡/⚪), `locked` items and blocking rules are design decisions. Propose changes in an issue with the reason and, for legal or security items, an official source.

## Adding or changing a catalog item

1. Edit the right file in `catalog/items/` (or `catalog/markets/` for a market).
2. Every item needs `id`, `title`, `category`, `level`, `phase`, `since`, `effort`, `why`, `how` and at least one `verify`. Conditions (`when`) only use values from `catalog/dimensions.yaml`; the engine rejects anything else.
3. Prefer an automatic check (`file_exists`, `route_exists`, `grep`, `json_key`, `command`, `html`, `sql`) over `manual`.
4. Set `since` to the next catalog version, bump `catalog/VERSION` and add a line to `catalog/CHANGELOG.md`.
5. Adding a market must not require engine changes: only catalog files.

## Making a change

1. Fork the repo and create a branch.
2. Run the checks:
   ```
   pnpm install
   pnpm test
   pnpm typecheck
   claude plugin test .
   claude plugin validate .
   ```
3. If you changed `engine/src`, commit the rebuilt `engine/dist/mep.mjs` (CI checks they match).
4. Test the flow locally with `claude --plugin-dir <path-to-your-fork>`: `/mep:scope` in an empty folder, then `/mep:check`.
5. Open a pull request describing what changed and how you tested it.

## Style

- Engine and mods: TypeScript, small pure functions, names that explain; comments only for the why.
- The engine decides; skills, mods and hooks only call it. One source of truth.
- Skills, agents and catalog text are written in Spanish, short and imperative. README.md and these files are in English; README.es.md is the Spanish README. Keep both READMEs in sync.

## License of contributions

mep is under the [Business Source License 1.1](LICENSE) and is also offered under commercial licenses. By contributing, you:

- confirm the contribution is your own work and you have the right to submit it;
- license it under the same terms as the project ([BSL 1.1](LICENSE));
- grant the Licensor a perpetual, worldwide, royalty-free right to use, modify and relicense your contribution, including under commercial licenses.

You also agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
