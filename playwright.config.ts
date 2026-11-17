import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3107';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
  },
  webServer: {
    command: `npm run start -- --port ${new URL(baseURL).port || '3107'}`,
    url: `${baseURL}/demo`,
    reuseExistingServer: false,
    env: { APP_URL: baseURL },
    timeout: 60000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
