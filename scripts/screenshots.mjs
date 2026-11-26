// Captures the README screenshots from a running instance of the app.
//
//   npm run build
//   PGLITE_DATA_DIR=memory:// NUXT_SESSION_PASSWORD=... node .output/server/index.mjs
//   BASE_URL=http://localhost:3000 npm run docs:screenshots
//
// Every shot uses a fresh demo account, so the data is the same sample set
// visitors get from "Try the demo".
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = resolve(import.meta.dirname, '../docs/screenshots')

async function hydrated(page) {
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })
}

async function demoPage(browser, { theme = 'light', viewport = { width: 1440, height: 900 } } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: theme })
  await context.addCookies([{ name: 'jt-theme', value: theme, url: BASE_URL }])
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => message.type() === 'error' && errors.push(message.text()))
  await page.goto(BASE_URL)
  await hydrated(page)
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await page.waitForURL('**/board')
  await page.locator('.board').waitFor()
  return { page, context, errors }
}

async function shot(page, name, options = {}) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(OUT, `${name}.png`), ...options })
  console.log(`saved docs/screenshots/${name}.png`)
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const allErrors = []

try {
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 760 }, deviceScaleFactor: 2 })
    const page = await context.newPage()
    await page.goto(BASE_URL)
    await hydrated(page)
    await shot(page, 'landing')
    await context.close()
  }

  {
    const { page, context, errors } = await demoPage(browser)
    await shot(page, 'board')

    await page.goto(`${BASE_URL}/stats`)
    await hydrated(page)
    await page.locator('rect.hit').nth(8).hover()
    await shot(page, 'stats', { fullPage: true })

    await page.goto(`${BASE_URL}/applications`)
    await hydrated(page)
    await shot(page, 'applications')

    await page.getByRole('link', { name: /Northwind Analytics/ }).click()
    await page.getByRole('heading', { name: 'Timeline' }).waitFor()
    await hydrated(page)
    await shot(page, 'application-detail')
    allErrors.push(...errors)
    await context.close()
  }

  {
    const { page, context, errors } = await demoPage(browser, { theme: 'dark' })
    await shot(page, 'board-dark')
    allErrors.push(...errors)
    await context.close()
  }

  {
    const { page, context, errors } = await demoPage(browser, { viewport: { width: 390, height: 844 } })
    await shot(page, 'board-mobile')
    allErrors.push(...errors)
    await context.close()
  }
}
finally {
  await browser.close()
}

if (allErrors.length) {
  console.error('Browser errors while capturing:\n' + allErrors.join('\n'))
  process.exit(1)
}
