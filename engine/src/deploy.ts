// Pure module: imported by the engine and by the gate mod (no Node APIs here).

export type DeployKind = 'prod' | 'preview'

const PROD: RegExp[] = [
  /\bvercel\b(?=[^|;&]*\s--prod\b)/,
  /\bvercel\s+(?:deploy\s+)?--prod\b/,
  /\bvercel\s+promote\b/,
  /\bnetlify\s+deploy\b(?=[^|;&]*\s--prod\b)/,
  /\bgit\s+push\b[^|;&]*\s(?:\S+\s+)?(?:HEAD:)?(?:refs\/heads\/)?(?:main|master)\b/,
]

const PREVIEW: RegExp[] = [/\bvercel(?:\s+deploy)?(?:\s|$)/, /\bnetlify\s+deploy\b/]

/** `git push` with no refspec pushes the current branch: the caller passes it. */
export function deployKind(command: string, currentBranch?: string): DeployKind | undefined {
  const cmd = command.trim()
  if (PROD.some(re => re.test(cmd))) return 'prod'
  if (currentBranch && /^(main|master)$/.test(currentBranch) && /\bgit\s+push\b(?![^|;&]*\s(?:-d|--delete)\b)/.test(cmd)) {
    const args = cmd.replace(/^.*?\bgit\s+push\b/, '').split(/[|;&]/)[0].trim().split(/\s+/).filter(a => a && !a.startsWith('-'))
    if (args.length <= 1) return 'prod'
  }
  if (/\bvercel\s+(env|link|login|logout|pull|whoami|ls|list|logs|inspect|domains|dns|secrets|project|teams|--version|-v|help)\b/.test(cmd)) return undefined
  if (PREVIEW.some(re => re.test(cmd))) return 'preview'
  return undefined
}

/** True for a command that may be a deploy, so a hook only spends time on those. */
export function mayDeploy(command: string): boolean {
  return /\b(vercel|netlify|git\s+push)\b/.test(command)
}
