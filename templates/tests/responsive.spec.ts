// Generado por mep (ítem responsive-screenshots). Edita PAGES con las rutas clave del proyecto.
// Corre con el sitio levantado: BASE_URL=http://localhost:3000 pnpm run test:responsive
import { expect, test } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const PAGES = ['/']
const WIDTHS = [360, 768, 1280, 1920, 2560]

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`${path} a ${width}px: sin scroll horizontal, elementos encimados ni errores de consola`, async ({ page }) => {
      // Ítem no-console-errors: any console.error or uncaught exception fails the page.
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('pageerror', err => errors.push(err.message))
      await page.setViewportSize({ width, height: 900 })
      await page.goto(BASE_URL + path, { waitUntil: 'networkidle' })

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, 'scroll horizontal (px)').toBeLessThanOrEqual(0)

      // Interactive elements that overlap each other (and are not nested) hide one another.
      const overlaps = await page.evaluate(() => {
        const visible = [...document.querySelectorAll('a, button, input, select, textarea, [role="button"]')].filter(el => {
          const r = el.getBoundingClientRect()
          const s = getComputedStyle(el)
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.position !== 'fixed' && s.position !== 'sticky'
        })
        const boxes = visible.map(el => ({ el, r: el.getBoundingClientRect() }))
        const found: string[] = []
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]
            const b = boxes[j]
            if (a.el.contains(b.el) || b.el.contains(a.el)) continue
            const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
            const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
            if (w > 2 && h > 2) found.push(`${a.el.outerHTML.slice(0, 60)} ↔ ${b.el.outerHTML.slice(0, 60)}`)
          }
        }
        return found.slice(0, 5)
      })
      expect(overlaps, 'elementos encimados').toEqual([])

      // The primary CTA (data-cta="primary") is visible without scrolling (ítem cta-above-fold).
      const cta = page.locator('[data-cta="primary"]').first()
      if (await cta.count()) {
        const box = await cta.boundingBox()
        expect(box, 'CTA principal visible').not.toBeNull()
        expect(box!.y + box!.height, 'CTA principal sobre el pliegue (px)').toBeLessThanOrEqual(900)
      }

      expect(errors, 'errores de consola').toEqual([])

      const name = path === '/' ? 'inicio' : path.replace(/\W+/g, '-').replace(/^-|-$/g, '')
      await page.screenshot({ path: `test-results/responsive/${name}-${width}.png`, fullPage: true })
    })
  }
}
