import { expect, Page, test } from '@playwright/test'

const todayKey = new Date().toDateString()

const cajeroUser = {
  id: '1',
  name: 'Carla',
  lastName: 'Caja',
  email: 'carla@lasmunecasderamon.com',
  role: 'cajero',
  foto: '',
  username: 'carla.caja',
}

const room = {
  id_habitacion: 'r1',
  nombre: 'VIP 1',
  precio: 30000,
  tiempo: 60,
  precio_habitacion: 30000,
  comision_anfitriona: 0,
}

const anfitriona = {
  id_usuario: '3',
  nick: 'ana',
  nombre: 'Ana Fitriona',
}

const cliente = {
  id_cliente: 'c1',
  nombre: 'Juan',
  apellido: 'Perez',
  saldo: 50000,
}

const product = {
  id_producto: 'p1',
  nombre: 'Whisky',
  precio: 25000,
  comision: 0,
  commission: 0,
}

const category = {
  id: '10',
  name: 'Bebidas',
  total_products: 1,
}

async function mockAllApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api', '')
    const method = route.request().method()

    if (path === '/auth/login' && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'e2e-token',
          user: cajeroUser,
          asistenciaRegistrada: false,
        }),
      })
    }

    if (path === '/auth/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: cajeroUser } }),
      })
    }

    if (path === '/sales' && method === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Venta procesada',
          data: { id_venta: 'v1', codigo: 'V001', total: 50000, estado: 1 },
        }),
      })
    }

    if (path === '/servicios' && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          id: 's1',
          codigo: 'SRV-001',
          total: 50000,
          estado: 1,
        }),
      })
    }

    if (path.startsWith('/sales')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    }

    const staticResponses: Record<string, unknown> = {
      '/caja/stats': { success: true, data: { ventas: 0, cuentas: 0, servicios: 0, caja: 1 } },
      '/solicitudes-servicios/pending-count': { success: true, data: { count: 0, serviciosCount: 0, pedidosCount: 0 } },
      '/users/status': { success: true, data: { status: 1, estado_servicio: 1, user: { id: '1', nick: 'test', name: 'Test', role: 'cajero', foto: '' } } },
      '/events/user': { success: true, data: [] },
      '/events/stats': {
        success: true,
        data: { weeklyIncome: [], badges: [], totalEarnings: 0, svcCount: 0 },
      },
      '/cashregister/status': { success: true, data: { hasOpenCaja: true } },
      '/categories': { success: true, data: [category] },
      '/products': { success: true, data: [product] },
      '/anfitrionas': { success: true, data: [anfitriona] },
      '/rooms': { success: true, data: [room] },
      '/clients': { success: true, data: [cliente] },
      '/servicios/user': { success: true, data: [] },
    }

    const resp = staticResponses[path] ?? { success: true, data: [] }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(resp),
    })
  })
}

test.describe('Login + user flows', () => {
  test('logs in with valid nick + password and redirects to role home', async ({ page }) => {
    await mockAllApi(page)
    await page.goto('/login')

    await expect(page.locator('body')).toContainText('Iniciar Sesión')

    await page.getByPlaceholder('pepe').fill('carla.caja')
    await page.getByPlaceholder('Ingresa tu contraseña').fill('secret123')

    const loginBtn = page.locator('text=Iniciar Sesión').last()
    await loginBtn.click()

    await expect(page).toHaveURL(/cajero/, { timeout: 20000 })
    await expect(page.locator('body')).toContainText(/ventas/i)
  })

  test('nueva-venta page loads categories and main UI elements', async ({ page }) => {
    await mockAllApi(page)
    await page.addInitScript(
      ({ seededUser, seededTodayKey }) => {
        window.localStorage.setItem('token', 'e2e-token')
        window.localStorage.setItem('user', JSON.stringify(seededUser))
        window.localStorage.setItem('biometricEnabled', 'false')
        window.localStorage.setItem('asistenciaModalShown', seededTodayKey)
      },
      { seededUser: cajeroUser, seededTodayKey: todayKey },
    )

    await page.goto('/cajero/nueva-venta')

    await expect(page.locator('body')).toContainText('Nueva Venta', { timeout: 15000 })
    await expect(page.locator('body')).toContainText('Bebidas')

    const categoryBtn = page.getByRole('button', { name: /categoría bebidas/i })
    await expect(categoryBtn).toBeVisible()

    await categoryBtn.click()

    await expect(page.locator('body')).toContainText('Whisky', { timeout: 10000 })
  })

  test('nuevo-servicio page loads room selector and form', async ({ page }) => {
    await mockAllApi(page)
    await page.addInitScript(
      ({ seededUser, seededTodayKey }) => {
        window.localStorage.setItem('token', 'e2e-token')
        window.localStorage.setItem('user', JSON.stringify(seededUser))
        window.localStorage.setItem('biometricEnabled', 'false')
        window.localStorage.setItem('asistenciaModalShown', seededTodayKey)
      },
      { seededUser: cajeroUser, seededTodayKey: todayKey },
    )

    await page.goto('/cajero/nuevo-servicio')

    await expect(page.locator('body')).toContainText('Nuevo Servicio', { timeout: 15000 })
    await expect(page.locator('body')).toContainText('Habitación')
    await expect(page.locator('body')).toContainText('Anfitrionas')
  })
})
