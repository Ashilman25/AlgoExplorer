import { expect } from '@playwright/test'

function pathnameOf(response) {
  return new URL(response.url()).pathname
}

function matches(response, pathnamePattern, method) {
  return response.request().method() === method && pathnamePattern.test(pathnameOf(response))
}

export async function setRangeValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    const prototype = Object.getPrototypeOf(element)
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
    descriptor?.set?.call(element, String(nextValue))
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

export async function openSortingCustomScenario(page, manualInput = '9, 4, 7, 2, 5, 1') {
  await page.goto('/sorting')
  await expect(page).toHaveURL(/\/sorting$/)

  await page.getByRole('combobox', { name: 'Array Preset' }).selectOption('custom')
  const manualInputField = page.getByRole('textbox', { name: 'Manual Input' })
  await manualInputField.fill(manualInput)

  await expect(manualInputField).toHaveValue(manualInput)
  await expect(page.getByRole('button', { name: 'Run Simulation' })).toBeEnabled()

  return { manualInput }
}

export async function openGraphPreset(page, { algorithm = 'dijkstra', preset = 'weighted-diamond' } = {}) {
  await page.goto('/graph')
  await expect(page).toHaveURL(/\/graph$/)

  await page.getByRole('combobox', { name: 'Algorithm' }).selectOption(algorithm)
  await page.getByRole('combobox', { name: 'Preset' }).selectOption(preset)
}

export async function openDpPreset(page, { algorithm = 'edit_distance', preset = 'substitutions' } = {}) {
  await page.goto('/dp')
  await expect(page).toHaveURL(/\/dp$/)

  await page.getByRole('combobox', { name: 'Algorithm' }).selectOption(algorithm)
  await page.getByRole('combobox', { name: 'Preset' }).selectOption(preset)
}

export async function runSimulation(page) {
  const createRunPromise = page.waitForResponse((response) =>
    matches(response, /^\/api\/runs\/$/, 'POST'),
  )
  const timelinePromise = page.waitForResponse((response) =>
    matches(response, /^\/api\/runs\/\d+\/timeline$/, 'GET'),
  )

  await page.getByRole('button', { name: 'Run Simulation' }).click()

  const createRunResponse = await createRunPromise
  const timelineResponse = await timelinePromise

  expect(createRunResponse.ok()).toBeTruthy()
  expect(timelineResponse.ok()).toBeTruthy()

  const run = await createRunResponse.json()
  const timeline = await timelineResponse.json()

  expect(run.timeline_available).toBe(true)
  expect(timeline.run_id).toBe(run.id)
  expect(timeline.total_steps).toBeGreaterThan(0)
  expect(timeline.steps.length).toBeGreaterThan(0)

  await expect(page.getByText(/STEP \d+ \/ \d+/)).toBeVisible()

  return { run, timeline }
}

export async function runSortingSimulation(page) {
  return runSimulation(page)
}

export async function pauseAndResetPlayback(page) {
  const pauseButton = page.getByRole('button', { name: 'Pause' })
  if (await pauseButton.isVisible()) {
    await pauseButton.click()
  }

  const startButton = page.getByRole('button', { name: 'Jump to start' })
  if (await startButton.isEnabled()) {
    await startButton.click()
  }

  await expect(page.getByText(/STEP 1 \/ \d+/)).toBeVisible()
}

export async function expectReplayWorks(page) {
  await pauseAndResetPlayback(page)
  await page.getByRole('button', { name: 'Step forward' }).click()
  await expect(page.getByText(/STEP 2 \/ \d+/)).toBeVisible()
}

export async function openRunsGrid(page) {
  await page.goto('/runs')
  await expect(page).toHaveURL(/\/runs$/)
  await page.getByTitle('Grid view').click()
}

export async function openScenariosList(page) {
  await page.goto('/scenarios')
  await expect(page).toHaveURL(/\/scenarios$/)
  await page.getByTitle('List view').click()
}

export async function reopenRunFromHistory(page) {
  const summaryPromise = page.waitForResponse((response) =>
    matches(response, /^\/api\/runs\/\d+$/, 'GET'),
  )
  const timelinePromise = page.waitForResponse((response) =>
    matches(response, /^\/api\/runs\/\d+\/timeline$/, 'GET'),
  )

  await page.getByRole('button', { name: 'Reopen' }).click()

  const summaryResponse = await summaryPromise
  const timelineResponse = await timelinePromise

  expect(summaryResponse.ok()).toBeTruthy()
  expect(timelineResponse.ok()).toBeTruthy()

  const summary = await summaryResponse.json()
  const timeline = await timelineResponse.json()

  expect(timeline.run_id).toBe(summary.id)
  expect(timeline.total_steps).toBeGreaterThan(0)

  return { summary, timeline }
}

export async function launchBenchmark(page) {
  await page.goto('/benchmarks')
  await expect(page).toHaveURL(/\/benchmarks$/)

  await expect(page.getByText('No benchmark results yet')).toBeVisible()
  await setRangeValue(page.getByRole('slider', { name: 'Trials per Size' }), 1)

  const createJobPromise = page.waitForResponse((response) =>
    matches(response, /^\/api\/benchmarks\/$/, 'POST'),
  )
  const resultsPromise = page.waitForResponse((response) =>
    matches(response, /^\/api\/benchmarks\/\d+\/results$/, 'GET'),
  )

  await page.getByRole('button', { name: 'Launch Benchmark' }).click()

  const createJobResponse = await createJobPromise
  const resultsResponse = await resultsPromise

  expect(createJobResponse.ok()).toBeTruthy()
  expect(resultsResponse.ok()).toBeTruthy()

  const job = await createJobResponse.json()
  const results = await resultsResponse.json()

  expect(results.id).toBe(job.id)
  expect(results.status).toBe('completed')
  expect(results.summary.total_runs).toBeGreaterThan(0)
  expect(results.table.length).toBeGreaterThan(0)

  return { job, results }
}
