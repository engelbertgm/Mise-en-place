// Pure module: imported by the engine and by the gate mod (no Node APIs here).

export type DeployKind = 'prod' | 'preview'

const PROD: RegExp[] = [
  /\bvercel\b(?=[^|;&]*\s--prod\b)/,
  /\bvercel\s+(?:deploy\s+)?--prod\b/,
  /\bvercel\s+promote\b/,
  /\bnetlify\s+deploy\b(?=[^|;&]*\s--prod\b)/,
  /\bgit\s+push\b[^|;&]*\s(?:\S+\s+)?(?:HEAD:)?(?:refs\/heads\/)?(?:main|master)\b/,
  // Cloudflare: a Worker deploy, or Pages without a branch or on main.
  /\bwrangler\s+deploy\b/,
  /\bwrangler\s+pages\s+deploy\b(?![^|;&]*--branch[\s=]+(?!(?:main|master)\b))/,
  /\b(?:fly|flyctl)\s+deploy\b/,
  /\brailway\s+(?:up|redeploy)\b/,
  /\bfirebase\s+deploy\b/,
  /\bsupabase\s+(?:db\s+push|functions\s+deploy)\b/,
]

const PREVIEW: RegExp[] = [
  /\bvercel(?:\s+deploy)?(?:\s|$)/,
  /\bnetlify\s+deploy\b/,
  /\bwrangler\s+(?:pages\s+deploy|versions\s+upload)\b/,
  /\bfirebase\s+hosting:channel:deploy\b/,
]

/** `git push` with no refspec pushes the current branch: the caller passes it. */
export function deployKind(command: string, currentBranch?: string): DeployKind | undefined {
  const cmd = command.trim()
  // A preview channel is checked first: `firebase hosting:channel:deploy` is not `firebase deploy`.
  if (/\bfirebase\s+hosting:channel:deploy\b/.test(cmd)) return 'preview'
  if (PROD.some(re => re.test(cmd))) return 'prod'
  if (currentBranch && /^(main|master)$/.test(currentBranch) && /\bgit\s+push\b(?![^|;&]*\s(?:-d|--delete)\b)/.test(cmd)) {
    const args = cmd.replace(/^.*?\bgit\s+push\b/, '').split(/[|;&]/)[0].trim().split(/\s+/).filter(a => a && !a.startsWith('-'))
    if (args.length <= 1) return 'prod'
  }
  if (/\bvercel\s+(env|link|login|logout|pull|whoami|ls|list|logs|inspect|domains|dns|secrets|project|teams|--version|-v|help)\b/.test(cmd)) return undefined
  if (PREVIEW.some(re => re.test(cmd))) return 'preview'
  return undefined
}

/** True for a command that may be a deploy or a PR, so a hook only spends time on those. */
export function mayDeploy(command: string): boolean {
  return /\b(vercel|netlify|git\s+push|gh\s+pr|wrangler|fly|flyctl|railway|firebase|supabase)\b/.test(command)
}

/** `gh pr create` into main (the default base) or `gh pr merge`: the moment for the pre-merge review. */
export function prToMain(command: string): boolean {
  if (/\bgh\s+pr\s+merge\b/.test(command)) return true
  if (!/\bgh\s+pr\s+create\b/.test(command)) return false
  const base = command.match(/(?:--base|-B)[\s=]+["']?([\w./-]+)/)?.[1]
  return base === undefined || /^(main|master)$/.test(base)
}
