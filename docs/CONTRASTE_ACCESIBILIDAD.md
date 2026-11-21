# Matriz de contraste de acentos

Contraste WCAG 2.1 de los 13 acentos de perfil en modo claro y oscuro.
Umbrales usados: **4.5:1** para texto normal y **3:1** para iconos, bordes y
controles no textuales (AA).

La matriz se verifica automáticamente en
`tests/unit/theme/contraste.test.ts`; si cambia un color del tema, el test falla.

## Paleta neón

Los acentos son **colores planos**: no hay degradado en ninguna superficie. El
brillo neón viene de dos cosas:

1. El color en sí, saturado y luminoso (`store/themeStore.ts`).
2. El **halo** (`accentGlow`), una `boxShadow` del mismo color que se aplica a
   el header, la barra de pestañas, el FAB y el selector de perfil.

Como el acento es un color sólido, el texto que va encima se mide contra ese
mismo color: `resolveAccentSurface` (`utils/color.ts`) elige blanco o casi
negro según el contraste y calcula la opacidad del subtítulo.

| Token | Uso | Regla |
|---|---|---|
| `accentColor` | Relleno de botones, chips y superficies de marca | — |
| `accentText` | Texto e íconos **sobre** el acento | 4.5:1 |
| `accentTextMuted` | Subtítulos sobre el acento | 4.5:1 |
| `accentUi` | Acento como **icono, borde o badge** | 3:1 |
| `accentOnSurface` | Acento como **texto** sobre la superficie actual | 4.5:1 |
| `accentGlow` | Halo `boxShadow` del color | — |

> `accentColor` no es un token de texto. Para importes y etiquetas sobre la
> tarjeta hay que usar `accentOnSurface`.

El texto oscuro es `#0A0A14` (más profundo que `#111827`): sobre los acentos
neón gana margen de contraste, que es justo lo que necesitan para llegar a
4.5:1.

## Superficies

El fondo de la app es **blanco en modo claro** y **negro en modo oscuro**. Las
tarjetas también son blancas en claro: se distinguen de la pantalla por su
**borde** y su sombra, no por el relleno.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#000000` | Fondo de la pantalla |
| `cardBg` | `#FFFFFF` | `#111111` | Tarjetas, modales, hojas |
| `borderColor` | `rgba(0,0,0,0.12)` | acento 25 % | Borde de tarjetas e inputs |
| `surfaceMuted` | `#F3F4F6` | `#1F2937` | Chips, inputs, badges |
| `textPrimary` | `#111827` | `#FFFFFF` | Títulos y cifras |
| `textSecondary` | `#6B7280` | `#9CA3AF` | Descripciones y etiquetas |

En claro el borde pasó de `rgba(0,0,0,0.05)` a `rgba(0,0,0,0.12)`: con la
tarjeta blanca sobre la pantalla blanca, un borde al 5 % era invisible. Las
cards que antes no llevaban borde en claro (`CajeroStats`) ahora lo llevan
siempre, y `EmptyState` y `SearchBar` subieron el que les faltaba.

El acento se mide contra `#F3F4F6` en claro: una referencia conservadora (el
gris más exigente) para que también supere el umbral sobre la tarjeta blanca
y sobre la pantalla blanca, que son más claras.

## Matriz de los acentos

