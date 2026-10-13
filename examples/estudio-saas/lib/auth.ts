import { createClient } from '@supabase/supabase-js'

/**
 * Para qué: iniciar sesión con email y contraseña desde el servidor.
 */
export async function signIn(url: string, key: string, email: string, password: string) {
  return createClient(url, key).auth.signInWithPassword({ email, password })
}
