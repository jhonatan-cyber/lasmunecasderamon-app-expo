import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./tests/setup/vitest-setup.ts'],
        include: ['tests/**/*.test.{ts,tsx}'],
        // Las de integración necesitan el dashboard y la base reales: se corren
        // aparte con `pnpm test:integration` (vitest.integration.config.ts).
        exclude: ['node_modules', 'tests/e2e/**', 'tests/integration/**'],
        testTimeout: 10000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            thresholds: {
                branches: 45,
                functions: 60,
                lines: 65,
                statements: 65
            },
            exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.*', '.expo/', '**/types/**']
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
