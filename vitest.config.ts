import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./tests/setup/vitest-setup.ts'],
        include: ['tests/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', 'tests/e2e/**', 'tests/integration/**'],
        testTimeout: 10000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
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
