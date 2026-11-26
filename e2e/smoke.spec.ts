import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Typing before Vue hydrates would be wiped out, so wait for the app to mount. */
async function goto(page: Page, path: string) {
  await page.goto(path)
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })
}

test('register, add an application and move it across the board', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  // Register
  await goto(page, '/register')
  await page.getByLabel('Name').fill('Smoke Test')
  await page.getByLabel('Email').fill(`smoke-${randomUUID()}@example.com`)
  await page.getByLabel('Password').fill('a-long-enough-password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/board$/)
  await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible()

  // Add an application from the Applied column
  await page.getByRole('link', { name: 'Add application to Applied' }).click()
  await page.getByLabel('Company *').fill('Smoke Industries')
  await page.getByLabel('Role *').fill('QA Engineer')
  await page.getByRole('button', { name: 'Add application' }).click()
  await expect(page.getByRole('heading', { name: 'Smoke Industries' })).toBeVisible()
  await expect(page.getByLabel('Stage')).toHaveValue('applied')

  // Drag it to Interview with the mouse
  await page.getByRole('link', { name: 'Board' }).click()
  const applied = page.locator('.column-applied')
  const interview = page.locator('.column-interview')
  await expect(applied.getByRole('link', { name: 'Smoke Industries' })).toBeVisible()
  const moved = page.waitForResponse(response => response.url().includes('/move') && response.ok())
  await applied.locator('[data-card-id]').first().dragTo(interview.locator('.cards'))
  await moved
  await expect(interview.getByRole('link', { name: 'Smoke Industries' })).toBeVisible()

  // ...and on to Offer with the keyboard
  const handle = page.getByRole('button', { name: 'Move Smoke Industries, QA Engineer' })
  await handle.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  const movedAgain = page.waitForResponse(response => response.url().includes('/move') && response.ok())
  await page.keyboard.press('Space')
  await movedAgain

  // The move is stored, not just shown
  await page.reload()
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })
  await expect(page.locator('.column-offer').getByRole('link', { name: 'Smoke Industries' })).toBeVisible()
  await expect(page.locator('.column-interview').getByRole('link', { name: 'Smoke Industries' })).toHaveCount(0)

  expect(errors).toEqual([])
})
