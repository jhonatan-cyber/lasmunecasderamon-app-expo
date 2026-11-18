/**
 * Familias tipográficas de la app.
 *
 * Inter es la voz de la interfaz (cifras, etiquetas, formularios) y
 * Playfair Display queda para los títulos de marca: su serif alto y
 * contrastado es lo que hace que el header se lea como "premium" en
 * lugar de como una app genérica.
 *
 * Cada familia corresponde a un archivo de un solo peso, por eso el peso
 * se elige por nombre (`Inter_700Bold`) y no con `fontWeight`: mezclar
 * ambos hace que Android sintetice negrita sobre negrita.
 */
export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
  display: 'PlayfairDisplay_700Bold',
} as const;

/** Evita que las cifras cambien de ancho al actualizarse (montos, contadores). */
export const TabularNumbers = { fontVariant: ['tabular-nums'] as const };
