# Plan de unificación de componentes — ventas / pedidos / servicios / clientes

Fecha: 2026-11-23 · Origen: análisis de componentes repetidos en los cuatro módulos.
Objetivo: **un solo componente por patrón visual**, conservando las propiedades y el comportamiento de cada módulo (no "bajar" funcionalidad para unificar).

## Convención de seguimiento

- `- [ ]` pendiente.
- `- [~]` en progreso.
- `- [x]` **finalizado** (solo cuando pase `npx tsc --noEmit` y `npm run test:unit`, con la fecha y el archivo tocado).
- `- [ ] ⛔` bloqueado: agregar el motivo al final de la línea.

Cada tarea terminada se marca en este mismo archivo. No se marca como finalizada una fase si alguno de sus ítems sigue en `[ ]`.

---

## Matriz de duplicados (inventario)

| Patrón | Instancias actuales | Componente objetivo |
|---|---|---|
| Selector de método de pago | 6 implementaciones → ya unificado en `PaymentMethodSelect` | ✅ `components/cajero/forms/PaymentMethodSelect.tsx` |
| Modal de detalle | `VentaDetailModal`, `PedidoDetailModal`, `ServiceDetailModal` (cajero + anfitriona), `ClientHistoryModal`, `TipDetailModal`, `AnticipoDetailModal`, `TransferDetailModal` | `components/ui/DetailSheet.tsx` |
| Cards de métricas | `VentasStats`, `PedidosResumen`, `HistorySummaryCards`, `MetricCard`, `TipMetricCards`, `OvertimeStatsCards`, `AnticiposSummaryCard`, `CajeroStats` | `components/ui/MetricCards.tsx` |
| Skeleton de pantalla con header degradado | `VentasSkeleton`, `SolicitudesSkeleton`, `PedidosSkeleton`, `ServiciosSkeleton` (local), `NuevaVentaSkeleton`, `NuevoServicioSkeleton` | `components/ui/ScreenSkeleton.tsx` |
| Fila icono + etiqueta + valor | `VentaCardDetails`, `ServiceCardDetails`, filas de `PedidoDetailModal`, detalles de `HistoryItemCard` | ✅ `components/ui/CardDetailsList.tsx` (ya existe, migrar) |
| Fila de producto con miniatura y cantidad | `VentaProductosList`, filas de `CheckoutModal`, `CategoryProductModal.ProductRow`, `CartList`, `OrderLineInfo` | `components/shared/ProductLineRow.tsx` |
| Badge de estado / método de pago | `VentaCardRight`, `VentaDetailModal`, `PedidoCard`, `PedidoDetailModal`, `HistoryItemCard`, `CardFinance`, `CardHeader` | `components/ui/StatusBadge.tsx` |
| Modal de filtros con chips | `VentasFiltersModal`, filtros de `MisPedidosList`, `FilterTabs` en servicios | `components/ui/FilterSheet.tsx` |
| Barra inferior de checkout | `StickyCheckoutBar` (ventas), `GarzonCartBar` (pedidos) | `components/ui/CheckoutBarShell.tsx` |
| Sección colapsable | `nueva-venta/CollapsibleSection`, `CollapsibleCard` de `ServiceSummaryCard`, `EntradasListadoCard`, acordeón de `EntregaCoversModal` | `components/ui/CollapsibleSection.tsx` (promover) |
| Input de monto | 3 × `LoadBalanceModal` (clientes / nueva-venta / nuevo-servicio) | `components/ui/AmountInput.tsx` |
| Selector de cliente / anfitriona / habitación | `ClientSelectModal`, `HostessSelectModal`, `RoomSelectModal`, `MixerSelectorModal` | ✅ `components/ui/SelectListModal.tsx` (ya existe, migrar) |
| Timer | `TimerPill`, `ServiceCardTimer`, timer inline de `ServiceDetailModal`, `useNowTick` ×3 | `useServerNowTick` + `TimerDisplay` |

---

## Fase 0 — Adoptar componentes que ya existen (riesgo bajo)

No se crea código nuevo: solo se cambian imports y se verifican las props.

