import Stripe from 'stripe'

/**
 * Para qué: abrir el portal de facturación del cliente (cancelar, facturas, método de pago).
 */
export async function billingPortalUrl(secret: string, customer: string, returnUrl: string) {
  const stripe = new Stripe(secret)
  const session = await stripe.billingPortal.sessions.create({ customer, return_url: returnUrl })
  return session.url
}
