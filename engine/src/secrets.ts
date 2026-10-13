// Pure module: imported by the engine and by the gate mod (no Node APIs here).

/** Things that give access or sign something. The catalog item `no-secrets-in-repo` uses SECRET_PATTERN; a test keeps them equal. */
export const SECRET_PATTERNS: { name: string; source: string }[] = [
  { name: 'private key', source: '-----BEGIN [A-Z ]*PRIVATE KEY-----' },
  { name: 'Stripe secret key', source: '\\b[sr]k_live_[0-9a-zA-Z]{16,}' },
  { name: 'Stripe webhook secret', source: '\\bwhsec_[0-9a-zA-Z]{16,}' },
  { name: 'OpenAI / Anthropic key', source: '\\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}' },
  { name: 'AWS access key', source: '\\bAKIA[0-9A-Z]{16}\\b' },
  { name: 'GitHub token', source: '\\bgh[pousr]_[A-Za-z0-9]{36,}' },
  { name: 'Slack token', source: '\\bxox[abposr]-[A-Za-z0-9-]{10,}' },
  { name: 'Google API key', source: '\\bAIza[0-9A-Za-z_-]{35}\\b' },
  { name: 'Resend key', source: '\\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}' },
  { name: 'npm token', source: '\\bnpm_[A-Za-z0-9]{36}\\b' },
  { name: 'service account JSON', source: '"type":\\s*"service_account"' },
  { name: 'connection string with password', source: '\\b(?:postgres(?:ql)?|mysql|mongodb(?:\\+srv)?|redis)://[^\\s:/@"\']+:[^\\s@"\'$]{3,}@' },
  { name: 'Supabase service_role in public variable', source: '(?:NEXT_PUBLIC|VITE|PUBLIC)_[A-Z_]*SERVICE_ROLE' },
]

export const SECRET_PATTERN = SECRET_PATTERNS.map(p => `(?:${p.source})`).join('|')

/** Files where a real secret may live locally (never committed). */
export const LOCAL_SECRET_FILE = /(^|\/)\.env(\.(?!example$)[\w.-]+)?$/

export function findSecret(text: string): string | undefined {
  for (const p of SECRET_PATTERNS) {
    if (new RegExp(p.source).test(text)) return p.name
  }
  return undefined
}