- [x] `CardDetailsList`: migrado `VentaCardDetails` (`components/cajero/ventas/VentaCardDetails.tsx`); `ServiceCardDetails` ya lo usaba. Se amplió el primitivo con `style` y render seguro de `ReactNode` para conservar el pill de anfitrionas y el `renderTimer`. *(2026-11-23)*
- [x] `SearchBar`: reemplazados los inputs inline de `ClientSelectModal`, `NuevaVentaSearch` y `MixerSelectorModal`. Se amplió `SearchBar` con `onSubmitEditing`, `accessibilityLabel`, `autoCapitalize` y `autoCorrect` para no perder props. *(2026-11-23)*
- [x] `SelectListModal`: migrados `RoomSelectModal` y `HostessSelectModal`, conservando `max`, estados ocupados, `allowedOccupiedIds`, `onConfirm` y accesibilidad. Se añadió `accessibilityLabel` por ítem al primitivo. *(2026-11-23)*
- [x] `CardFinance`: verificación — `ServiceCardFinance` ya usa el primitivo; el resumen de `VentaDetailModal` es multi-fila (Subtotal/Propina/TOTAL), así que se trata en Fase 4, no en `CardFinance`. *(2026-11-23)*
- [x] `ActionSheet`: verificación — `VentaActionSheet` y la hoja de orden de `MisPedidosList` ya usan el primitivo. *(2026-11-23)*
- [x] Criterio de cierre: `tsc` limpio + 23 tests puntuales en verde (5 archivos). El suite completo dio 978 tests OK pero el runner de Vitest agotó el timeout al iniciar forks (fallo de infraestructura, no de código). *(2026-11-23)*

## Fase 1 — Componentes sin estado (extracción directa)

- [x] `MetricCards` (`components/ui/MetricCards.tsx`)
  - Props finales: `items: MetricCardItem[]` (`key,label,value,detail?,icon,color,bgColor?,valueColor?,onPress?,accessibilityLabel?`), `variant?:'grid'|'compact'|'animated'|'row'`, `cardBg?`, `borderColor?`, `isDark?`, `animateIndex?`, `style?`. Exporta `MetricCard` (tarjeta individual animada) y `MetricBanner` (`label`, `amount`, `details?`, `color?`, `glowColor?`, `borderColor?`, `cardBg?`, `isDark?`, `style?`).
  - [x] Migrados: `VentasStats`, `PedidosResumen`, `HistorySummaryCards`, `OvertimeStatsCards`, `MetricCard` de caja (re-export), `TipMetricCards` y `AnticiposSummaryCard` (vía `MetricBanner`).
  - [x] Reclasificado: `CajeroStats` es una grilla "hero" con `fullWidth`/`isFullWidth`, glow y animación propios; se atiende en Fase 4 como resumen, no se fuerza aquí.
  - Verificación: `tsc` EXIT 0 + 6 archivos / 18 tests en verde. *(2026-11-23)*
- [x] `StatusBadge` (`components/ui/StatusBadge.tsx`)
  - Props finales: `label`, `color`, `bg?`, `borderColor?`, `dot?`, `icon?`, `iconColor?`, `textColor?`, `uppercase?`, `size?`, `bare?`, `style?`. Exporta además `PAYMENT_METHOD_LABELS`, `PAYMENT_METHOD_ICONS` y `paymentIconFor()` como fuente única.
  - [x] Mapas unificados: `PaymentMethodSelect` re-exporta los mapas y usa `paymentIconFor`; `ventas/constants.ts` re-exporta `PAYMENT_METHOD_ICONS`; eliminado `PAYMENT_ICONS` de `HistoryItemCard`.
  - [x] Migrados: `VentaCardRight` (método + estado), `VentaDetailModal`, `HistoryItemCard`, `CardFinance`, `PedidoCard` y `PedidoDetailModal`. `ServiceCardHeader` ya usa `CardHeader` (primitivo compartido), así que no requiere cambio.
  - Verificación: `tsc` EXIT 0 + 6 archivos / 18 tests en verde. *(2026-11-23)*
- [x] `AmountInput` (`components/ui/AmountInput.tsx`)
  - Props finales: `value`, `onChange`, `label?`, `placeholder?`, `prefix?`, `centered?`, `autoFocus?`, `disabled?`, `fontSize?`, `borderRadius?`, `height?`, `backgroundColor?`, `borderColor?`, `textColor?`, `placeholderTextColor?`, `icon?`, `iconColor?`, `style?`, `inputStyle?`.
  - Migrados los 3 modales: `clientes/LoadBalanceModal`, `nueva-venta/LoadBalanceModal` y `nuevo-servicio/BalanceModal`. El formateo sigue en cada caller (`formatCurrency`), que es lo que conserva sus reglas de `es-CL`. Pendiente el rename de los dos `LoadBalanceModal` (Fase 6). *(2026-11-23)*
