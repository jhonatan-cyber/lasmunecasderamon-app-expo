# Plan de Refactor

Objetivo: reducir duplicación, separar responsabilidades y bajar el costo de mantenimiento de la app sin cambiar el comportamiento visible.

## Estado general

- Fase 1: completada
- Fase 2: completada
- Fase 3: en progreso
- Fase 4: pendiente
- Fase 5: pendiente
- Fase 6: pendiente

## Avance actual

- Fase 1:
  - API separada en módulos pequeños.
  - `api/client.ts` quedó como fachada.
- Fase 2:
  - SSE y eventos compartidos unificados.
  - Normalización de rol centralizada.
- Fase 3:
  - Completado: `cuentas.tsx`, `ventas.tsx`, `solicitudes.tsx`.
  - En progreso: `nueva-venta.tsx` con modales de categoría, tiempo, carga de saldo y anfitrionas extraídos.
  - Pendiente: `nuevo-servicio.tsx`, `garzon/servicios.tsx`.
  - Pendiente de pulido: componentes hijos y helpers extra de las pantallas ya refactorizadas.

## Fase 1: Infraestructura de API

Objetivo:
- simplificar `api/client.ts`
- aislar resolución de URL base
- aislar errores de red
- centralizar retry, timeout y logging

Archivo foco:
- [api/client.ts](./api/client.ts)

Tareas:
- extraer `getBaseUrl` a un módulo dedicado
- extraer clases de error a `api/errors.ts`
- extraer retry/timeout a utilidades pequeñas
- mover el manejo de token a una capa explícita
- dejar `apiClient` como orquestador liviano

Resultado esperado:
- menos riesgo al tocar red
- mejores pruebas unitarias
- más claridad al depurar errores de conexión

## Fase 2: Tiempo real y eventos compartidos

Objetivo:
- unificar SSE y eventos del sistema
- reducir lógica duplicada entre contextos y overlays

Archivos foco:
- [context/NotificationContext.tsx](./context/NotificationContext.tsx)
- [context/TimerContext.tsx](./context/TimerContext.tsx)
- [context/SalesContext.tsx](./context/SalesContext.tsx)
- [components/shared/StaffCallOverlay.tsx](./components/shared/StaffCallOverlay.tsx)
- [components/cajero/GlobalTimerAlert.tsx](./components/cajero/GlobalTimerAlert.tsx)

Tareas:
- crear un bus o hook compartido para eventos SSE
- normalizar payloads por tipo de evento
- centralizar el mapeo de roles de usuario
- separar navegación, notificación y refresh de datos

Resultado esperado:
- menos `DeviceEventEmitter` disperso
- menos handlers duplicados
- comportamiento más consistente entre pantallas

## Fase 3: Pantallas grandes

Objetivo:
- partir archivos monolíticos en componentes, hooks y helpers más pequeños

Archivos foco:
- [app/(app)/cajero/cuentas.tsx](./app/(app)/cajero/cuentas.tsx)
- [app/(app)/cajero/ventas.tsx](./app/(app)/cajero/ventas.tsx)
- [app/(app)/cajero/nueva-venta.tsx](./app/(app)/cajero/nueva-venta.tsx)
- [app/(app)/cajero/nuevo-servicio.tsx](./app/(app)/cajero/nuevo-servicio.tsx)
- [app/(app)/cajero/solicitudes.tsx](./app/(app)/cajero/solicitudes.tsx)
- [app/(app)/garzon/servicios.tsx](./app/(app)/garzon/servicios.tsx)

Tareas:
- extraer reducers y estado inicial a módulos separados
- mover selectores y cálculos a helpers puros
- partir modales, cards y listas en componentes hijos
- sacar lógica de fetch y mutación a hooks por pantalla

Resultado esperado:
- archivos más cortos
- render más legible
- menor complejidad al corregir bugs

## Fase 4: Tipos y modelos de dominio

Objetivo:
- disminuir `any`
- centralizar tipos y normalización de datos

Archivos foco:
- [packages/types](./packages/types)
- [hooks](./hooks)
- [components](./components)

Tareas:
- definir tipos de dominio para usuario, servicio, venta, cuenta, solicitud y timer
- crear mappers desde API hacia modelos internos
- reemplazar `any` por tipos concretos o `unknown` con narrowing
- agregar helpers para `role`, `estado` y `metodo_pago`

Resultado esperado:
- menos casts manuales
- mejor autocompletado
- menos regresiones por cambios de API

## Fase 5: Componentes reutilizables

Objetivo:
- reducir duplicación visual y de comportamiento

Archivos foco:
- [components/ui](./components/ui)
- [components/shared](./components/shared)
- [components/cajero/forms](./components/cajero/forms)

Tareas:
- revisar componentes que mezclan UI con reglas de negocio
- extraer helpers de render repetidos
- normalizar wrappers de carga, skeletons y estados vacíos
- revisar componentes con casts innecesarios

Resultado esperado:
- composición más limpia
- componentes más predecibles
- menos estilos y lógica repetida

## Fase 6: Validación

Objetivo:
- asegurar que cada refactor mantenga el comportamiento

Checklist:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm doctor`
- smoke test web
- prueba manual de login, notificaciones, timers y flujos de cajero

## Prioridad sugerida

1. Infraestructura de API
2. Tiempo real y eventos compartidos
3. Pantallas grandes
4. Tipos y modelos de dominio
5. Componentes reutilizables
6. Validación continua

## Riesgos conocidos

- `api/client.ts` es un punto sensible porque toca todas las pantallas.
- Los contextos de SSE pueden introducir efectos secundarios si se tocan sin una estrategia común.
- Las pantallas grandes tienen muchas dependencias cruzadas, así que conviene partirlas en cambios pequeños.
- La migración de `any` a tipos reales puede revelar inconsistencias de backend que hoy están ocultas.

## Regla de trabajo

- Hacer cambios pequeños y verificables.
- No mover varias responsabilidades a la vez si comparten un mismo flujo crítico.
- Después de cada fase, correr validaciones y registrar el resultado.
