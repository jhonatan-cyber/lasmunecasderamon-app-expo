import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./tests/setup/vitest-setup.ts'],
        include: ['tests/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', 'tests/e2e/**'],
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
