---
name: phase
description: Show the active mep sub-phase and what is missing to close it, or close it (close) if its 🔴 are met.
argument-hint: "[close <sub-phase>]"
allowed-tools: Bash(node *), Agent, Skill
---

# /mep:phase

Arguments: $ARGUMENTS

Engine: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`.

**No arguments:** run `phase` and show the output.

**`close <sub-phase>`:** closing is optional and never needed to push progress: it protects what was done against regressions and happens when the user wants it. A 🔴 that can wait is deferred with `/mep:defer` (the user types it) and does not count to close. This is when we check that we comply.
1. Regenerate the maps (`codemap` and `registry`) and run `check` to see the full state of the sub-phase. If `registry` reports pieces without a "What for", write it in each one's `/** */` comment.
2. If the sub-phase is `foundation.setup`, `build.data`, `build.features` or `launch.ops`, launch the `mep-security` agent to audit that sub-phase's security items (it records reports with `security record`).
3. Quality review (the engine requires it to close). Run `review` to know whether Ponytail is installed.
   - With Ponytail: run `/ponytail-review` and record the result: `review record --tool ponytail --must-fix <n> --notes "..."`.
   - Without Ponytail: review duplicates, names, complexity and reuse against REGISTRY.md and record: `review record --tool mep --must-fix <n>`.
   - In `foundation.design`, `build.ux` and `launch.content`, also review each key view against the section of `${CLAUDE_PLUGIN_ROOT}/catalog/guidelines.md` for that sub-phase (the one the mep skill points to); each violation counts as a "must fix".
   - If there are "must fix", fix them and review and record again with `--must-fix 0`. Record the review last: if the code changes afterwards, it expires.
4. Run `phase close <sub-phase>`. If it fails, show what is pending and do not insist: fix it or ask.
5. When it closes, that sub-phase's 🔴 are protected against regressions. Before `launch.*`, if Ponytail is installed, run `/ponytail-debt`.
