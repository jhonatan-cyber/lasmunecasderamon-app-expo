import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    use: {
        baseURL: `http://127.0.0.1:${port}`,
        trace: 'on-first-retry',
    },
    webServer: {
        command: `pnpm smoke:web && pnpm exec http-server .expo-smoke -p ${port} -c-1 --silent`,
        port,
        reuseExistingServer: !process.env.CI,
        timeout: 240000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
