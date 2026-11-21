# Auditoría UI/UX — lasmunecasderamon-app (Expo)

Fecha: 2026-11-20 · Método: auditoría estática de código (lectura + mediciones con grep sobre `app/` y `components/`).
Alcance: 313 archivos `.tsx` en `app/` + `components/`, 44 componentes en `components/ui/`, tokens y stores de tema.

> Todo hallazgo cita `archivo:línea`. Los conteos se obtuvieron con mediciones reproducibles sobre el árbol de
> archivos actual, no por inspección visual. **No se ejecutó la app**: los comportamientos en runtime (doble toque,
> solapamiento visual) están inferidos de la semántica documentada de React Native y marcados como tales.

---

## 1. Resumen ejecutivo

La app tiene una base sólida: sistema de contraste WCAG verificado por test, tokens responsivos centralizados,
`AppModal` con manejo de teclado y foco, un `LoginForm` con accesibilidad ejemplar, y un rediseño de Servicios ya
implementado y alineado con los mockups de `design-servicios/`.

El problema no es la calidad de las piezas sino **laintegration**: el sistema de diseño existe y se usa solo en una
fracción de la app. Tres sistemas de color conviven, las fuentes de marca se aplican en 23 de 313 archivos, y la
librería UI tiene 3 envoltorios de modal y 3 APIs de tabs distintas. Sobre esa base hay un handful de bugs reales
— uno de ellos hace que el botón "atrás" de Android **ejecute** la acción de un diálogo de confirmación.

**Los 5 hallazgos de mayor impacto:**

| # | Hallazgo | Impacto |
|---|---|---|
| 1 | `PremiumAlert.tsx:68` — `onRequestClose={onCancel ?? onConfirm}`: el botón atrás de Android confirma la acción | **Bug funcional** |
| 2 | Solo 23/313 archivos usan Inter/Playfair; 167 usan `fontWeight` sin `fontFamily` → tipografía del sistema | **Identidad de marca rota** |
| 3 | 999 colores hex hardcodeados en 170/313 archivos + 3 sistemas de color en paralelo | **Modo oscuro / acento rotos** |
| 4 | `ErrorState` existe y nunca se usa (0 usos); el error inline usa `#FEF2F2`/`#B91C1C` (solo claro) | **Dark mode + a11y** |
| 5 | `OrderCreateSchema` definido y con 0 usos en todo el repo; `useNuevaVenta.ts` no importa `validations` | **Flujo de dinero sin validar** |

---

## 2. Lo que ya está bien (no tocar)

Para que la priorización no arrase trabajo bien hecho:

- **Contraste WCAG con test automático.** `docs/CONTRASTE_ACCESIBILIDAD.md` + `tests/unit/theme/contraste.test.ts`
  verifican los 11 acentos × 2 modos. `useAccentColor.ts:58-71` aplica `ensureContrast` para `accentUi` (3:1) y
  `accentOnSurface` (4.5:1). Es un sistema mejor que el de la mayoría de apps de su tamaño.
- **Tokens responsivos sinmagic numbers sueltos.** `constants/spacing.ts` + `utils/responsive.ts` concentran toda la
  escala; la regla de tablet vive en `isTabletSize` (lado corto), no en `width >= 768` dispersos.
- **`AppModal`** (`components/ui/AppModal.tsx`): `KeyboardAvoidingView` con `behavior` correcto por plataforma,
  `accessibilityViewIsModal`, `onRequestClose` por defecto, `NotificationBanner` montado en la capa del modal.
- **`LoginForm`** (`components/auth/LoginForm.tsx`): `accessibilityRole`/`Label`/`State` en cada control, `hitSlop`,
  `autoComplete`/`textContentType`, `returnKeyType`, toggle de contraseña, error con `accessibilityRole="alert"` +
  `accessibilityLiveRegion="polite"` y animación de shake. Es el estándar al que el resto debería subir.
- **Un solo sistema de diálogo.** `Alert.alert` tiene **0 usos**; todo pasa por `PremiumAlert`. Consistencia real.
- **Rediseño de Servicios ya implementado.** `components/screens/ServiciosScreen.tsx` + `components/cajero/servicios/*`
  reproducen el mockup `design-servicios/00-combined.png`: header con pestañas Activos/Finalizados, card con
  pill de estado, "tiempo restante" con barra de progreso, `tabular-nums`, FAB. `ServiceCardTimer.tsx:41-42`
  expone `accessible` + `accessibilityLabel`.