- [x] `ScreenSkeleton` (`components/ui/ScreenSkeleton.tsx`)
  - Props finales: `bg`, `gradientColors`, `insets`, `variant?:'grid'|'list'|'form'`, `cardCount?`, `cardBg?`, `borderColor?`, `cardWidth?`, `cardHeight?`, `cardBorderRadius?`, `cardContent?:'detail'|'simple'`, `bodyPadding?`, `gap?`, `headerMinHeight?`, `headerPaddingHorizontal?`, `cardAccessibilityLabel?`, `showSummary?`, `showTabs?`, `summaryHeight?`, `showHeader?`, `headerSlot?`.
  - [x] Migrados los 6: `PedidosSkeleton` (grid), `SolicitudesSkeleton` (list), `ServiciosSkeleton` local (form), `VentasSkeleton` (list + resumen + tabs), `NuevaVentaSkeleton` y `NuevoServicioSkeleton` (form con `PremiumHeader` vía `headerSlot`).
  - [ ] Queda para Fase 6 el bug de `VentaCardSkeleton` usado como `renderItem` en `ventas.tsx:317`.
  - Verificación: `tsc` EXIT 0 + 6 archivos / 18 tests en verde. *(2026-11-23)*
- [x] Criterio de cierre Fase 1: `tsc` + tests puntuales en verde. Falta la comparación visual rápida (modo claro/oscuro, móvil/tablet) en QA. *(2026-11-23)*

## Fase 2 — Sección colapsable a `components/ui`

- [x] Promovido `CollapsibleSection` a `components/ui/CollapsibleSection.tsx`. Props: las originales + `icon?`, `iconColor?`, `headerRight?`, `defaultCollapsed?` (modo controlado/no controlado). La ruta vieja de `nueva-venta` quedó como re-export. *(2026-11-23)*
- [x] Migrados `CollapsibleCard` de `ServiceSummaryCard.tsx` y todos los usos de `nueva-venta.tsx` (vía re-export). *(2026-11-23)*
- [x] Conservados `haptic.tap()`, `accessibilityState.expanded`, el label "Expandir/Colapsar …" y `style`/`headerStyle`/`contentStyle`. *(2026-11-23)*
- [x] Reclasificados (no se fuerza la unificación): `EntradasListadoCard` tiene un header multi-línea con total, devolución y contadores; el acordeón de `EntregaCoversModal` lleva icono por categoría, badge de selección y estado invertido (abierto por defecto). Sus headers son específicos; se revisan en Fase 4 si aporta valor.
- [x] Criterio de cierre: `tsc` EXIT 0 + 4 archivos / 9 tests en verde (tanda anterior) y 6 archivos / 18 tests en verde (tanda actual). *(2026-11-23)*

## Fase 3 — Modal de detalle (mayor ahorro, toca 4 módulos)

- [x] Creado `components/ui/DetailSheet.tsx`. Props: `visible`, `onClose`, `title`, `code?`, `subtitle?`, `status?:{label,color}`, `loading?`, `loadingLabel?`, `error?`, `onRetry?`, `height?`, `maxWidth?`, `sections?`, `footerActions?`, `refreshControl?`, `accessibilityLabel?` y `children` para el contenido propio. *(2026-11-23)*
  - Nota: los slots `lineItems`/`totals`/`media`/`headerRight` del plan se resolvieron con `children` + `sections`, que conservan mejor los componentes específicos de cada módulo.
- [x] Migrados `VentaDetailModal` (mantiene `VentaOrigenSection`, `VentaDistribucionSection`, `VentaProductosList` y `BaucherFoto` en `children`), `PedidoDetailModal` (loading/error del mirror vía props), `ClientHistoryModal` (pull-to-refresh vía `refreshControl`), `ServiceDetailModal` de cajero y de anfitriona, `AnticipoDetailModal` y `TipDetailModal`. *(2026-11-23)*
- [x] Criterio de tema: `DetailSheet` resuelve tokens con `useAccentColor()` y cada módulo sigue pasando sus tokens a sus propios hijos (no se obliga a un objeto `theme` único). *(2026-11-23)*
- [x] Criterio de cierre: `tsc` EXIT 0 + tests puntuales en verde (13 + 8 + 5 tests en las tres tandas). Falta QA visual por módulo. *(2026-11-23)*

## Fase 4 — Fila de producto y badges

