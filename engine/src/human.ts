import { execSync } from 'node:child_process'
import { readSync } from 'node:fs'
import { userInfo } from 'node:os'

/** Who acts: git's user (name <email>), never a name typed as an argument. */
export function gitUser(root: string): string {
  const get = (key: string) => {
    try {
      return execSync(`git config ${key}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      return ''
    }
  }
  const name = get('user.name') || userInfo().username
  const email = get('user.email')
  return email ? `${name} <${email}>` : name
}

function readLine(): string {
  const buf = Buffer.alloc(256)
  let line = ''
  try {
    while (!line.includes('\n')) {
      const n = readSync(0, buf, 0, buf.length, null)
      if (!n) break
      line += buf.toString('utf8', 0, n)
    }
  } catch {
    // No readable terminal: treated as no answer.
  }
  return line.trim()
}

export const NOT_HUMAN = 'esta acción es tuya, no del agente. Escríbela tú en Claude Code (/mep:confirm, /mep:override, /mep:threshold, /mep:resync) o córrela en tu propia terminal.'

/**
 * Actions only the person takes. Two channels: the mod's slash command (--human; the guard denies that flag
 * in the agent's Bash) and an interactive terminal where the person types the id back. The agent's Bash has no TTY.
 */
export function confirmHuman(flags: Record<string, string | true>, id: string): boolean {
  if (flags.human === true) return true
  if (!process.stdin.isTTY) return false
  process.stderr.write(`Escribe "${id}" para confirmar: `)
  return readLine() === id
}
