import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  )
}