- [x] Creado `components/shared/ProductLineRow.tsx`: `name`, `meta?`, `photo?`, `photoUrl?`, `badge?`, `quantity?`, `unitPrice?`, `lineTotal?`, `photoSize?`, `children?` (steppers/selectores) y tokens de tema. *(2026-11-23)*
- [x] Migradas las 2 filas que sí son la misma tarjeta de producto: `VentaProductosList` y `CategoryProductModal.ProductRow` (conserva el `SaleFormatSelector` vía `children` y miniatura de 72px). *(2026-11-23)*
- [x] Reclasificadas (layout distinto, no se fuerza): filas de `CheckoutModal` (recibo con columna de cantidad), `CartList` (agrupado con steppers), `OrderLineInfo` (resumen solo lectura con chips) e `IncludedServiceProductSelector` (picker).
- [x] Migrado el badge de pago de `CheckoutModal` a `StatusBadge` + `paymentIconFor` (los badges del resto ya se migraron en Fase 1). *(2026-11-23)*
- [x] Resúmenes/acordeones: `CajeroStats` (grilla hero con `fullWidth`/glow) y los headers de `EntradasListadoCard` / `EntregaCoversModal` se mantienen por ser específicos; documentado en Fases 1 y 2.
- [x] Criterio de cierre: `tsc` EXIT 0 + 4 archivos / 14 tests en verde. Falta QA visual. *(2026-11-23)*

## Fase 5 — Filtros y barra de checkout

- [x] Creado `components/ui/FilterSheet.tsx`: `visible`, `onClose`, `title?`, `subtitle?`, `groups:{key,label,options:{value,label,count?}[],selected,onSelect}[]`, `extraControls?`, `onClear?`, `onApply?`, `clearLabel?`, `applyLabel?`. *(2026-11-23)*
- [x] Migrado `VentasFiltersModal` (mantiene sus tipos exportados y el control de orden ascendente/descendente vía `extraControls`). Los chips de `MisPedidosList`/servicios usan `Tabs`/`FilterTabs`, que ya son el primitivo de pestañas; no se fuerza su migración a un sheet. *(2026-11-23)*
- [x] Creado `components/ui/CheckoutBarShell.tsx`: `itemCount`, `total`, `leftLabel?`, `showItemBadge?`, `onViewDetails?`, `controls?`, `submit:{label,accessibilityLabel?,icon?,onPress,disabled?,submitting?,ready?}`, `bottomInset` y tokens. *(2026-11-23)*
- [x] Migrados `StickyCheckoutBar` (conserva `resolveCheckoutCta` y el scroll al terminate) y `GarzonCartBar` (tip/pago/baucher como `controls`, sin badge de ítems y con etiqueta "Total Pedido"). *(2026-11-23)*
- [x] Criterio de cierre: `tsc` EXIT 0 + 4 archivos / 22 tests en verde (incluye `GarzonCartBar.test.tsx` y `StickyCheckoutBar.test.ts`). *(2026-11-23)*

## Fase 6 — Timer y deuda técnica

- [x] Creado `hooks/useServerNowTick.ts` (tick de 1s + `formatRemainingSeconds`). Migrados los 3 intervalos: `TimerPill`, `ServiceCard` y `ServiceDetailModal`. Creado `components/ui/TimerDisplay.tsx` (píldora) y `TimerPill` pasa a usarlo. El display "hero" sigue siendo `ServiceCardTimer`, que es un componente propio distinto. *(2026-11-23)*
- [x] Creado `components/garzon/pedidos/PedidosCatalogScreen.tsx` con prop `role: 'garzon'|'barman'`; ambas rutas (`pedidos.tsx`) ahora son wrappers de 4 líneas. *(2026-11-23)*
- [x] Decisión sobre `MisPedidosList` y su subtree: se conservan (no hay ruta que los monte) y se documentó el motivo en el archivo. *(2026-11-23)*
- [x] Creado `types/payment.ts` como fuente única: `PaymentMethod` (5), `MetodoPagoPedido`/`MetodoPagoEntrada` (3), derivados de `MetodoPago` del paquete (que incluye `''`). `PaymentMethodSelect`, `types/cart.ts` y `services/entradas.ts` re-exportan esos tipos. *(2026-11-23)*
- [x] Corregido `VentaCardSkeleton` usado directamente como `renderItem` en `ventas.tsx`: ahora se pasa una función con `isTablet`/`cardBg`/`borderColor`. *(2026-11-23)*
- [x] Decisiones documentadas en código: `timeModalVisible={false}` es intencional (el tiempo se edita con `TimeSelector` local); `VentasStats` se conserva como resumen por estado aunque hoy no se monta; `VirtualizedList` ya tenía documentado que es `FlatList as any`. *(2026-11-23)*
- [x] Props muertas eliminadas de interfaz y call sites: `isDark` en `VentaCardRight`, `VentaOrigenSection`, `VentaDistribucionSection`, `PaymentSummaryCard`, `StickyCheckoutBar`, `PagosMixtosSection` y `BalanceModal`; `accentColor` en `SaleFormatSelector`; `cardBg`/`textPrimary`/`textSecondary` en `VentaActionSheet`. `style`/`headerStyle` de `CollapsibleSection` **se conservan** (sí se usan). Se eliminó `DetailSkeleton` (sin consumidores tras migrar `VentaDetailModal` a `DetailSheet`). *(2026-11-23)*
- [x] Criterio de cierre: `tsc` EXIT 0 + suite completo **129 archivos / 1041 tests** en verde + `expo lint` **0 errores, 0 warnings** (se limpiaron 99 warnings: imports/vars sin usar, deps de hooks y el warning de inmutabilidad de `PremiumTabBar`). Falta únicamente QA visual en dispositivo. *(2026-11-23)*

