/**
 * Para qué: precio mensual de un plan en centavos, calculado en el servidor.
 * No usar para: mostrar precios formateados (usar Intl.NumberFormat).
 * @example monthlyPrice('pro') // 49900
 */
export function monthlyPrice(plan: 'basic' | 'pro'): number {
  return plan === 'pro' ? 49900 : 19900
}
