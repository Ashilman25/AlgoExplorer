import { test, expect } from '@playwright/test'

import {
  openRunsGrid,
  openSortingCustomScenario,
  runSortingSimulation,
} from './helpers'

test.describe('Phase 10.4 error UX', () => {
  test('connection banner appears when health checks fail and clears after retry succeeds', async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Health check unavailable' },
        }),
      })
    })

    await page.goto('/sorting')

    const bannerText = page.getByText(
      'Unable to connect to the backend server. Features that require the API will not work.',
    )

    await expect(bannerText).toBeVisible({ timeout: 12_000 })

    await page.unroute('**/api/health')
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(bannerText).toHaveCount(0)
  })

  test('missing timeline resources show a recovery toast when reopening a saved run', async ({ page }) => {
    await openSortingCustomScenario(page)
    await runSortingSimulation(page)

    await openRunsGrid(page)

    await page.route('**/api/runs/*/timeline', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Timeline not found.' },
        }),
      })
    })

    await page.getByRole('button', { name: 'Reopen' }).click()

    await expect(page).toHaveURL(/\/sorting$/)
    await expect(page.getByText('Could not load run')).toBeVisible()
    await expect(
      page.getByText('The timeline is no longer available. You can rerun the simulation.'),
    ).toBeVisible()
    await expect(page.getByText('STEP — / —')).toBeVisible()
  })

  test('quota failures in guest storage show a warning toast during save', async ({ page }) => {
    await page.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = function(key, value) {
        if (key === 'algo-explorer-guest') {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        }
        return originalSetItem.call(this, key, value)
      }
    })

    await openSortingCustomScenario(page)
    await page.getByRole('button', { name: 'Save Scenario' }).click()

    await expect(page.getByText('Scenario saved')).toBeVisible()
    await expect(page.getByText('Storage full')).toBeVisible()
    await expect(
      page.getByText('Local storage is full. Consider clearing old runs or scenarios to free space.'),
    ).toBeVisible()
  })

  test('blocked guest storage shows an unavailable warning toast during save', async ({ page }) => {
    await page.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = function(key, value) {
        if (key === 'algo-explorer-guest') {
          throw new DOMException('Storage blocked', 'SecurityError')
        }
        return originalSetItem.call(this, key, value)
      }
    })

    await openSortingCustomScenario(page)
    await page.getByRole('button', { name: 'Save Scenario' }).click()

    await expect(page.getByText('Scenario saved')).toBeVisible()
    await expect(page.getByText('Storage unavailable')).toBeVisible()
    await expect(
      page.getByText('Local storage is unavailable. Your data will not persist across sessions.'),
    ).toBeVisible()
  })

  test('401 API responses surface the auth-expired warning and inline request error', async ({ page }) => {
    await page.goto('/benchmarks')

    // Seed a fake auth token so the client treats this as an authenticated session
    await page.evaluate(() => {
      const state = { state: { accessToken: 'fake-token', user: { id: 1, username: 'test' } }, version: 0 }
      localStorage.setItem('algo-explorer-auth', JSON.stringify(state))
    })
    // Reload so the auth store hydrates with the seeded token
    await page.goto('/benchmarks')

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":{"message":"Invalid or expired token."}}' })
    })

    await page.route('**/api/benchmarks/', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Your session has expired.' },
        }),
      })
    })

    await page.getByRole('button', { name: 'Launch Benchmark' }).click()

    const alert = page.getByRole('alert')
    await expect(page.getByText('Session expired').first()).toBeVisible()
    await expect(page.getByText('Please sign in again to continue.').first()).toBeVisible()
    await expect(alert.getByText('Authentication failed')).toBeVisible()
    await expect(alert.getByText('Your session has expired.')).toBeVisible()
  })
})
