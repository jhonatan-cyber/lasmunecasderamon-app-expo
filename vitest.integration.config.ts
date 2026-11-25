import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/integration/setup.ts'],
        include: ['tests/integration/**/*.integration.test.ts'],
        testTimeout: 60_000,
        hookTimeout: 60_000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
