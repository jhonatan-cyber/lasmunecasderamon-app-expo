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
            // Ratchet 2026-10-07 (medido: 60.7/69.6/77.6/76.8): si agregás código
            // sin tests, el CI te lo cobra acá.
            thresholds: {
                branches: 55,
                functions: 65,
                lines: 72,
                statements: 72
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
