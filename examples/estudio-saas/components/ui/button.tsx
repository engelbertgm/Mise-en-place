import type { ButtonHTMLAttributes } from 'react'

/**
 * Para qué: acción principal o secundaria de una vista.
 * No usar para: navegación (usar Link).
 * Variantes: primary · secondary · destructive
 * @example <Button variant="destructive">Cancelar reserva</Button>
 */
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'destructive' }) {
  return <button {...props} />
}
