import { test, expect } from '@playwright/test'

import {
  expectReplayWorks,
  openDpPreset,
  openGraphPreset,
  runSimulation,
} from './helpers'

test.describe('Additional module coverage', () => {
  test('graph dijkstra scenarios can be saved, loaded, run, and replayed', async ({ page }) => {
    await openGraphPreset(page)

    await page.getByRole('button', { name: 'Save Scenario' }).click()
    await expect(page.getByText('Scenario saved')).toBeVisible()

    await page.goto('/scenarios')
    await expect(page.getByText('Custom Graph — DIJKSTRA')).toBeVisible()
    await page.getByRole('button', { name: 'Load' }).click()

    await expect(page).toHaveURL(/\/graph$/)
    await expect(page.getByRole('combobox', { name: 'Algorithm' })).toHaveValue('dijkstra')
    await expect(page.getByText('5 nodes · 6 edges · weighted')).toBeVisible()

    const { run, timeline } = await runSimulation(page)

    expect(run.module_type).toBe('graph')
    expect(run.algorithm_key).toBe('dijkstra')
    expect(timeline.module_type).toBe('graph')
    expect(timeline.algorithm_key).toBe('dijkstra')

    await expectReplayWorks(page)
  })

  test('dp edit-distance scenarios can be saved, loaded, run, and replayed', async ({ page }) => {
    await openDpPreset(page)

    await expect(page.getByRole('textbox', { name: 'String A' })).toHaveValue('kitten')
    await expect(page.getByRole('textbox', { name: 'String B' })).toHaveValue('sitting')

    await page.getByRole('button', { name: 'Save Scenario' }).click()
    await expect(page.getByText('Scenario saved')).toBeVisible()

    await page.goto('/scenarios')
    await expect(page.getByText(/Edit Distance \(Levenshtein\) — "kitten" vs "sitting"/)).toBeVisible()
    await page.getByRole('button', { name: 'Load' }).click()

    await expect(page).toHaveURL(/\/dp$/)
    await expect(page.getByRole('combobox', { name: 'Algorithm' })).toHaveValue('edit_distance')
    await expect(page.getByRole('textbox', { name: 'String A' })).toHaveValue('kitten')
    await expect(page.getByRole('textbox', { name: 'String B' })).toHaveValue('sitting')

    const { run, timeline } = await runSimulation(page)

    expect(run.module_type).toBe('dp')
    expect(run.algorithm_key).toBe('edit_distance')
    expect(timeline.module_type).toBe('dp')
    expect(timeline.algorithm_key).toBe('edit_distance')

    await expectReplayWorks(page)
  })
})
