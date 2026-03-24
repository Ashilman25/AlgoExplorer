import { test, expect } from '@playwright/test'

import {
  openDpPreset,
  openRunsGrid,
  openScenariosList,
  openSortingCustomScenario,
  runSortingSimulation,
} from './helpers'

test.describe('Validation and guest management', () => {
  test('sorting manual input validation blocks invalid actions until the input is repaired', async ({ page }) => {
    await page.goto('/sorting')
    await page.getByRole('combobox', { name: 'Array Preset' }).selectOption('custom')

    const manualInput = page.getByRole('textbox', { name: 'Manual Input' })
    await manualInput.fill('7, nope, 2')

    await expect(page.getByText('"nope" is not a valid number')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run Simulation' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Save Scenario' })).toBeDisabled()

    await manualInput.fill('7, 5, 2, 1')

    await expect(page.getByText('"nope" is not a valid number')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Run Simulation' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Save Scenario' })).toBeEnabled()
  })

  test('dp validation blocks whitespace-only and empty submissions until corrected', async ({ page }) => {
    await openDpPreset(page)

    await page.getByRole('textbox', { name: 'String A' }).fill('   ')
    await page.getByRole('textbox', { name: 'String B' }).fill('')

    await expect(page.getByText('String A must not be whitespace-only')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run Simulation' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Save Scenario' })).toBeDisabled()

    await page.getByRole('textbox', { name: 'String A' }).fill('kitten')
    await page.getByRole('textbox', { name: 'String B' }).fill('sitting')

    await expect(page.getByText('String A must not be whitespace-only')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Run Simulation' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Save Scenario' })).toBeEnabled()
  })

  test('scenario library supports editing, tagging, searching, duplicating, and deleting scenarios', async ({ page }) => {
    await openSortingCustomScenario(page)
    await page.getByRole('button', { name: 'Save Scenario' }).click()
    await expect(page.getByText('Scenario saved')).toBeVisible()

    await openScenariosList(page)
    await expect(page.getByText('Quick Sort — 6 elements')).toBeVisible()

    const originalScenarioRow = page
      .locator('div')
      .filter({ hasText: 'Quick Sort — 6 elements' })
      .filter({ has: page.getByTitle('Edit') })
      .first()

    await originalScenarioRow.hover()
    await originalScenarioRow.getByTitle('Edit').click()

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('e.g. BFS on cyclic graph').fill('Edited Quick Sort Scenario')
    await dialog.getByPlaceholder('Type a tag and press Enter').fill('smoke')
    await dialog.getByPlaceholder('Type a tag and press Enter').press('Enter')
    await dialog.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Scenario updated')).toBeVisible()
    await expect(
      page.locator('p').filter({ hasText: 'Edited Quick Sort Scenario' }).first(),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'smoke' })).toBeVisible()

    await page.getByRole('button', { name: 'smoke' }).click()
    await expect(page.getByRole('button', { name: /tag: smoke/i })).toBeVisible()

    const searchInput = page.getByPlaceholder(/Search scenarios/)
    await searchInput.fill('edited')
    await expect(
      page.locator('p').filter({ hasText: 'Edited Quick Sort Scenario' }).first(),
    ).toBeVisible()

    await searchInput.fill('missing')
    await expect(page.getByText('No matching scenarios')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).click()

    await expect(
      page.locator('p').filter({ hasText: 'Edited Quick Sort Scenario' }).first(),
    ).toBeVisible()

    const refreshedRow = page
      .locator('div')
      .filter({ hasText: 'Edited Quick Sort Scenario' })
      .filter({ has: page.getByTitle('Duplicate') })
      .first()

    await refreshedRow.hover()
    await refreshedRow.getByTitle('Duplicate').click()
    await expect(page.getByText('Scenario duplicated')).toBeVisible()
    await expect(
      page.locator('p').filter({ hasText: 'Edited Quick Sort Scenario (copy)' }).first(),
    ).toBeVisible()

    await searchInput.fill('(copy)')
    await expect(
      page.locator('p').filter({ hasText: 'Edited Quick Sort Scenario (copy)' }).first(),
    ).toBeVisible()

    const copyRow = page
      .locator('div')
      .filter({ hasText: 'Edited Quick Sort Scenario (copy)' })
      .filter({ has: page.getByTitle('Delete') })
      .first()

    await copyRow.hover()
    await copyRow.getByTitle('Delete').click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('Scenario deleted')).toBeVisible()
    await expect(page.getByText('No matching scenarios')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(
      page.locator('p').filter({ hasText: 'Edited Quick Sort Scenario' }).first(),
    ).toBeVisible()
  })

  test('run history supports rerunning previous configs and clearing history', async ({ page }) => {
    const { manualInput } = await openSortingCustomScenario(page, '8, 1, 4, 2')
    await runSortingSimulation(page)

    await openRunsGrid(page)
    await expect(page.getByText('Quick Sort')).toBeVisible()

    const runSearchInput = page.getByPlaceholder(/Search runs/)
    await runSearchInput.fill('quick')
    await expect(page.getByText('Quick Sort')).toBeVisible()

    await page.getByRole('button', { name: 'Rerun' }).click()

    await expect(page).toHaveURL(/\/sorting$/)
    await expect(page.getByRole('textbox', { name: 'Manual Input' })).toHaveValue(manualInput)

    await runSortingSimulation(page)

    await openRunsGrid(page)
    await expect(page.getByText('2 of 2 runs')).toBeVisible()

    await page.getByRole('button', { name: 'Clear all' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Clear All' }).click()

    await expect(page.getByText('History cleared')).toBeVisible()
    await expect(page.getByText('No runs yet')).toBeVisible()
  })
})
