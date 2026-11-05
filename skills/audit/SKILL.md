---
name: audit
description: Apply mep to a repo that already exists — start from the project's scope (what it should be), compare it with what the code shows and produce a gap report with only the rules that scope activates, without modifying code or blocking anything.
argument-hint: "[scope description, optional]"
allowed-tools: Bash(node *), Read, Write, AskUserQuestion, Skill
---

# /mep:audit

Given scope: $ARGUMENTS

Engine: `node "${CLAUDE_PLUGIN_ROOT}/engine/dist/mep.mjs"`. Do not modify the project's code in this command.

mep's rules are activated by the project's **scope** (type, capabilities, markets, audience, context, signals), not by what is in the code. The code is evidence; the scope decides what applies.

1. If `.mep/profile.yaml` already exists, the repo already uses mep: suggest `/mep:check` and stop.
2. **Scope first.** If it did not come in the arguments, ask the user to describe in their own words what the project is, for whom, in which markets and what it must do (or read it from README, BRIEF or docs if they exist, and confirm it with the user). Without a scope do not continue: the audit is not guessed from the code.
3. Run `audit`: what the code shows, with evidence for each guess. It is contrast, not truth.
4. Build the profile from the scope (`mep` skill), using the code only as evidence. Where they differ, ask (AskUserQuestion, at most 4):
   - something in the code the scope does not mention (e.g. a `stripe` dependency charging nothing): is it part of the scope or surplus?
   - something in the scope the code does not have yet: it goes in the profile anyway; it is pending work, not a mistake.
   Also ask what the code cannot say and changes a 🔴: markets, audience (sensitive data), context (client or own). If the project is for minors or verifies age, mep does not cover it: say so and stop. Write the confirmed profile to `.mep/draft.yaml`, with `summary`: a paragraph in the user's words about what the project is.
5. Run `audit --from .mep/draft.yaml`. Show it as is: how many rules apply for the scope and how many do not, the differences scope vs code, and the gap by sub-phase and level. If the user asks about a rule that does or does not appear, `explain <id> --from .mep/draft.yaml` says why.
6. If Ponytail is installed, run `/ponytail-audit` and add its ranking of what to fix first at the end of the report.
7. Nothing blocks until the brief is adopted. If the user adopts it: `init --from .mep/draft.yaml --close-passing` (it closes, in order, the sub-phases that already meet their 🔴) and delete `.mep/draft.yaml`. If not, delete `.mep/draft.yaml` and leave no trace.
