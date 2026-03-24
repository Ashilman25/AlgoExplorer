import { test, expect } from '@playwright/test'

import {
  openSortingCustomScenario,
  setRangeValue,
} from './helpers'

test.describe('Benchmark exports and error states', () => {
  test('benchmark custom sizes are normalized and both export formats download', async ({ page }) => {
    await page.goto('/benchmarks')
    await expect(page).toHaveURL(/\/benchmarks$/)

    await page.getByRole('combobox', { name: 'Input Sizes' }).selectOption('custom')
    await page.getByPlaceholder('e.g. 100, 500, 1000, 5000').fill('500, 100, 100, 25')
    await page.getByRole('button', { name: 'Apply' }).click()
    await setRangeValue(page.getByRole('slider', { name: 'Trials per Size' }), 1)
    await expect(page.getByText('1 trials')).toBeVisible()

    const createJobPromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/benchmarks/',
    )
    const resultsPromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      /\/api\/benchmarks\/\d+\/results$/.test(new URL(response.url()).pathname),
    )

    await page.getByRole('button', { name: 'Launch Benchmark' }).click()

    const createJobResponse = await createJobPromise
    const resultsResponse = await resultsPromise

    const requestBody = createJobResponse.request().postDataJSON()
    const results = await resultsResponse.json()

    expect(requestBody.sizes).toEqual([25, 100, 500])
    expect(requestBody.trials_per_size).toBe(1)
    expect(results.summary.total_sizes).toBe(3)

    const jsonDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON' }).click()
    const jsonDownload = await jsonDownloadPromise
    expect(jsonDownload.suggestedFilename()).toBe('benchmark-results.json')

    const csvDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'CSV' }).click()
    const csvDownload = await csvDownloadPromise
    expect(csvDownload.suggestedFilename()).toBe('benchmark-results.csv')
  })

  test('simulation failures surface the backend error message without populating playback', async ({ page }) => {
    await openSortingCustomScenario(page)

    await page.route('**/api/runs/', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Injected sorting failure',
          },
        }),
      })
    })

    await page.getByRole('button', { name: 'Run Simulation' }).click()

    await expect(page.getByText('Injected sorting failure')).toBeVisible()
    await expect(page.getByText('STEP — / —')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run Simulation' })).toBeEnabled()
  })

  test('benchmark result fetch failures surface the error toast and keep the empty state', async ({ page }) => {
    await page.goto('/benchmarks')
    await expect(page).toHaveURL(/\/benchmarks$/)

    await setRangeValue(page.getByRole('slider', { name: 'Trials per Size' }), 1)

    await page.route('**/api/benchmarks/*/results', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Injected benchmark result failure',
          },
        }),
      })
    })

    await page.getByRole('button', { name: 'Launch Benchmark' }).click()

    await expect(page.getByText('Benchmark failed')).toBeVisible()
    await expect(page.getByText('Injected benchmark result failure')).toBeVisible()
    await expect(page.getByText('No benchmark results yet')).toBeVisible()
  })
})
