import { expect, test } from '@playwright/test';

test('inicializa SQLite persistente en el navegador y lo conserva al recargar', async ({ page }) => {
    await page.route('**/api/**', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }),
    }));
    await page.route('**/*.sentry.io/**', route => route.abort());
    await page.goto('/login');
    const key = 'lasmunecas-offline-mirror.db';
    await expect.poll(() => page.evaluate(storageKey => {
        const value = localStorage.getItem(storageKey);
        return value ? atob(value).slice(0, 15) : null;
    }, key)).toBe('SQLite format 3');
    await page.reload();
    await expect.poll(() => page.evaluate(storageKey => Boolean(localStorage.getItem(storageKey)), key)).toBe(true);
});
