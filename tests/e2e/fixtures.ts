import { expect, test as base } from '@playwright/test';

export const test = base.extend({
    page: async ({ context }, providePage) => {
        const page = await context.newPage();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        try {
            await providePage(page);
        } finally {
            await page.close();
        }
    },
});

export { expect };
export type { Page } from '@playwright/test';