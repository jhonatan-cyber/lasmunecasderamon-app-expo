import type { Acompanamiento, Seleccion } from './types';

export type SeleccionAction =
  | { type: 'agregar'; clave: string; max: number }
  | { type: 'quitar'; clave: string }
  | { type: 'agregarSabor'; clave: string; opcion: Acompanamiento }
  | { type: 'ajustarSabor'; clave: string; presentacionId: string; delta: number }
  | { type: 'quitarSabor'; clave: string; presentacionId: string }
  | { type: 'cambiarAdicional'; clave: string; valor: string };

export const seleccionInicial: Seleccion = {};

/**
 * Estado de selección del modal: cuántas unidades de cada producto y cómo se
 * reparte el acompañamiento. `max` es el total de entradas pendientes del grupo:
 * no se puede seleccionar más que eso.
 */
export function seleccionReducer(estado: Seleccion, accion: SeleccionAction): Seleccion {
  switch (accion.type) {
    case 'agregar': {
      const total = Object.values(estado).reduce((suma, linea) => suma + linea.cantidad, 0);
      if (total >= accion.max) return estado;
      const actual = estado[accion.clave];
      return {
        ...estado,
        [accion.clave]: {
          cantidad: (actual?.cantidad ?? 0) + 1,
          reparto: actual?.reparto ?? [],
          adicional: actual?.adicional ?? '',
        },
      };
    }
    case 'quitar': {
      const actual = estado[accion.clave];
      if (!actual) return estado;
      if (actual.cantidad <= 1) {
        const resto = { ...estado };
        delete resto[accion.clave];
        return resto;
      }
      return { ...estado, [accion.clave]: { ...actual, cantidad: actual.cantidad - 1 } };
    }
    case 'agregarSabor': {
      const linea = estado[accion.clave];
      if (!linea) return estado;
      if (linea.reparto.some(sabor => sabor.presentacion_id === accion.opcion.presentacion_id)) {
        return estado;
      }
      const nombre = [accion.opcion.producto_nombre, accion.opcion.presentacion_nombre]
        .filter(Boolean)
        .join(' ');
      return {
        ...estado,
        [accion.clave]: {
          ...linea,
          reparto: [
            ...linea.reparto,
            { presentacion_id: accion.opcion.presentacion_id, unidades: 1, nombre },
          ],
        },
      };
    }
    case 'ajustarSabor': {
      const linea = estado[accion.clave];
      if (!linea) return estado;
      return {
        ...estado,
        [accion.clave]: {
          ...linea,
          reparto: linea.reparto.map(sabor =>
            sabor.presentacion_id === accion.presentacionId
              ? { ...sabor, unidades: sabor.unidades + accion.delta }
              : sabor,
          ),
        },
      };
    }
    case 'quitarSabor': {
      const linea = estado[accion.clave];
      if (!linea) return estado;
      return {
        ...estado,
        [accion.clave]: {
          ...linea,
          reparto: linea.reparto.filter(sabor => sabor.presentacion_id !== accion.presentacionId),
        },
      };
    }
    case 'cambiarAdicional': {
      const linea = estado[accion.clave];
      if (!linea) return estado;
      return {
        ...estado,
        [accion.clave]: { ...linea, adicional: accion.valor.replace(/[^\d]/g, '') },
      };
    }
    default:
      return estado;
  }
}
