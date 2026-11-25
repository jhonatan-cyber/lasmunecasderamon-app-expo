# Matriz de contraste de acentos

Contraste WCAG 2.1 de las 13 paletas de perfil en modo claro y oscuro.
Umbrales usados: **4.5:1** para texto normal y **3:1** para iconos, bordes y
controles no textuales (AA).

Los componentes se verifican en `tests/unit/theme/contraste.test.ts`, los roles
resueltos en `tests/unit/theme/themeTokens.test.ts` y los estados semánticos en
`tests/unit/utils/semanticStatusColors.test.ts`.

## Paletas por color

El selector guarda el color elegido en el perfil (`store/themeStore.ts`) y
`resolveThemePalette` (`utils/themePalette.ts`) lo convierte en una paleta
completa. El rojo tiene los valores acordados explícitamente; las otras
opciones conservan su tono y derivan primario, secundario y acento ajustando la
luminancia HSL. El tema Negro conserva roles de marca monocromos.

| Token | Uso | Regla |
|---|---|---|
| `primaryColor` | Marca y acciones principales | Derivado de la opción; Rojo usa el valor exacto acordado. |
| `secondaryColor` | Acciones y elementos de marca secundarios | Variante más profunda del color elegido. |
| `accentColor` | Selección y detalles destacados | Variante luminosa del color elegido. |
| `primaryText` / `secondaryText` / `accentText` | Texto e iconos sobre cada color de marca | Se elige blanco o casi negro por contraste. |
| `primaryOnSurface` / `secondaryOnSurface` / `accentOnSurface` | Marca como texto sobre superficies | Al menos 4.5:1. |
| `primaryUi` / `secondaryUi` / `accentUi` | Marca como icono, borde o badge | Al menos 3:1. |
| `glowColor` / `accentGlow` | Halo decorativo del primario | Alfa de 15 % en claro y 35 % en oscuro. |

Los textos sobre superficies deben usar el token `OnSurface` que corresponda al
rol representado (`primary`, `secondary` o `accent`).

Por compatibilidad, `useAccentColor` conserva `accentColor` y `accentText` como
aliases del primario que ya consumen los componentes existentes. El rol de
acento explícito está disponible como `accentRoleColor`, `accentRoleText` y
`accentRoleTextMuted`; `accentUi` y `accentOnSurface` corresponden a ese rol.

## Neutrales y superficies

`constants/colorTokens.ts` es la fuente de verdad para fondo, superficies,
texto, bordes y overlays. Estos neutrales no cambian al elegir otro color; la
paleta Negra solo mantiene sus roles de marca en escala monocroma.

| Rol | Claro | Oscuro |
|---|---|---|
| `backgroundColor` | `#F7F7FA` | `#0B0B0F` |
| `surfaceColor` | `#FFFFFF` | `#17171D` |
| `surfaceElevatedColor` | `#F1F1F4` | `#202027` |
| `textPrimary` | `#18181B` | `#F5F5F7` |
| `textSecondary` | `#6B6B74` | `#A1A1AA` |
| `textMuted` | `#6B6B74` | `#A1A1AA` |
| `textDisabled` | `#A1A1AA` | `#666670` |
| `borderColor` | `#E4E4E7` | `#2D2D35` |
| `borderStrongColor` | `#D4D4D8` | `#45454F` |
| `overlayScrim` | `rgba(0,0,0,0.40)` | `rgba(0,0,0,0.70)` |

`Colors` conserva aliases planos para pantallas antiguas. Los componentes
nuevos deben preferir `ThemeTokens` o `useAccentColor`; las superficies
elevadas también se usan para inputs, chips y badges. Los colores semánticos
de éxito, error, advertencia e información no dependen del acento. `textMuted`
mantiene contraste de texto normal; `textDisabled` queda reservado para
controles deshabilitados y no debe usarse como información secundaria.

## Paleta roja y derivación de las otras opciones

| Rol | Claro | Oscuro |
|---|---|---|
| Primario | `#D50032` | `#FF1744` |
| Secundario | `#A60028` | `#B31237` |
| Acento | `#FF4D6D` | `#FF4D6D` |
| Glow | `rgba(213,0,50,0.15)` | `rgba(255,23,68,0.35)` |

Para los demás colores se conserva el tono y la saturación del color elegido;
la luminancia HSL se ajusta a 42 % / 54.5 % para el primario, 32.5 % / 39 %
para el secundario y 65 % para el acento (claro / oscuro). El Glow usa el
primario con 15 % de alfa en claro y 35 % en oscuro. Las pruebas revisan la
legibilidad de texto y controles para las trece opciones en ambos modos.

## Colores guardados en el dispositivo

El color elegido se guarda en `AsyncStorage` (`theme-storage`). Al cambiar la
paleta, `normalizeAccentColor` traduce los colores de paletas anteriores a su
versión neón: la paleta saturada anterior (`#FF2D55`, `#B44AFF`, `#00F0FF`…) y
la original de Tailwind (`#E11D48`, `#7C3AED`…). Un color desconocido cae en
el acento neón más cercano.

## Dependencia del halo

El halo (`accentGlow`) es decorativo: no transporta información, así que no
tiene umbral de contraste. Su color es el primario con alfa de 15 % en claro y
35 % en oscuro; la intensidad visual de la sombra sigue siendo suave en claro
y fuerte en oscuro.

## Migración de textos

Los importes, etiquetas y estados que antes usaban `accentColor` como texto
usan ahora `accentOnSurface`. La prueba renderiza `MetricBanner`,
`HistorySummaryCards` y `HistoryItemCard` sobre fondos claros/oscuros. El color
de acento se conserva para iconos y superficies. Búsqueda de revisión:

```bash
rg "color: accentColor|color=\{accentColor\}" app components
```

No quedan coincidencias de texto JSX; los usos restantes son iconos, bordes y
fondos de marca.

## Verificación

```bash
corepack pnpm vitest run tests/unit/theme/contraste.test.ts
```
