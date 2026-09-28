import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Config de las pruebas de **integración**: a diferencia de las unitarias, no
 * mockean el cliente HTTP ni la conectividad, usan SQLite real y necesitan el
 * dashboard corriendo. Por eso viven en una config aparte y no entran en
 * `pnpm test:unit` (que debe pasar sin servidor ni base de datos).
 */
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
