import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
const usesExternalWebServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    ...(!usesExternalWebServer && {
        webServer: {
            command: 'pnpm run start:web',
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 240_000,
            env: { BROWSER: 'none' },
        },
    }),
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