- **Plan de mejoras previo ya avanzado.** `docs/PLAN_MEJORAS_2026-10-07.md` cubre fases 0-4 con la mayoría de
  casillas marcadas; las fases de arquitectura/performance ya están addressed.

---

## 3. Hallazgos P0 — bugs de UX con impacto directo

### 3.1 `onRequestClose` del diálogo puede confirmar la acción — `components/ui/PremiumAlert.tsx:68` y `:80`

```tsx
onRequestClose={onCancel ?? onConfirm}          // línea 68
onPress={() => (onCancel ?? onConfirm)?.()}      // línea 80 (la "X")
```

En Android, el botón físico "atrás" dispara `onRequestClose`. Con `onCancel ?? onConfirm`, cuando la alerta no
recibe `onCancel` **atrás y la "X" ejecutan la acción confirmada**.

**Gravedad real (verificada sobre los 20 call sites):** las 18 alertas con acción destructiva —anular entradas
(`CoversScreen`), vaciar carrito (`GarzonProductosModales`), descartar venta (`nueva-venta`), pagar nómina
(`pagos`), aprobar/rechazar anticipo (`anticipos-admin`), desvincular pantalla (`ConfiguracionAsistenciaScreen`)—
**sí pasan `onCancel`**, así que atrás descartaba correctamente. El defecto alcanzaba a las 2 alertas que no lo
pasan, ambas informativas (`GlobalTimerAlert.tsx`, `PremiumLiquidationCard.tsx`), donde confirmaba era inofensivo.

El riesgo real es **latente**: cualquier llamada futura a `PremiumAlert` sin `onCancel` hereda el fallo, y la
"X" —que se lee como "cerrar"— ejecuta la acción.

**Corrección:** `onRequestClose` y la "X" llaman a `onDismiss ?? onCancel`, nunca a `onConfirm`; si no hay forma
de descartar, la "X" se oculta en vez de quedar como botón inerte. Se añadió además un bloqueo temporal de
doble toque en la confirmación.

### 3.2 `ActionSheet`: el overlay es *padre* del sheet — `components/ui/ActionSheet.tsx:47-48`

El `Pressable` del overlay envuelve al sheet como hijo. Los ítems capturan su propio toque, pero un toque en zona
no interactiva (título, subtítulo, padding) alcanza al padre y **cierra el sheet**. El patrón correcto ya existe en
la misma librería: `ModalBottomSheet.tsx:50-56` usa un `Pressable` hermano con `StyleSheet.absoluteFill`.

**Corrección:** replicar el patrón de `ModalBottomSheet` en `ActionSheet`.

### 3.3 `SelectListModal` renderiza el botón de confirmar siempre — `components/ui/SelectListModal.tsx:105`

```tsx
{(onConfirm || true) && ( ... )}
```

Condición siempre verdadera. El botón "Confirmar" se renderiza incluso sin `onConfirm`.

### 3.4 `SelectListModal` nunca rastrea la selección — `components/ui/SelectListModal.tsx:93`

`renderContent(false, ...)` está hardcodeado. El componente **documenta** que maneja el estado de selección
(comentario en la línea 35) pero nunca lo hace: lo seleccionado nunca se resalta.

### 3.5 `SelectListModal` sin teclado amigable — `components/ui/SelectListModal.tsx:73`

Su `ScrollView` no define `keyboardShouldPersistTaps` ni `keyboardDismissMode`, que `ModalBottomSheet.tsx:98-99`
sí define. Con el teclado abierto, el primer toque se consume dismissing el teclado en vez de seleccionar el ítem.

### 3.6 Los sheets no respetan el safe-area inferior — `ModalBottomSheet.tsx:137`, `SelectListModal.tsx:131`, `ActionSheet.tsx:103`

