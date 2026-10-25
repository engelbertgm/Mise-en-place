// Pure module: imported by the engine and by the gate mod (no Node APIs here).
// Keeps mep's state and human-only actions out of the agent's reach through the obvious paths.
// The seal (seal.ts) is the safety net for what these heuristics miss.

/** mep's state: changed only through the CLI. Generated files (BRIEF.md, .cache) are not state. */
const STATE_PATH = /(?:^|[\\/])\.mep[\\/](?:profile\.yaml|log|security[\\/]|reviews[\\/])/

/** A command that mentions .mep (the folder or a file in it). */
const MENTIONS_MEP = /(?:^|[\s"'=\\/(])\.mep(?:$|[\s"'\\/)])/

/** Operations that write or delete. */
const WRITES = /\b(?:tee|cp|mv|rm|truncate|sed\s+-i|perl\s+-[a-z]*[ip]|git\s+(?:checkout|restore|rm)|node\s+-e|python3?\s+-c|Out-File|Set-Content|Add-Content|Remove-Item|Move-Item|Copy-Item)\b/

/** `>` counts only when it redirects into .mep (2>/dev/null is fine). */
const REDIRECT_INTO_MEP = /(?:^|[^<])>{1,2}\s*["']?[^\s"']*\.mep[\\/]/

/** mep.mjs, the npm package, or a bare `mep` in command position (not inside a commit message). */
const ENGINE = String.raw`(?:mep\.mjs["']?|@engelbertgm\/mep\S*|(?:^|[;&|]\s*|\b(?:npx|bunx|pnpm(?:\s+dlx|\s+exec)?|yarn)\s+)mep)\s+`

/** Calls to mep's engine: the CLI is the only writer of state. */
const ENGINE_CALL = new RegExp(ENGINE)

/** Actions only the person takes: confirming a manual item, turning off a 🔴, re-sealing, relaxing a threshold. */
const HUMAN_ACTION = new RegExp(`${ENGINE}(?:confirm|override|resync)\\b|${ENGINE}threshold\\b[^|;&]*--yes\\b`)

const STATE_HINT = 'mep: el estado de mep (.mep/profile.yaml, log, security/, reviews/) solo cambia con la CLI de mep. Usa /mep:add, /mep:skip, /mep:phase o mep review/security record.'

/** Edit, Write, MultiEdit or NotebookEdit on a state file. */
export function guardFile(path: string): string | undefined {
  return STATE_PATH.test(path) ? STATE_HINT : undefined
}

/** A Bash command the agent may not run. Undefined when it may. */
export function guardCommand(command: string): string | undefined {
  if (/\bMEP_BYPASS\b/.test(command)) return 'mep: MEP_BYPASS es una decisión tuya, no del agente: ponla en tu entorno al abrir la sesión.'
  if (ENGINE_CALL.test(command) && /\s--human\b/.test(command)) return 'mep: el canal humano lo usa solo el usuario (/mep:confirm, /mep:override, /mep:threshold, /mep:resync).'
  if (HUMAN_ACTION.test(command)) return 'mep: esta acción es tuya. Escríbela tú: /mep:confirm <id>, /mep:override <id> <razón>, /mep:threshold <clave> <valor> <razón> o /mep:resync.'
  if (REDIRECT_INTO_MEP.test(command)) return STATE_HINT
  // A lone engine call is the legitimate writer.
  if (ENGINE_CALL.test(command) && !/[;&|]/.test(command)) return undefined
  // ponytail: text heuristic; a script in a separate file gets past it. The seal catches that in `mep verify`.
  return MENTIONS_MEP.test(command) && WRITES.test(command) ? STATE_HINT : undefined
}
