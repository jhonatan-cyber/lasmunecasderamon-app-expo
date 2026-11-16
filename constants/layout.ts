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