`paddingBottom: 24` / `padding: 24` / `paddingBottom: 40` fijos, sin `useSafeAreaInsets`. En iPhone con indicador
de inicio, el botón de acción principal queda parcialmente bajo el gesto del sistema. Solo 12 archivos de la app
usan `useSafeAreaInsets`, y ninguno de estos tres lo hace.

### 3.7 `ErrorState` existe y no se usa nunca

`components/ui/ErrorState.tsx` es un componente completo con icono, mensaje, `accessibilityLiveRegion` y botón
**"Reintentar"** (`ErrorState.tsx:45-58`). Búsqueda en todo `app/` + `components/`: **0 usos** (la única coincidencia
de `<ErrorState` es su propia declaración).

En su lugar, cada pantalla inventa su propio error. Ejemplo en `app/(app)/anfitriona/(tabs)/servicios.tsx`:

```tsx
errorCard: { backgroundColor: "#FEF2F2", borderColor: "#FEE2E2" },
errorText: { color: "#B91C1C" },
retryButton: { backgroundColor: "#B91C1C" },   // + Text color "#FFF"
```

Consecuencias: (a) en **modo oscuro** la tarjeta de error es un recuadro rosa claro; (b) el botón "Reintentar"
no tiene `accessibilityRole` ni `accessibilityLabel`; (c) 3 colores hardcodeados por pantalla en lugar de uno
compartido.

**Corrección:** usar `ErrorState` en las pantallas con error y eliminar las implementaciones inline.

### 3.8 `OrderCreateSchema` definido y nunca usado

`packages/validations/src/index.ts` exporta `OrderCreateSchema` con validaciones)”, `.min(1, "Codigo es requerido")`,
refinamientos de acompañamientos, comisiones y foto de baucher. Búsqueda en **todo el repo** (app, components, hooks,
utils, services, tests, packages): **0 usos**.

`hooks/useNuevaVenta.ts` (34 KB, el flujo de venta más importante) **no importa** `@lasmunecasderamon/validations`.
`hooks/useLogin.ts` importa `resetPasswordSchema` pero no `loginSchema` (0 usos).

El schema existe, está escrito y probado — simplemente nunca se conectó al flujo que describe.

**Corrección:** validar el payload de venta con `OrderCreateSchema` antes de enviarlo, y `loginSchema` en el login.

---

## 4. Hallazgos P1 — problemas sistémicos

### 4.1 Las fuentes de marca se aplican en 7 % de los archivos

Medición sobre 313 `.tsx`:

| Métrica | Valor |
|---|---|
| Archivos que usan `fontFamily` (Inter/Playfair) | **23** |
| Archivos con `fontWeight` y **sin** `fontFamily` | **167** |
| Archivos con ambos (riesgo de negrita duplicada en Android) | 8 |
| Ocurrencias de `fontWeight` en archivos sin `fontFamily` | **935** |

