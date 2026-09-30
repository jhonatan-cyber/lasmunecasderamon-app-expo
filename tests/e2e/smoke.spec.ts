import { expect, Page, test } from '@playwright/test';

type Role = 'cajero' | 'garzon' | 'anfitriona';

const todayKey = new Date().toDateString();

const users: Record<Role, Record<string, unknown>> = {
    cajero: {
        id: '1',
        name: 'Carla',
        lastName: 'Caja',
        email: 'carla@lasmunecasderamon.com',
        role: 'cajero',
        foto: '',
        username: 'carla.caja',
    },
    garzon: {
        id: '2',
        name: 'Gaston',
        lastName: 'Garzon',
        email: 'gaston@lasmunecasderamon.com',
        role: 'garzon',
        foto: '',
        username: 'gaston.garzon',
    },
    anfitriona: {
        id: '3',
        name: 'Ana',
        lastName: 'Fitriona',
        email: 'ana@lasmunecasderamon.com',
        role: 'anfitriona',
        foto: '',
        username: 'ana.fitriona',
    },
};

async function bootstrapRoleSession(page: Page, role: Role) {
    const user = users[role];

    await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace('/api', '');

        const json = (() => {
            switch (path) {
                case '/auth/me':
                    return { success: true, data: { user } };
                case '/caja/stats':
                    return { success: true, data: { ventas: 4, cuentas: 2, servicios: 3, caja: 1 } };
                case '/solicitudes-servicios/pending-count':
                    return { success: true, data: { count: 2, serviciosCount: 1, pedidosCount: 1 } };
                case '/users/status':
                    return { success: true, data: { status: 1, estado_servicio: 1, user: { id: '1', nick: 'test', name: 'Test', role: 'cajero', foto: '' } } };
                case '/events/user':
                    return { success: true, data: [] };
                case '/events/stats':
                    return {
                        success: true,
                        data: {
                            weeklyIncome: [
                                { day: '2026-03-16', total: 30000 },
                                { day: '2026-03-15', total: 20000 },
                            ],
                            badges: [],
                            totalEarnings: 30000,
                            svcCount: 2,
                        },
                    };
                case '/cashregister/status':
                    return { success: true, data: { hasOpenCaja: true } };
                case '/categories':
                    return {
                        success: true,
                        data: [
                            { id: '10', name: 'Bebidas', description: 'Tragos', status: 1, total_products: 4, display_order: 1 },
                        ],
                    };
                case '/servicios/user':
                    return { success: true, data: [] };
                default:
                    if (path.startsWith('/sales')) {
                        return { success: true, data: [] };
                    }

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
        { seededUser: user, seededTodayKey: todayKey },
    );
}

test('login route renders the auth shell', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('body')).toContainText(/iniciar/i);
    await expect(page.locator('body')).toContainText(/usuario/i);
});

test('root route resolves without a 404 shell', async ({ page }) => {
    await page.goto('/');

    await expect(page).not.toHaveTitle(/404/i);
    await expect(page.locator('body')).not.toContainText(/not found/i);
});

test('root redirects cajero users to the cashier dashboard', async ({ page }) => {
    await bootstrapRoleSession(page, 'cajero');

    await page.goto('/');

    await expect(page).toHaveURL(/cajero/);
    await expect(page.locator('body')).toContainText('VENTAS');
    await expect(page.locator('body')).toContainText('CUENTAS');
    // Paridad con Flutter: la acción ANALÍTICAS vive en el home del cajero
    await expect(page.locator('body')).toContainText('ANALÍTICAS');
});

test('root redirects garzon users to the waiter dashboard', async ({ page }) => {
    await bootstrapRoleSession(page, 'garzon');

    await page.goto('/');

    await expect(page).toHaveURL(/garzon/);
    await expect(page.locator('body')).toContainText('PEDIDOS');
    await expect(page.locator('body')).toContainText('SERVICIOS');
    await expect(page.locator('body')).toContainText('ANALÍTICAS');
});

test('root redirects anfitriona users to the hostess dashboard', async ({ page }) => {
    await bootstrapRoleSession(page, 'anfitriona');

    await page.goto('/');

    await expect(page).toHaveURL(/anfitriona/);
    await expect(page.locator('body')).toContainText('Meta Semanal');
    await expect(page.locator('body')).toContainText('SOLICITAR SERVICIO');
    await expect(page.locator('body')).toContainText('Analíticas');
});

test('cajero sales screen renders its critical module shell', async ({ page }) => {
    await bootstrapRoleSession(page, 'cajero');

    await page.goto('/cajero/ventas');

    await expect(page.locator('body')).toContainText(/ventas/i);
    await expect(page.locator('body')).toContainText(/historial|proceso/i);
});

test('garzon orders screen renders categories', async ({ page }) => {
    await bootstrapRoleSession(page, 'garzon');

    await page.goto('/garzon/pedidos');

    await expect(page.locator('body')).toContainText(/categor/i);
    await expect(page.locator('body')).toContainText('Bebidas');
});

test('cajero home opens the analytics screen with real KPIs and charts', async ({ page }) => {
    await bootstrapRoleSession(page, 'cajero');

    // Se registra DESPUÉS del mock global de bootstrap: Playwright da
    // prioridad a la última ruta registrada para la misma URL.
    await page.route('**/api/stats/**', async (route) => {
        const isSummary = new URL(route.request().url()).pathname.endsWith('/dashboard-summary');
        const json = isSummary
            ? {
                  success: true,
                  data: { totalACobrar: 13500, totalServicios: 5, totalComisiones: 3, totalPropinas: 7 },
              }
            : {
                  success: true,
                  data: {
                      startDate: '2026-09-21',
                      endDate: '2026-09-27',
                      data: [
                          { dia_semana: 'Monday', dia_espanol: 'Lunes', orden: 1, total: 5200, cantidad: 3 },
                          { dia_semana: 'Tuesday', dia_espanol: 'Martes', orden: 2, total: 4800, cantidad: 2 },
                      ],
                      summary: { totalVentas: 10000, promedioDiario: 5000 },
                  },
              };
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(json),
        });
    });

    await page.goto('/cajero');
    await expect(page).toHaveURL(/cajero/);

    await page.getByText('ANALÍTICAS', { exact: true }).first().click();

    await expect(page).toHaveURL(/analytics/);
    await expect(page.locator('body')).toContainText('Ventas Semanales');
    await expect(page.locator('body')).toContainText('Distribución');
    await expect(page.locator('body')).toContainText('A cobrar');
    await expect(page.locator('body')).toContainText('$13.500');
    await expect(page.locator('body')).toContainText('Lunes');
});

test('anfitriona services screen renders its payout summary', async ({ page }) => {
    await bootstrapRoleSession(page, 'anfitriona');

    await page.goto('/anfitriona/servicios');

    await expect(page.locator('body')).toContainText(/servicios/i);
    await expect(page.locator('body')).toContainText(/comisiones por cobrar/i);
});
