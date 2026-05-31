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
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
