import { test, expect } from '@playwright/test'

import {
  expectReplayWorks,
  launchBenchmark,
  openRunsGrid,
  openSortingCustomScenario,
  reopenRunFromHistory,
  runSortingSimulation,
} from './helpers'

test.describe('Phase 10.3 end-to-end flows', () => {
  test('create scenario, run simulation, fetch timeline, and replay', async ({ page }) => {
    await openSortingCustomScenario(page)

    const { run, timeline } = await runSortingSimulation(page)

    expect(run.module_type).toBe('sorting')
    expect(run.algorithm_key).toBe('bubble_sort')
    expect(timeline.algorithm_key).toBe('bubble_sort')
    await expectReplayWorks(page)
  })

  test('save scenario, load it from the library, and rerun', async ({ page }) => {
    const { manualInput } = await openSortingCustomScenario(page)

    await page.getByRole('button', { name: 'Save Scenario' }).click()
    await expect(page.getByText('Scenario saved')).toBeVisible()

    await page.goto('/scenarios')
    await expect(page).toHaveURL(/\/scenarios$/)
    await expect(page.getByText('Bubble Sort — 6 elements')).toBeVisible()

    await page.getByRole('button', { name: 'Load' }).click()

    await expect(page).toHaveURL(/\/sorting$/)
    await expect(page.getByRole('textbox', { name: 'Manual Input' })).toHaveValue(manualInput)

    const { run, timeline } = await runSortingSimulation(page)
    expect(run.id).toBe(timeline.run_id)
    await expect(page.getByText(/STEP \d+ \/ \d+/)).toBeVisible()
  })

  test('run benchmark and view results', async ({ page }) => {
    const { job, results } = await launchBenchmark(page)

    expect(job.status).toBe('completed')
    expect(results.summary.total_sizes).toBeGreaterThan(0)

    await expect(page.getByText('Performance Charts')).toBeVisible()
    await expect(page.getByText('Results Table')).toBeVisible()
    await expect(page.getByText('Export Results')).toBeVisible()
  })

  test('save a scenario as a guest and reopen the run from history', async ({ page }) => {
    await openSortingCustomScenario(page)
    const { run } = await runSortingSimulation(page)

    await openRunsGrid(page)
    await expect(page.getByText('Bubble Sort')).toBeVisible()

    await page.getByRole('button', { name: 'Save Scenario' }).click()
    await expect(page.getByText('Scenario saved')).toBeVisible()

    await page.goto('/scenarios')
    await expect(page.getByText(/Bubble Sort — /)).toBeVisible()

    await openRunsGrid(page)
    const { summary, timeline } = await reopenRunFromHistory(page)

    expect(summary.id).toBe(run.id)
    expect(timeline.run_id).toBe(run.id)

    await expect(page).toHaveURL(/\/sorting$/)
    await expectReplayWorks(page)
  })
})
