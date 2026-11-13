import {
  calcularReparto,
  claveDe,
  costoSeleccion,
  precioVisible,
  recortarReparto,
  stockSeleccionValido,
} from './helpers';
import type { Acompanamiento, Bebida, Formato, Seleccion } from './types';

export interface LimitesSeleccion {
  bebidas: Bebida[];
  acompanamientos: Acompanamiento[];
  presupuesto: number;
}

export type SeleccionAction =
  | { type: 'reiniciar' }
  | ({ type: 'agregar'; bebida: Bebida; formato: Formato } & LimitesSeleccion)
  | { type: 'quitar'; clave: string; unidadesPorEntrega: number }
  | ({
      type: 'agregarSabor';
      clave: string;
      opcion: Acompanamiento;
    } & LimitesSeleccion)
  | ({
      type: 'ajustarSabor';
      clave: string;
      presentacionId: string;
      delta: number;
    } & LimitesSeleccion)
  | { type: 'quitarSabor'; clave: string; presentacionId: string };

export const seleccionInicial: Seleccion = {};

export interface FormularioEntrega {
  busqueda: string;
  montoAdicional: string;
  errorMonto: string | null;
}

export type FormularioAction =
  | { type: 'reiniciar' }
  | { type: 'busqueda'; valor: string }
  | { type: 'montoAdicional'; valor: string }
  | { type: 'errorMonto'; mensaje: string | null };

export const formularioInicial: FormularioEntrega = {
  busqueda: '',
  montoAdicional: '',
  errorMonto: null,
};

export function formularioReducer(
  estado: FormularioEntrega,
  accion: FormularioAction,
): FormularioEntrega {
  switch (accion.type) {
    case 'reiniciar':
      return formularioInicial;
    case 'busqueda':
      return { ...estado, busqueda: accion.valor };
    case 'montoAdicional':
      return { ...estado, montoAdicional: accion.valor };
    case 'errorMonto':
      return { ...estado, errorMonto: accion.mensaje };
  }
}

/** Valida contra el estado más reciente, incluso si llegan varias pulsaciones seguidas. */
export function seleccionReducer(estado: Seleccion, accion: SeleccionAction): Seleccion {
  switch (accion.type) {
    case 'reiniciar':
      return seleccionInicial;
    case 'agregar': {
      const clave = claveDe(accion.bebida, accion.formato);
      const precio = precioVisible(accion.bebida, accion.formato);
      if (precio <= 0 || costoSeleccion(estado, accion.bebidas) + precio > accion.presupuesto)
        return estado;
      const actual = estado[clave];
      const siguiente = {
        ...estado,
        [clave]: {
          cantidad: (actual?.cantidad ?? 0) + 1,
          reparto: actual?.reparto ?? [],
        },
      };
      return stockSeleccionValido(siguiente, accion.bebidas, accion.acompanamientos)
        ? siguiente
        : estado;
    }
    case 'quitar': {
      const actual = estado[accion.clave];
      if (!actual) return estado;
      if (actual.cantidad <= 1) {
        const resto = { ...estado };
        delete resto[accion.clave];
        return resto;
      }
      return {
        ...estado,
        [accion.clave]: {
          cantidad: actual.cantidad - 1,
          reparto: recortarReparto(
            actual.reparto,
            accion.unidadesPorEntrega * (actual.cantidad - 1),
          ),
        },
      };
    }
    case 'agregarSabor':
    case 'ajustarSabor': {
      const linea = estado[accion.clave];
      if (!linea) return estado;
      const [id, formato] = accion.clave.split(':') as [string, Formato];
      const bebida = accion.bebidas.find((item) => item.presentacion_id === id);
      if (!bebida) return estado;
      const info = calcularReparto(
        bebida,
        formato,
        linea.reparto,
        linea.cantidad,
        accion.acompanamientos,
      );
      let reparto = linea.reparto;
      if (accion.type === 'agregarSabor') {
        const opcion = info.opcionesParaAgregar.find(
          (item) => item.presentacion_id === accion.opcion.presentacion_id,
        );
        if (!opcion || info.restante < 1) return estado;
        const nombre = [opcion.producto_nombre, opcion.presentacion_nombre]
          .filter(Boolean)
          .join(' ');
        reparto = [...reparto, { presentacion_id: opcion.presentacion_id, unidades: 1, nombre }];
      } else {
        const sabor = reparto.find((item) => item.presentacion_id === accion.presentacionId);
        if (
          !sabor ||
          sabor.unidades + accion.delta < 1 ||
          (accion.delta > 0 && info.restante < accion.delta)
        )
          return estado;
        reparto = reparto.map((item) =>
          item.presentacion_id === accion.presentacionId
            ? { ...item, unidades: item.unidades + accion.delta }
            : item,
        );
      }
      const siguiente = { ...estado, [accion.clave]: { ...linea, reparto } };
      // Siempre permite liberar stock aunque el catálogo haya cambiado.
      if (accion.type === 'ajustarSabor' && accion.delta < 0) return siguiente;
      return stockSeleccionValido(siguiente, accion.bebidas, accion.acompanamientos)
        ? siguiente
        : estado;
    }
    case 'quitarSabor': {
      const linea = estado[accion.clave];
      if (!linea) return estado;
      return {
        ...estado,
        [accion.clave]: {
          ...linea,
          reparto: linea.reparto.filter((sabor) => sabor.presentacion_id !== accion.presentacionId),
        },
      };
    }
    default:
      return estado;
  }
}