`constants/fonts.ts` documenta la intención con claridad ("Inter es la voz de la interfaz… Playfair Display para los
títulos de marca") y advierte que mezclar `fontFamily` con `fontWeight` hace que Android **sintetice negrita sobre
negrita**. En la práctica, el 53 % de los archivos renderiza en la fuente del sistema (Roboto/SF) y el título de marca
en Playfair aparece en ~23 componentes.

Ej.: `components/cajero/servicios/ServiceCardTimer.tsx:73-89` usa `fontSize` + `fontWeight: '900'` **sin**
`fontFamily` → el "tiempo restante" se ve en la fuente del sistema, no en Inter Black.

**Corrección:** definir los pesos en `FontFamily` (ya existen: `regular`…`black`) y replacing `fontWeight: 'X'` por
`fontFamily: FontFamily.<peso>` en los 167 archivos. Es mecánico y de bajo riesgo visual por archivo.

### 4.2 Tres sistemas de color en paralelo

| Sistema | Ubicación | Estado real |
|---|---|---|
| `useAccentColor()` | `hooks/useAccentColor.ts` | **El real** — acento del usuario, contraste, degradados |
| `Colors.light/dark` | `constants/theme.ts:6-65` | Semi-muerto: 3 importadores (`ResetPasswordModal`, `ServiciosScreen`, `use-theme-color`) |
| `utils/colors.ts` | `rotateColor` / `generateAnalogousPalette` | 1 uso (`PropinasScreen.tsx:21`) |

`Colors.light.accent` es **estático** (`#E11D48`) y nunca refleja el acento elegido por el usuario. Quien importa
`Colors` queda siempre en rojo aunque el usuario haya elegido Violeta o Esmeralda.

**Hardcoded colors:** 999 hex en 170/313 archivos; en `components/ui/` son 87 ocurrencias en 18 de 44 componentes
(41 % de la librería).

Casos concretos con impacto visible:
- `AppErrorBoundary.tsx:71` usa `useColorScheme()` de React Native en vez de `store/appearanceStore.ts` → **la
  pantalla de error ignora el tema manual** de la app.
- `NotificationBanner.tsx:36` fija `'#E11D48'` para el aviso de pedido → rojo aunque el acento sea otro.
- `LazyQRCode.tsx:41` (`#F1F5F9`) y `LazyDonutChart.tsx:17,20` son **solo-claro** → placeholder casi blanco en oscuro.
- `ErrorState.tsx:39` usa `#EF4444` (valor claro) donde `constants/theme.ts:52` define `#F87171` para oscuro.
- **Dos amarillos distintos para el mismo estado:** `OvertimeCard.tsx:81` usa `#F59E0B` siempre; `AdvanceCard.tsx:72`
  usa `#FBBF24` en oscuro. "Pendiente" se ve diferente en Horas Extras vs Anticipos.

**Corrección:** hacer `useAccentColor` la única fuente; borrar `constants/theme.ts` y `utils/colors.ts`; migrar los 999
hex a tokens.

### 4.3 `accentColor` como texto sin garantía de contraste — 334 lugares en 137 archivos

Deuda ya documentada en `docs/CONTRASTE_ACCESIBILIDAD.md` ("Deuda conocida") y **sin migrar**.

| Métrica | Valor |
|---|---|
| Ocurrencias de `color: accentColor` / `color={accentColor}` | **334** |
| Archivos afectados | **137** de 313 (44 %) |

Mayores concentrations:

```
components/screens/AsistenciaScreen.tsx          6
components/screens/PropinasScreen.tsx            4
components/screens/AnticiposScreen.tsx           4
components/screens/HorasExtrasScreen.tsx         3
components/screens/ServiciosScreen.tsx           3
components/shared/PremiumProfileView.tsx         9
```

`accentColor` es un color **de fondo**. Usado como texto puede quedar por debajo de 4.5:1 (Esmeralda 4.62, Naranja
4.57, Cian 4.51, Ámbar 4.69 — todos justo sobre el umbral, y cualquier fondo distinto lo baja). El token correcto
ya existe: `accentOnSurface` (`useAccentColor.ts:68-71`).

> Nota de método: una primera medición con `Select-String -Path "...\**\*.tsx"` dio 106/50 porque ese glob no
> recorre directorios anidados de forma fiable en PowerShell. Las cifras de este informe usan
> `Get-ChildItem -Recurse | Select-String`. El mismo error inflaba o reducía los conteos de componentes; los
> conteos de archivos (313 `.tsx`, 999 hex, 23 con `fontFamily`) siempre usaron el método correcto.

### 4.4 La barra de tabs es absoluta y no hay spacer — `components/ui/PremiumTabBar.tsx:163`

```tsx
tabBarWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, ... }
```

Al ser absoluta, el navigator no reserva espacio: **el contenido queda bajo la barra**. La compensación se hace con
un número mágico:

- `paddingBottom: 100` en **10 pantallas** (`AnalyticsScreen`, `AnticiposScreen`, `AsistenciaScreen`, `CoversScreen`,
  `FinancialEventsScreen`, `HomeScreen`, `HorasExtrasScreen`, `PropinasScreen`, `ResumenScreen`, `ServiciosScreen`).
- El resto de pantallas usan 14/16/20/24/25/28/32/40 → **no compensan**, su último ítem queda tapado.

Y el FAB calcula con otro número aparte: `PremiumFAB.tsx:21` `const TAB_BAR_HEIGHT = 80;` ("altura aproximada").
La barra real es `minHeight: 60 + insets.bottom` (`PremiumTabBar.tsx:82-83`):
- iPhone con indicador (inset 34) → real 94 → el FAB queda 14 px **bajo** la barra.
- Android sin inset / tablet → real 60 → el FAB **flota** 20 px.

Además `ServiciosScreen.tsx:658-668` monta `<PremiumFAB>` **sin** `withTabBar`, mientras `AnticiposScreen.tsx:386`
sí lo pasa. La prop existe precisamente para esto y se usa en 1 de 2 casos.

**Corrección:** exportar `TAB_BAR_HEIGHT` desde un único lugar (o medirlo con `onLayout`), añadir un spacer, y
eliminar los `paddingBottom: 100` a mano.

### 4.5 Duplicación en la librería UI

| Grupo | Archivos | Solapamiento |
|---|---|---|
| Modales | `ModalBottomSheet`, `SelectListModal`, `ActionSheet` | overlay + header + cerrar + acción, duplicados casi línea a línea |
| Skeletons | `Skeleton.tsx`, `SkeletonLoader.tsx` | mismo archivo en la práctica: mismas props, mismo `withRepeat(withTiming(1,1500))`, mismo `LinearGradient`; solo difieren en el rango del shimmer y el color base |
| Tabs | `Tabs`, `FilterTabs`, `PremiumHeader:219-255`, `PremiumTabBar` | `FilterTabs` es solo un wrapper de `Tabs` con `variant="pills"` fijo |
| Diálogos | `PremiumAlert`, `OnboardingTour` | mismo overlay `rgba(0,0,0,0.6)` + card + `elevation: 20` |
| Headers | `PremiumHeader`, `PremiumHeaderActions` | ambos exponen el toggle de tema con `accessibilityLabel="Cambiar tema"` |

### 4.6 APIs inconsistentes para el mismo concepto

- **Pestañas:** `activeKey`/`onChange` (`Tabs.tsx:31-32`), `activeKey`/`onTabPress` (`FilterTabs.tsx:13-14`),
  `activeTab`/`onTabChange` (`PremiumHeader.tsx:31-32`).
- **Acción principal:** `actionLabel`/`onAction` (`ModalBottomSheet`), `confirmLabel`/`onConfirm` (`SelectListModal`),
  `confirmText`/`onCancel` (`PremiumAlert`), `retryLabel`/`onRetry` (`ErrorState`), `actionLabel`/`onAction` (`EmptyState`).
- **Color por props vs hook interno:** `CardHeader`, `CardFinance`, `CardDetailsList` y `Tabs` exigen que el padre
  inyecte `accentColor`/`cardBg`/`textSecondary`/`borderColor`; el resto de la librería lo resuelve sola con `useAccentColor`.
- **Estados:** `IconButton` expone `disabled` + `accessibilityState`; `ActionSheet`/`SelectListModal` tienen
  `disabled` **sin** `accessibilityState`; `AnimatedButton` acepta `disabled` pero **no cambia la opacidad**
  (`AnimatedButton.tsx:24,57`) → el estado deshabilitado es invisible; `PremiumAlert` no tiene estado de carga →
  doble toque posible en `onConfirm` (`PremiumAlert.tsx:107`).

### 4.7 Accesibilidad: cobertura del 31 %

- 382 atributos a11y en total, repartidos en **96 de 313 archivos** → 217 archivos sin ninguno.
- ~**229 de 367** `Pressable`/`Touchable*` sin `accessibilityRole` equivalente.
- Objetivo táctil (44 px, `constants/spacing.ts:67`): violaciones reales en `AppErrorBoundary.tsx:92`
  (`paddingVertical: 12` ≈ 40 px, sin `hitSlop`) y `PremiumHeader.tsx:142-153` (migas de pan de ~16-20 px).
- `ProgressBar.tsx` **no** tiene `accessibilityRole="progressbar"` ni `accessibilityValue` — el porcentaje solo existe
  como texto.
- Controles sin etiquetar: `TimeSelector.tsx:42,60` (botones −/+), `ActionSheet.tsx:60,80`,
  `SelectListModal.tsx:81` (ítems sin `selected`), `AppErrorBoundary.tsx:50,56`, `ModalBottomSheet.tsx:109`.

### 4.8 Reduced-motion ignorado en el 92 % de las animaciones

50 archivos con animación; solo **4** respetan `useReducedMotion` (`AnimatedView`, `AnimatedScreen`, `ProgressBar`,
`OnboardingTour`). Los 46 restantes — incluidos `Skeleton`, `SkeletonLoader`, `AnimatedButton`, `AnimatedNumber`,
`NotificationBanner`, `DonutChart`, `QRScannerModal`, `OfflineStatusBanner` — lo ignoran.

Además `AnimatedView.tsx:121-141` declara el `useEffect` con `}, [reducedMotion])` y un `eslint-disable` de las
dependencias: **si cambian `from`/`animate`/`transition` después del montaje, la animación no se vuelve a ejecutar.**

### 4.9 Dos pantallas "Servicios" distintas

| | `components/screens/ServiciosScreen.tsx` | `app/(app)/anfitriona/(tabs)/servicios.tsx` |
|---|---|---|
| Roles | cajero, barman, garzón | anfitriona |
| Pestañas | Activos / Finalizados | Todos / En Proceso / Finalizados / Anulados |
| Modal de detalle | `components/cajero/servicios/ServiceDetailModal` | `components/anfitriona/ServiceDetailModal` |
| Implementación | compartida, con paginación (100/pág.) | **propia, duplicada** |

La versión de anfitriona reimplementa filtros, búsqueda, lista, modal, error y alert. Es el mismo concepto con dos
nombres de ruta (`ServiciosScreen` vs `Screen`), dos vocabularios de estado y dos comportamientos.

---

## 5. Hallazgos P2 — consistencia y pulido

| Hallazgo | Ubicación |
|---|---|
| `VirtualizedList` es `FlatList as any`; se le pasan props de FlashList (`estimatedItemSize`) que FlatList ignora | `components/shared/VirtualizedList.ts:13` |
| `Alert.alert` = 0 usos pero `PremiumAlert` y `AppModal` manejan el "atrás" de forma distinta | `PremiumAlert.tsx:68` vs `AppModal.tsx:43` |
| Estilos muertos: `emptyCard`/`emptyText` definidos y no usados (el componente usa `EmptyState`) | `app/(app)/anfitriona/(tabs)/servicios.tsx` (styles) |
| Nomenclatura divergente: la tab dice "Extras", la pantalla dice "Horas Extras" | `(tabs)/_layout.tsx` vs `cajero/_layout.tsx:83` |
| `style?: any` en `EmptyState`/`ErrorState` frente a `StyleProp<ViewStyle>` en el resto | `EmptyState.tsx:17`, `ErrorState.tsx:15` |
| Shimmer infinito por instancia: 10 esqueletos = 10 animaciones eternas | `Skeleton.tsx:34-40`, `SkeletonLoader.tsx:30-35` |
| `toLocaleDateString('es-ES')` por celda (42 celdas) en cada render | `PremiumCalendar.tsx:251` |
| `AnimatedNumber` hace `requestAnimationFrame` + `setState` por frame (~60 renders/s) | `AnimatedNumber.tsx:44-54` |

---

## 6. Plan de trabajo propuesto

### Fase A — Bugs de interacción (1-2 días, riesgo bajo)

1. `PremiumAlert.tsx:68` — `onRequestClose` ya no confirma. *(impacto: alto, esfuerzo: S)*
2. `ActionSheet.tsx:47` — overlay como hermano `absoluteFill`. *(alto, S)*
3. `SelectListModal.tsx:105` — eliminar la condición muerta; `:93` — rastrear selección; `:73` — `keyboardShouldPersistTaps`. *(alto, S)*
4. `SelectListModal.tsx`, `ActionSheet.tsx`, `ModalBottomSheet.tsx` — `useSafeAreaInsets` en el padding inferior. *(alto, S)*
5. `ErrorState` — usarlo en las pantallas con error y borrar las implementaciones inline. *(alto, M)*

### Fase B — Consistencia de diseño (1 semana)

6. Tab bar: un solo `TAB_BAR_HEIGHT` exportado + spacer; eliminar los 10 `paddingBottom: 100`; pasar `withTabBar`
   en `ServiciosScreen`. *(alto, M)*
7. Tipografía: `fontWeight` → `fontFamily` en los 167 archivos. *(alto, M — mecánico)*
8. Color: `useAccentColor` como única fuente; migrar los 999 hex; borrar `constants/theme.ts` y `utils/colors.ts`;
   `AppErrorBoundary` con `appearanceStore`. *(alto, L)*
9. `accentColor` → `accentOnSurface` como texto en los 106 sitios. *(alto, M)*
10. Fusionar `Skeleton`/`SkeletonLoader`; unificar las 3 APIs de tabs y de acción; unificar `OvertimeCard`/`AdvanceCard`. *(medio, M)*

### Fase C — Accesibilidad y movimiento (1 semana)

11. `accessibilityRole`/`Label`/`State` en los ~229 Pressable sin etiquetar. *(alto, M)*
12. `ProgressBar` con `accessibilityRole="progressbar"` + `accessibilityValue`. *(medio, S)*
13. `useReducedMotion` en los 46 archivos con animación; arreglar las deps de `AnimatedView`. *(medio, M)*
14. Objetivos táctiles ≥ 44 px en `AppErrorBoundary` y las migas de `PremiumHeader`. *(medio, S)*

### Fase D — Consistencia funcional (1 semana)

15. Validar el payload de venta con `OrderCreateSchema`; `loginSchema` en el login. *(alto, M)*
16. Unificar las dos pantallas de Servicios (extraer filtros/lista/modal a compartido). *(medio, L)*
17. Unificar el manejo de "atrás" en todos los diálogos con `AppModal`. *(medio, S)*

---

## 7. Cómo reproducir las mediciones

```powershell
# Tipografía: archivos con fontWeight y sin fontFamily
$files = Get-ChildItem -Path app,components -Recurse -Include *.tsx
$files | Where-Object { (Get-Content $_.FullName -Raw) -match 'fontWeight' -and
                         -not (Get-Content $_.FullName -Raw) -match 'fontFamily' } | Measure-Object

# Colores hardcodeados
Select-String -Path app\**\*.tsx,components\**\*.tsx -Pattern '#[0-9A-Fa-f]{6}\b'

# accentColor usado como texto
Select-String -Path app\**\*.tsx,components\**\*.tsx -Pattern 'color:\s*accentColor|color=\{accentColor\}'

# ErrorState / EmptyState / Skeleton realmente usados
Select-String -Path app\**\*.tsx,components\**\*.tsx -Pattern '<ErrorState|<EmptyState|<Skeleton'

# Animaciones sin reduced-motion
Select-String -Path app\**\*.tsx,components\**\*.tsx -Pattern 'withRepeat|withTiming|Animated'
```

---

## 8. Limitaciones de esta auditoría

- Análisis **estático**: no se ejecutó la app en dispositivo ni emulador. Los efectos en runtime (botón atrás,
  doble toque, solapamiento del FAB, táctiles) están inferidos de la semántica de React Native y de los
  comentarios del propio código, y marcados como inferencia donde aplica.
- No se midió el rendimiento real (FPS, TTI, memoria) ni se revisó la lógica de negocio.
- La biblioteca `components/ui/` y la capa de navegación se revisaron archivo por archivo; `components/screens/`,
  `components/cajero/` y `components/garzon/` se revisaron por muestreo dirigido (pantallas de mayor tráfico y
  todos los archivos con mayor densidad de colores o de estados).
- El rediseño de Servicios se evaluó contra los mockups de `design-servicios/`; el trabajo está **sin commitear**
  (189 archivos, ~12k líneas) y se asume en curso.

---

## 9. Fase A — implementada el 2026-11-20

Estado: **completa**. 15 archivos tocados, 597 inserciones / 493 borradores.

### Qué se corrigió

| Ítem | Archivo | Cambio |
|---|---|---|
| 3.1 | `components/ui/PremiumAlert.tsx` | `onRequestClose` y la "X" llaman a `onDismiss ?? onCancel`; **nunca** a `onConfirm`. Nueva prop `onDismiss`. Si no hay forma de descartar, la "X" se oculta. Bloqueo temporal de doble toque en la confirmación (1,5 s, se libera solo para que un fallo permita reintentar) |
| 3.1 | `components/cajero/GlobalTimerAlert.tsx`, `components/shared/PremiumLiquidationCard.tsx` | Se les pasa `onCancel` para que la "X" descarte en vez de confirmar |
| 3.2 | `components/ui/ActionSheet.tsx` | El overlay pasa a ser hermano (`StyleSheet.absoluteFill`), igual que `ModalBottomSheet`; ya no cierra al tocar el título o el padding |
| 3.3 | `components/ui/SelectListModal.tsx` | Se elimina la condición muerta `(onConfirm || true)`; el botón usa `onConfirm ?? onClose` |
| 3.4 | `components/ui/SelectListModal.tsx` | La selección se rastrea de verdad: prop `selected` (controlada) + estado interno, `renderContent` recibe el valor real, los ítems exponen `accessibilityState={{ selected, disabled }}` |
| 3.5 | `components/ui/SelectListModal.tsx` | `keyboardShouldPersistTaps="handled"` y `keyboardDismissMode="on-drag"` |
| 3.6 | `ModalBottomSheet`, `SelectListModal`, `ActionSheet` | `useSafeAreaInsets` en el `paddingBottom`; el botón de acción deja de quedar bajo el indicador de inicio |
| 3.6 | `components/ui/ModalBottomSheet.tsx` | El botón de acción gana `accessibilityRole`/`accessibilityLabel` |
| 3.7 | `components/ui/ErrorState.tsx` | Nueva variante `variant="inline"` (banda compacta) con paleta de error única para claro y oscuro; `style` pasa a `StyleProp<ViewStyle>` |
| 3.7 | 8 pantallas | `AnticiposScreen`, `HorasExtrasScreen`, `PropinasScreen`, `anfitriona/(tabs)/servicios`, `cajero/compras`, `cajero/pagos`, `cajero/asistencia-local`, `cajero/horas-extras` → usan `ErrorState` en vez de su tarjeta de error propia; se borran los estilos y los imports muertos |

### Verificación

- `tsc --noEmit`: **exit 0**.
- ESLint sobre los 15 archivos: **0 errores**. Quedan 3 warnings de `exhaustive-deps` y 1 de `no-unused-vars`
  **preexistentes** (no introducidos aquí).
- Tests que cubren los componentes tocados: **37/37 pasan**
  (`ErrorState`, `PremiumLiquidationCard`, `VentasScreen`, `ColacionAcompanamientoSelector`,
  `ColacionesScreen`, `employee-parity`).

### Fallos de test preexistentes (no caused por esta fase)

La suite completa da **44 fallos en 5 archivos**, todos **anteriores a esta fase** y ajenos a los archivos
tocados: `themeStore.test.ts` (7), `theme/contraste.test.ts` (26), `BiometricEnrollmentModal.test.tsx` (3),
`GarzonCartBar.test.tsx` (7), `useNuevaVenta.test.ts` (1).

Causa: el trabajo **sin commitear** reescribió `hooks/useAccentColor.ts` (45 líneas), `store/themeStore.ts` (28),
`utils/color.ts` (89), `GarzonCartBar.tsx` (538) y `useNuevaVenta.ts` (180), pero **los archivos de test
correspondientes no se actualizaron**. Ejemplo: `themeStore.ts:40` ahora devuelve `#FF2D55` y la paleta pasó a
`Índigo #7B61FF` / `Esmeralda #00FF9C`, mientras `themeStore.test.ts` sigue esperando `#E11D48` / `#7C3AED`.

> Esto hay que resolverlo **antes** de mergear el rediseño: 33 de los 44 fallos son del sistema de contraste, que
> es justamente la parte que la Fase B (unificación de color) volverá a tocar.

### Pendiente para las fases siguientes

- `SelectListModal` tiene **0 consumidores** (los tres modales de selección —`ClientSelectModal`,
  `HostessSelectModal`, `RoomSelectModal`— migraron a `ModalBottomSheet`). Sus correcciones quedan sin efecto
  en runtime. Propuesta para la Fase D: **borrarlo** en vez de mantenerlo.
- `ErrorState` en variante `full` y `EmployeeListError` siguen coexistiendo como dos componentes de error
  distintos; conviene unificarlos en la Fase B.
