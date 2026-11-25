/**
 * Columnas de las grillas de caja según tamaño y orientación.
 * Un mismo cálculo para la pantalla y el skeleton evita que el layout "salte" al cargar.
 */
export function columnasCaja(isTablet: boolean, isLandscape: boolean): number {
    if (isTablet) return 4;
    return isLandscape ? 3 : 2;
}
