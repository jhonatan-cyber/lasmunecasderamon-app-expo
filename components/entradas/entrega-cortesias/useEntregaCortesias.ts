import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { entradasService } from '@/services/entradas';
import { productsService } from '@/services/products';
import type { AcompanamientoBotellaItem } from '@/types/cart';
import logger from '@/utils/logger';
import { showToast } from '@/utils/toast-lazy';
import {
  acompanamientoDe,
  bebidaDe,
  calcularReparto,
  categoriaFueraDeCortesia,
  claveDe,
  formatoCortesia,
  normalizar,
} from './helpers';
import { seleccionInicial, seleccionReducer } from './reducer';
import type {
  Acompanamiento,
  Bebida,
  Formato,
  GrupoEntrega,
  LineaEntrega,
} from './types';

interface UseEntregaCortesiasParams {
  visible: boolean;
  grupo: GrupoEntrega | null;
  tope: number;
  onClose: () => void;
  onEntregado: () => void | Promise<void>;
  modo?: 'entrega' | 'solicitud';
}

/**
 * Datos y estado del modal de entrega de cortesías: catálogo del bar (bebidas y
 * covers), filtro de búsqueda, selección de productos con su reparto de
 * acompañamiento y la entrega secuencial contra la API.
 */
export function useEntregaCortesias({
  visible,
  grupo,
  tope,
  onClose,
  onEntregado,
  modo = 'entrega',
}: UseEntregaCortesiasParams) {
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [acompanamientos, setAcompanamientos] = useState<Acompanamiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, dispatch] = useReducer(seleccionReducer, seleccionInicial);
  const [entregando, setEntregando] = useState(false);

  const filasDelGrupo = grupo?.filas;
  const filas = useMemo(() => filasDelGrupo ?? [], [filasDelGrupo]);
  const umbral = Math.max(tope, filas[0]?.monto_entrada ?? 0);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    (async () => {
      try {
        const [resBebidas, resCover] = await Promise.all([
          productsService.forSale(controller.signal),
          productsService.forCover(controller.signal).catch(() => null),
        ]);
        if (controller.signal.aborted) return;
        const lista = (resBebidas as { data?: unknown[] })?.data;
        if (!resBebidas.success || !Array.isArray(lista)) {
          throw new Error(resBebidas.message || 'No se pudieron cargar las bebidas del bar');
        }
        setBebidas(
          lista
            .map(bebidaDe)
            .filter((bebida): bebida is Bebida => bebida !== null && bebida.stock_bar > 0),
        );
        const cover = (resCover as { data?: unknown[] } | null)?.data;
        setAcompanamientos(
          Array.isArray(cover)
            ? cover
                .map(acompanamientoDe)
                .filter(
                  (fila): fila is Acompanamiento => fila !== null && fila.stock_bar > 0,
                )
            : [],
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.fetchError(err, { context: 'EntregaCortesias:cargar' });
        setError(
          err instanceof Error ? err.message : 'No se pudieron cargar las bebidas del bar',
        );
        setBebidas([]);
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    })();
    return () => controller.abort();
  }, [visible, grupo?.id]);

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda);
    return bebidas
      .map(bebida => ({ bebida, formato: formatoCortesia(bebida, umbral) }))
      .filter(
        (fila): fila is { bebida: Bebida; formato: Formato } =>
          fila.formato !== null && !categoriaFueraDeCortesia(fila.bebida.categoria_nombre),
      )
      .filter(
        ({ bebida, formato }) =>
          !termino ||
          Boolean(seleccion[claveDe(bebida, formato)]) ||
          normalizar(`${bebida.producto_nombre} ${bebida.presentacion_nombre}`).includes(termino),
      );
  }, [bebidas, busqueda, seleccion, umbral]);

  const totalSeleccionado = useMemo(
    () => Object.values(seleccion).reduce((suma, linea) => suma + linea.cantidad, 0),
    [seleccion],
  );

  const lineas = useMemo<LineaEntrega[]>(
    () =>
      Object.entries(seleccion).flatMap(([clave, linea]) => {
        const [presentacionId, formato] = clave.split(':') as [string, Formato];
        const bebida = bebidas.find(item => item.presentacion_id === presentacionId);
        if (!bebida) return [];
        return [{ clave, bebida, formato, ...linea }];
      }),
    [bebidas, seleccion],
  );

  const faltanAcompanamientos = useMemo(
    () =>
      lineas.some(
        linea =>
          calcularReparto(
            linea.bebida,
            linea.formato,
            linea.reparto,
            linea.cantidad,
            acompanamientos,
          ).falta,
      ),
    [acompanamientos, lineas],
  );

  const agregar = useCallback(
    (bebida: Bebida, formato: Formato) => {
      dispatch({ type: 'agregar', clave: claveDe(bebida, formato), max: filas.length });
    },
    [filas.length],
  );

  const quitar = useCallback((clave: string) => {
    dispatch({ type: 'quitar', clave });
  }, []);

  const agregarSabor = useCallback((clave: string, opcion: Acompanamiento) => {
    dispatch({ type: 'agregarSabor', clave, opcion });
  }, []);

  const ajustarSabor = useCallback((clave: string, presentacionId: string, delta: number) => {
    dispatch({ type: 'ajustarSabor', clave, presentacionId, delta });
  }, []);

  const quitarSabor = useCallback((clave: string, presentacionId: string) => {
    dispatch({ type: 'quitarSabor', clave, presentacionId });
  }, []);

  const cambiarAdicional = useCallback((clave: string, valor: string) => {
    dispatch({ type: 'cambiarAdicional', clave, valor });
  }, []);

  const cerrar = useCallback(() => {
    if (entregando) return;
    onClose();
  }, [entregando, onClose]);

  const entregar = useCallback(async () => {
    if (!grupo || entregando) return;
    if (lineas.length === 0) {
      showToast({
        type: 'info',
        text1: 'Elige los productos',
        text2: 'Selecciona al menos un corte para entregar.',
      });
      return;
    }
    if (faltanAcompanamientos) {
      showToast({
        type: 'error',
        text1: 'Falta el acompañamiento',
        text2: 'Elige la bebida analcohólica de los cortes seleccionados.',
      });
      return;
    }
    if (totalSeleccionado > filas.length) {
      showToast({
        type: 'error',
        text1: 'Demasiados productos',
        text2: `Solo quedan ${filas.length} entradas pendientes en este grupo.`,
      });
      return;
    }

    const unidades: {
      presentacion_id: string;
      formato: Formato;
      reparto: AcompanamientoBotellaItem[];
      adicional: string;
      producto_nombre: string;
      presentacion_nombre: string;
    }[] = [];
    for (const linea of lineas) {
      for (let indice = 0; indice < linea.cantidad; indice += 1) {
        unidades.push({
          presentacion_id: linea.bebida.presentacion_id,
          formato: linea.formato,
          reparto: linea.reparto,
          adicional: linea.adicional,
          producto_nombre: linea.bebida.producto_nombre,
          presentacion_nombre: linea.bebida.presentacion_nombre,
        });
      }
    }

    setEntregando(true);
    let entregadas = 0;
    try {
      if (modo === 'solicitud') {
        const unidadesSolicitud = unidades.map((unidad, indice) => ({
          entrada_id: filas[indice]?.id,
          presentacion_id: unidad.presentacion_id,
          tipo_entrega: unidad.formato,
          producto_nombre: unidad.producto_nombre,
          presentacion_nombre: unidad.presentacion_nombre,
          acompanamientos: unidad.reparto.length
            ? unidad.reparto.map(sabor => ({
                presentacion_id: sabor.presentacion_id,
                unidades: sabor.unidades,
              }))
            : null,
          ...(unidad.adicional.trim()
            ? { monto_adicional: Number(unidad.adicional) }
            : {}),
        }));
        if (unidadesSolicitud.some(unidad => !unidad.entrada_id))
          throw new Error('El grupo ya no tiene entradas pendientes');
        const res = await entradasService.solicitarEntregaCortesias({
          grupo_registro_id: grupo.id,
          cliente_nombre: grupo.cliente,
          entrada_ids: unidadesSolicitud.map(unidad => unidad.entrada_id as string),
          unidades: unidadesSolicitud,
          monto_total: unidadesSolicitud.length * (filas[0]?.monto_entrada || 0),
        });
        if (!res.success) throw new Error(res.message || 'No se pudo enviar la solicitud');
        entregadas = unidadesSolicitud.length;
        showToast({
          type: 'success',
          text1: 'Solicitud enviada al cajero',
          text2: 'La entrega quedará pendiente de autorización.',
        });
        await onEntregado();
        onClose();
      } else {
      for (const unidad of unidades) {
        const fila = filas[entregadas];
        if (!fila) throw new Error('El grupo ya no tiene entradas pendientes');
        const adicional = unidad.adicional.trim();
        const res = await entradasService.entregar(fila.id, {
          presentacion_id: unidad.presentacion_id,
          tipo_entrega: unidad.formato,
          acompanamientos: unidad.reparto.length
            ? unidad.reparto.map(sabor => ({
                presentacion_id: sabor.presentacion_id,
                unidades: sabor.unidades,
              }))
            : null,
          ...(adicional ? { monto_adicional: Number(adicional) } : {}),
        });
        if (!res.success) throw new Error(res.message || 'No se pudo entregar la cortesía');
        entregadas += 1;
      }
      showToast({
        type: 'success',
        text1: entregadas === 1 ? 'Cortesía entregada' : `${entregadas} cortesías entregadas`,
        text2: grupo.cliente,
      });
      await onEntregado();
      onClose();
      }
    } catch (err) {
      logger.fetchError(err, { context: 'EntregaCortesias:entregar' });
      showToast({
        type: 'error',
        text1:
          entregadas > 0
            ? `Se entregaron ${entregadas} de ${unidades.length}`
            : 'No se pudo entregar',
        text2: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
      if (entregadas > 0) {
        await onEntregado();
        onClose();
      }
    } finally {
      setEntregando(false);
    }
  }, [
    entregando,
    faltanAcompanamientos,
    filas,
    grupo,
    lineas,
    onClose,
    onEntregado,
    totalSeleccionado,
    modo,
  ]);

  return {
    acompanamientos,
    busqueda,
    setBusqueda,
    cargando,
    error,
    entregando,
    filas,
    umbral,
    seleccion,
    visibles,
    totalSeleccionado,
    lineas,
    faltanAcompanamientos,
    agregar,
    quitar,
    agregarSabor,
    ajustarSabor,
    quitarSabor,
    cambiarAdicional,
    cerrar,
    entregar,
  };
}
