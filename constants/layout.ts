/**
 * Anchos máximos de lectura para tablet.
 *
 * En un iPad de 1024 px, una tarjeta o un formulario a todo el ancho obliga a
 * recorrer líneas larguísimas y se ve desproporcionado. Estos topes no afectan
 * a móviles (donde el ancho disponible es menor) y se pueden aplicar en estilos
 * de módulo porque no dependen del tamaño de la ventana.
 */

/** Contenido general: listas, tableros y pantallas de detalle. */
export const CONTENT_MAX_WIDTH = 960;

/** Formularios y ajustes: más estrechos para mantener la legibilidad. */
export const FORM_MAX_WIDTH = 720;

/** Diálogos y tarjetas de confirmación. */
export const MODAL_MAX_WIDTH = 560;

export const contentColumn = {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
} as const;

export const formColumn = {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
} as const;

/**
 * Altura de la barra de tabs inferior (PremiumTabBar).
 *
 * La barra usa `minHeight: 60` + `paddingBottom: insets.bottom` + bordes y
 * radio superior. Este valor es el padding mínimo que el contenido de una
 * pantalla debe aplicar para no quedar tapado por la barra flotante.
 * En modo compacto (landscape móvil) la barra es más baja (52 px), por lo que
 * este valor es conservador y funciona en ambos modos.
 */
export const TAB_BAR_HEIGHT = 80;

/** Padding inferior para listas/scroll en pantallas con tab bar. */
export const tabBarBottomPadding = 100;
