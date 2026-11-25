import { expect, test } from './fixtures';

test('la app web permite iniciar sesión aunque SQLite nativo no esté disponible', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/api/**', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }),
    }));
    await page.route('**/*.sentry.io/**', route => route.abort());
    await page.goto('/login');
    await expect(page.getByLabel('Nick')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Nick')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
    expect(pageErrors).toEqual([]);
});