| Tema | Acento | Texto sobre acento | Subtítulo | Acento texto claro | Acento texto oscuro | Acento icono claro | Acento icono oscuro |
|---|---|---|---|---|---|---|---|
| Rojo | `#FF1B3D` | `#0A0A14` 5.14 | 0.84 → 4.55 | `#db1734` 4.56 | `#FF1B3D` 5.48 | `#FF1B3D` 3.48 | `#FF1B3D` 5.48 |
| Violeta | `#C13BFF` | `#0A0A14` 5.00 | 0.88 → 4.53 | `#a633db` 4.63 | `#C13BFF` 5.34 | `#C13BFF` 3.58 | `#C13BFF` 5.34 |
| Azul | `#0095FF` | `#0A0A14` 6.32 | 0.76 → 4.62 | `#0071c2` 4.61 | `#0095FF` 6.74 | `#008ff5` 3.05 | `#0095FF` 6.74 |
| Índigo | `#6C4DFF` | `#FFFFFF` 5.07 | 0.92 → 4.55 | `#6C4DFF` 4.61 | `#7558ff` 4.60 | `#6C4DFF` 4.61 | `#6C4DFF` 4.14 |
| Esmeralda | `#00FFA6` | `#0A0A14` 14.87 | 0.70 → 6.74 | `#007f53` 4.59 | `#00FFA6` 15.85 | `#009e67` 3.14 | `#00FFA6` 15.85 |
| Naranja | `#FF8A00` | `#0A0A14` 8.33 | 0.70 → 4.92 | `#a85b00` 4.59 | `#FF8A00` 8.89 | `#d67400` 3.00 | `#FF8A00` 8.89 |
| Rosa | `#FF2E9A` | `#0A0A14` 5.73 | 0.78 → 4.53 | `#cc257b` 4.63 | `#FF2E9A` 6.11 | `#FF2E9A` 3.12 | `#FF2E9A` 6.11 |
| Cian | `#00F5FF` | `#0A0A14` 14.54 | 0.70 → 6.63 | `#007a7f` 4.67 | `#00F5FF` 15.50 | `#009da3` 3.00 | `#00F5FF` 15.50 |
| Ámbar | `#FFC400` | `#0A0A14` 12.33 | 0.70 → 6.08 | `#8a6a00` 4.61 | `#FFC400` 13.15 | `#ad8500` 3.11 | `#FFC400` 13.15 |
| Dorado | `#FFE600` | `#0A0A14` 15.54 | 0.70 → 6.86 | `#7a6e00` 4.70 | `#FFE600` 16.57 | `#998a00` 3.19 | `#FFE600` 16.57 |
| Plata | `#DCE9F7` | `#0A0A14` 15.98 | 0.70 → 6.86 | `#6a7077` 4.55 | `#DCE9F7` 17.04 | `#848c94` 3.10 | `#DCE9F7` 17.04 |
| Pizarra | `#6E8CB8` | `#0A0A14` 5.73 | 0.82 → 4.65 | `#587093` 4.59 | `#6E8CB8` 6.11 | `#6E8CB8` 3.12 | `#6E8CB8` 6.11 |
| Negro | `#171717` | `#FFFFFF` 17.93 | 0.70 → 9.14 | `#171717` 16.29 | `#787878` 4.76 | `#171717` 16.29 | `#5d5d5d` 3.19 |

La columna "Subtítulo" es la opacidad del texto atenuado y su contraste real
contra el acento: es la opacidad más suave que todavía cumple 4.5:1.

El tema **Negro** en modo oscuro invierte el acento a `#FFFFFF` (un negro no se
ve sobre fondo negro): el texto sobre él es `#0A0A14` y las superficies pasan a
monocroma.

## Colores guardados en el dispositivo

El color elegido se guarda en `AsyncStorage` (`theme-storage`). Al cambiar la
paleta, `normalizeAccentColor` traduce los colores de paletas anteriores a su
versión neón: la paleta saturada anterior (`#FF2D55`, `#B44AFF`, `#00F0FF`…) y
la original de Tailwind (`#E11D48`, `#7C3AED`…). Un color desconocido cae en
el acento neón más cercano.

## Dependencia del halo

El halo (`accentGlow`) es decorativo: no transporta información, así que no
tiene umbral de contraste. Se aplica fuerte en modo oscuro (`0 0 20px 3px`) y
suave en claro (`0 0 12px 0px`), donde un halo intenso sobre el blanco parece
una mancha de tinta.

## Deuda conocida

Quedan usos de `accentColor` como texto en componentes que lo reciben por
props (importes y etiquetas). Deben migrarse a `accentOnSurface`; el test solo
cubre los tokens, no cada uso puntual. Búsqueda:

```bash
rg "color: accentColor|color=\{accentColor\}" app components
```

## Verificación

```bash
corepack pnpm vitest run tests/unit/theme/contraste.test.ts
```