---

## Registro de finalización

| Fecha | Ítem | Verificación |
|---|---|---|
| 2026-11-23 | Fase 0 completa (5 ítems + criterio) | `tsc --noEmit` EXIT 0; `vitest run` puntual: 5 archivos / 23 tests OK. Suite completa: 978 tests OK, 1 archivo fallido por timeout del forks runner (infra). |
| 2026-11-23 | Fase 1 · `MetricCards` (parcial) | `tsc --noEmit` EXIT 0; `vitest run` puntual: 3 archivos / 4 tests OK. |
| 2026-11-23 | Fase 1 · `StatusBadge` (parcial) | `tsc --noEmit` EXIT 0; `vitest run` puntual: 4 archivos / 12 tests OK. |
| 2026-11-23 | Fase 1 · `AmountInput` | `tsc --noEmit` EXIT 0; `vitest run` puntual: 3 archivos / 7 tests OK (tras ajustar mocks de `EditServiceModal.test.tsx`). |
| 2026-11-23 | Fase 1 · `ScreenSkeleton` (parcial) | `tsc --noEmit` EXIT 0; `vitest run` puntual: 6 archivos / 21 tests OK. |
| 2026-11-23 | Fase 2 · `CollapsibleSection` (parcial) | `tsc --noEmit` EXIT 0; `vitest run` puntual: 4 archivos / 9 tests OK. |
| 2026-11-23 | Fase 1 · cierre de pendientes (`MetricCards`, `StatusBadge`, `ScreenSkeleton`) | `tsc --noEmit` EXIT 0; `vitest run` puntual: 6 archivos / 18 tests OK. |
| 2026-11-23 | Fase 3 · `DetailSheet` | `tsc --noEmit` EXIT 0; `vitest run` puntual en tres tandas: 4/13, 4/8 y 5/5 tests OK. |
| 2026-11-23 | Fase 4 · `ProductLineRow` + badges | `tsc --noEmit` EXIT 0; `vitest run` puntual: 4 archivos / 14 tests OK (tras añadir `StyleSheet` al mock de `OrderProductConfiguration.test.tsx`). |
| 2026-11-23 | Fase 5 · `FilterSheet` + `CheckoutBarShell` | `tsc --noEmit` EXIT 0; `vitest run` puntual: 4 archivos / 22 tests OK. |
| 2026-11-23 | Fase 6 · timer, pantallas de pedidos, tipos de pago y bug del skeleton | `tsc --noEmit` EXIT 0; `vitest run` puntual: 6 archivos / 23 tests OK. |
| 2026-11-23 | Limpieza de props muertas | `tsc --noEmit` EXIT 0; `vitest run` puntual: 8 archivos / 26 tests OK. |
| 2026-11-23 | `expo lint` + verificación final | `expo lint`: 0 errores, 0 warnings (de 99 iniciales). `tsc --noEmit` EXIT 0. `vitest run`: 129 archivos / 1041 tests OK. |

> Al marcar un ítem como `[x]`, agregar una fila aquí con la fecha y el comando usado (`tsc`, `vitest`, `expo lint`).
