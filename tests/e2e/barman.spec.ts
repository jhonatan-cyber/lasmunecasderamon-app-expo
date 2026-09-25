import { expect, Page, test } from '@playwright/test';

const todayKey = new Date().toDateString();

const barmanUser = {
    id: 'b1',
    name: 'Damian',
    lastName: 'Perez',
    email: 'damo@lasmunecasderamon.com',
    role: 'barman',
    foto: '',
    username: 'damo',
    nick: 'Damo',
};

async function bootstrapBarmanSession(page: Page) {
    await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace('/api', '');

        const json = (() => {
            switch (path) {
                case '/auth/me':
                    return { success: true, data: { user: barmanUser } };
                case '/users/status':
                    return {
                        success: true,
                        data: {
                            status: 1,
                            estado_servicio: 1,
                            user: { id: 'b1', nick: 'Damo', name: 'Damian', role: 'barman', foto: '' },
                        },
                    };
                case '/events/stats':
                    return {
                        success: true,
                        data: { weeklyIncome: [], badges: [], totalEarnings: 0, svcCount: 0 },
                    };
                case '/anticipos/maximo':
                    return { success: true, data: 500000 };
                case '/solicitudes-servicios/pending-count':
                    return { success: true, data: { count: 0, serviciosCount: 0, pedidosCount: 0 } };
                case '/cashregister/status':
                    return { success: true, data: { hasOpenCaja: true } };
                case '/caja/stats':
                    return { success: true, data: { ventas: 0, cuentas: 0, servicios: 0, caja: 0 } };
                default:
                    return { success: true, data: [] };
            }
        })();

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(json),
        });
    });

    await page.addInitScript(
        ({ seededUser, seededTodayKey }) => {
            window.localStorage.setItem('token', 'e2e-token');
            window.localStorage.setItem('user', JSON.stringify(seededUser));
            window.localStorage.setItem('biometricEnabled', 'false');
            window.localStorage.setItem('asistenciaModalShown', seededTodayKey);
        },
        { seededUser: barmanUser, seededTodayKey: todayKey },
    );
}

test('root redirects barman users to the barman dashboard', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/');

    await expect(page).toHaveURL(/barman/);
    await expect(page.locator('body')).toContainText('Ganancias');
    await expect(page.locator('body')).toContainText('BAR');
    await expect(page.locator('body')).toContainText('VENTAS');
    await expect(page.locator('body')).toContainText('SERVICIOS');
    await expect(page.locator('body'), 'contador de envases del home').toContainText('Envases');
});

test('barman home renders its tab bar labels', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman');

    await expect(page.locator('body')).toContainText('Asistencia');
    await expect(page.locator('body')).toContainText('Anticipos');
    await expect(page.locator('body')).toContainText('Propinas');
    await expect(page.locator('body')).toContainText('Horas Extras');
});

test('barman attendance screen renders its shell', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/asistencia');

    await expect(page.locator('body')).toContainText('Registro de turnos y bonificaciones');
});

test('barman advances screen renders its shell', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/anticipos');

    await expect(page.locator('body')).toContainText('Mis retiros de efectivo');
});

test('barman tips screen renders its summary', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/propinas');

    await expect(page.locator('body')).toContainText('PROPINAS PENDIENTES');
    await expect(page.locator('body')).toContainText('Mis ganancias por servicio');
});

test('barman overtime screen renders its summary', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/horas-extras');

    await expect(page.locator('body')).toContainText('HORAS EXTRAS PENDIENTES');
    await expect(page.locator('body')).toContainText('Mi tiempo adicional laborado');
});

test('barman bar screen renders stock and transfers shell', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/bar');

    await expect(page.locator('body')).toContainText('unidades en barra');
});

test('barman bar screen exposes the container return tab', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/bar');

    await page.getByText('Envases', { exact: true }).click();

    await expect(page.locator('body')).toContainText('Escanea el envase vacío');
    await expect(page.locator('body')).toContainText('Devoluciones registradas');
});

test('barman sales screen renders its shell without the cashier FAB', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/ventas');

    await expect(page.locator('body')).toContainText('Ventas');
    await expect(
        page.locator('body'),
        'el FAB de nueva venta es flujo del cajero',
    ).not.toContainText('NUEVA VENTA');
});

test('barman services screen renders with the create entry point', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/servicios');

    await expect(page.locator('body')).toContainText('Servicios');
    await expect(page.locator('body')).toContainText('NUEVO SERVICIO');
});

test('barman profile renders its role label', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/perfil');

    await expect(page.locator('body')).toContainText('Barman');
});
