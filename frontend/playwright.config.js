import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FRONTEND_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4175'
const BACKEND_URL = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8015'
const BROWSER_CHANNEL = process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chrome'

const frontendDir = __dirname
const backendDir = path.resolve(__dirname, '../backend')
const backendPython = path.resolve(backendDir, '.venv/bin/python')

export default defineConfig({
  testDir: './test/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  outputDir: './test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: FRONTEND_URL,
    browserName: 'chromium',
    ...(BROWSER_CHANNEL ? { channel: BROWSER_CHANNEL } : {}),
    headless: true,
    viewport: { width: 1440, height: 960 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `${backendPython} -m uvicorn app.main:app --host 127.0.0.1 --port 8015`,
      url: `${BACKEND_URL}/api/health`,
      cwd: backendDir,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        DATABASE_URL: 'sqlite:///./app/e2e-playwright.db',
        CORS_ORIGINS: FRONTEND_URL,
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4175',
      url: FRONTEND_URL,
      cwd: frontendDir,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_BASE_URL: BACKEND_URL,
      },
    },
  ],
})
