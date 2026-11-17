import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const state = path.join(root, '.test-data/qa/runtime.json');
if (!process.env.QA_PASSWORD && fs.existsSync(state)) {
  process.env.QA_PASSWORD = JSON.parse(fs.readFileSync(state, 'utf8')).QA_PASSWORD;
}
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  outputDir: '../.test-artifacts/playwright/results',
  reporter: [['list'], ['html', { outputFolder: '../.test-artifacts/playwright/report', open: 'never' }],
    ['json', { outputFile: '../.test-artifacts/playwright/results.json' }]],
  use: {
    baseURL: process.env.QA_BASE_URL || 'http://127.0.0.1:8765',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: process.env.CI ? {} : { channel: 'chrome' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.QA_BASE_URL ? undefined : {
    command: `"${process.env.QA_PYTHON || (process.platform === 'win32' ? '../.venv-qa/Scripts/python.exe' : 'python')}" ../scripts/qa.py serve`,
    url: 'http://127.0.0.1:8765/health', reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
