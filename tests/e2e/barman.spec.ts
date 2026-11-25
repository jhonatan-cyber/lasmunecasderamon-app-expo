import { expect, test, type Page } from './fixtures';

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
    hasCompletedOnboarding: true,
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
                case '/categories':
                    return {
                        success: true,
                        data: [
                            { id: '10', name: 'Bebidas', status: 1, total_products: 4, display_order: 1 },
                        ],
                    };
                case '/advances/max':
                    return { success: true, data: { monto_maximo: 500000, tiene_solicitud_pendiente: false } };
                case '/service-requests/pending-count':
                    return { success: true, data: { count: 0, serviciosCount: 0, pedidosCount: 0 } };
                case '/cashregister/status':
                    return { success: true, data: { hasOpenCaja: true } };
                case '/cash-register/stats':
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
    await expect(page.locator('body')).toContainText('BAR');
    await expect(page.locator('body')).toContainText('PEDIDOS');
    await expect(page.locator('body')).not.toContainText('VENTAS');
    await expect(page.locator('body')).toContainText('SERVICIOS');
    await expect(page.locator('body')).toContainText('COVERS');
    await expect(page.locator('body')).not.toContainText('Ganancias');
    await expect(page.locator('body')).not.toContainText('Financiero');
    await page.getByText('BAR', { exact: true }).click();
    await expect(page).toHaveURL(/\/barman\/bar/);
});

test('barman home renders its primary shortcuts', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman');

    await expect(page.locator('body')).toContainText('BAR');
    await expect(page.locator('body')).toContainText('PEDIDOS');
    await expect(page.locator('body')).toContainText('SERVICIOS');
    await expect(page.locator('body')).toContainText('COVERS');
});

test('barman attendance screen renders its shell', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/asistencia');

    await expect(page.locator('body')).toContainText('Registro de turnos y bonificaciones');
});

test('barman advances screen renders its shell', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/anticipos');

    await expect(page.locator('body')).toContainText('Mis solicitudes y anticipos recibidos');
    await expect(page.locator('body')).not.toContainText('Entregar Efectivo');
    await expect(page.locator('body')).toContainText('Todas');
    await expect(page.locator('body')).toContainText('Pendientes');
    await expect(page.locator('body')).toContainText('Aprobadas');
    await expect(page.locator('body')).toContainText('Rechazadas');
    await expect(page.locator('body')).toContainText('Recibidas');
    await page.getByRole('button', { name: 'Solicitar anticipo', exact: true }).click();
    await expect(page.locator('body')).toContainText('Enviar Solicitud');
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

    await expect(page.getByText('Entregar', { exact: true })).toBeVisible();
    await expect(page.locator('body')).toContainText('Devoluciones registradas');
});

test('legacy barman sales route redirects to orders without the cashier FAB', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/ventas');

    await expect(page).toHaveURL(/\/barman\/pedidos/);
    await expect(page.locator('body')).toContainText('Pedidos');
    await expect(page.locator('body')).toContainText('Bebidas');
    await expect(
        page.locator('body'),
        'el FAB de nueva venta es flujo del cajero',
    ).not.toContainText('NUEVA VENTA');
});

test('barman services screen renders with the create entry point', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/servicios');

    await expect(page.locator('body')).toContainText('Servicios');
    await expect(page.locator('body')).toContainText('Registrar nuevo servicio en habitación');
    await expect(page.getByRole('button', { name: 'SOLICITAR SERVICIO' })).toBeVisible();
});

test('barman profile renders its role label', async ({ page }) => {
    await bootstrapBarmanSession(page);

    await page.goto('/barman/perfil');

    await expect(page.locator('body')).toContainText('Barman');
});
