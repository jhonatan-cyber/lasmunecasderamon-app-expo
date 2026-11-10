import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { entradasService } from '@/services/entradas';
import { productsService } from '@/services/products';
import logger from '@/utils/logger';
import { showToast } from '@/utils/toast-lazy';
import {
  acompanamientoDe,
  bebidaDe,
  calcularReparto,
  categoriaFueraDeCover,
  claveDe,
  dividirRepartoPorEntrega,
  formatosCover,
  montoCobroBarra,
  normalizar,
  precioVisible,
  unidadesPorEntrega,
} from './helpers';
import { seleccionInicial, seleccionReducer } from './reducer';
import type {
  Acompanamiento,
  Bebida,
  Formato,
  GrupoEntrega,
  LineaEntrega,
} from './types';

interface UseEntregaCoversParams {
  visible: boolean;
  grupo: GrupoEntrega | null;
  tope: number;
  onClose: () => void;
  onEntregado: () => void | Promise<void>;
  modo?: 'entrega' | 'solicitud';
}

/**
 * Datos y estado del modal de entrega de covers: catálogo del bar (bebidas y
 * covers), presupuesto del grupo (entradas + monto adicional), selección de
 * productos con su reparto de acompañamiento y la entrega contra la API.
 */
export function useEntregaCovers({
  visible,
  grupo,
  tope,
  onClose,
  onEntregado,
  modo = 'entrega',
}: UseEntregaCoversParams) {
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [acompanamientos, setAcompanamientos] = useState<Acompanamiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [montoAdicional, setMontoAdicional] = useState('');
  const [seleccion, dispatch] = useReducer(seleccionReducer, seleccionInicial);
  const [entregando, setEntregando] = useState(false);

  const filasDelGrupo = grupo?.filas;
  const filas = useMemo(() => filasDelGrupo ?? [], [filasDelGrupo]);
  const topeCover = Number(tope) || 0;
  const umbral = Math.max(topeCover, Number(filas[0]?.monto_entrada) || 0);
  const totalEntradas = useMemo(
    () => filas.reduce((suma, fila) => suma + (Number(fila.monto_entrada) || 0), 0),
    [filas],
  );
  const adicional = Math.max(0, Math.floor(Number(montoAdicional) || 0));
  const presupuesto = totalEntradas + adicional;

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
        // Cada apertura arranca con el grupo limpio: sin búsqueda ni monto
        // adicional del grupo anterior.
        dispatch({ type: 'reiniciar' });
        setBusqueda('');
        setMontoAdicional('');
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
        logger.fetchError(err, { context: 'EntregaCovers:cargar' });
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
      .flatMap(bebida => {
        if (categoriaFueraDeCover(bebida.categoria_nombre)) return [];
        const formatos = formatosCover(bebida, presupuesto, umbral);
        // Lo ya elegido se mantiene visible aunque el presupuesto baje, para
        // poder ajustarlo antes de entregar.
        for (const formato of ['corte', 'botella'] as Formato[]) {
          const clave = claveDe(bebida, formato);
          if (seleccion[clave] && !formatos.includes(formato)) formatos.push(formato);
        }
        return formatos.map(formato => ({ bebida, formato }));
      })
      .filter(
        ({ bebida, formato }) =>
          !termino ||
          Boolean(seleccion[claveDe(bebida, formato)]) ||
          normalizar(`${bebida.producto_nombre} ${bebida.presentacion_nombre}`).includes(termino),
      );
  }, [bebidas, busqueda, presupuesto, seleccion, umbral]);

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

  /** Precio de cada entrega en el orden en que se consumen las entradas. */
  const unidadesEntrega = useMemo(
    () =>
      lineas.flatMap(linea =>
        Array.from({ length: linea.cantidad }, () => ({
          linea,
          precio: precioVisible(linea.bebida, linea.formato),
        })),
      ),
    [lineas],
  );

  const precioSeleccionado = useMemo(
    () => unidadesEntrega.reduce((suma, unidad) => suma + unidad.precio, 0),
    [unidadesEntrega],
  );

  // Lo que el cliente paga en la barra: la diferencia de cada unidad sobre el
  // umbral de su entrada.
  const cobroBarra = useMemo(
    () =>
      unidadesEntrega.reduce((suma, unidad, indice) => {
        const fila = filas[indice];
        if (!fila) return suma;
        return (
          suma + montoCobroBarra(unidad.precio, Number(fila.monto_entrada) || 0, topeCover)
        );
      }, 0),
    [filas, topeCover, unidadesEntrega],
  );

  const excedePresupuesto = precioSeleccionado > presupuesto;
  const excedeAdicional = cobroBarra > adicional;
  const presupuestoInsuficiente = excedePresupuesto || excedeAdicional;

  const agregar = useCallback(
    (bebida: Bebida, formato: Formato) => {
      dispatch({ type: 'agregar', clave: claveDe(bebida, formato), max: filas.length });
    },
    [filas.length],
  );

  const quitar = useCallback(
    (clave: string) => {
      const [presentacionId, formato] = clave.split(':') as [string, Formato];
      const bebida = bebidas.find(item => item.presentacion_id === presentacionId);
      dispatch({
        type: 'quitar',
        clave,
        unidadesPorEntrega: bebida ? unidadesPorEntrega(bebida, formato) : 0,
      });
    },
    [bebidas],
  );

  const agregarSabor = useCallback((clave: string, opcion: Acompanamiento) => {
    dispatch({ type: 'agregarSabor', clave, opcion });
  }, []);

  const ajustarSabor = useCallback((clave: string, presentacionId: string, delta: number) => {
    dispatch({ type: 'ajustarSabor', clave, presentacionId, delta });
  }, []);

  const quitarSabor = useCallback((clave: string, presentacionId: string) => {
    dispatch({ type: 'quitarSabor', clave, presentacionId });
  }, []);

  const cambiarMontoAdicional = useCallback((valor: string) => {
    setMontoAdicional(valor.replace(/[^\d]/g, ''));
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
    if (presupuestoInsuficiente) {
      showToast({
        type: 'error',
        text1: 'Presupuesto insuficiente',
        text2: 'Sube el monto adicional o quita productos para cubrir la selección.',
      });
      return;
    }

    const unidades: {
      presentacion_id: string;
      formato: Formato;
      reparto: { presentacion_id: string; unidades: number }[];
      monto_adicional: number;
      producto_nombre: string;
      presentacion_nombre: string;
    }[] = [];
    for (const linea of lineas) {
      const info = calcularReparto(
        linea.bebida,
        linea.formato,
        linea.reparto,
        linea.cantidad,
        acompanamientos,
      );
      // Cada entrega recibe su propia mezcla de sabores (un corte, una bebida).
      const repartos = info.requerido
        ? dividirRepartoPorEntrega(linea.reparto, info.unidadesPorEntrega, linea.cantidad)
        : [];
      const precio = precioVisible(linea.bebida, linea.formato);
      for (let indice = 0; indice < linea.cantidad; indice += 1) {
        const fila = filas[unidades.length];
        unidades.push({
          presentacion_id: linea.bebida.presentacion_id,
          formato: linea.formato,
          reparto: repartos[indice] ?? [],
          monto_adicional: fila
            ? montoCobroBarra(precio, Number(fila.monto_entrada) || 0, topeCover)
            : 0,
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
          acompanamientos: unidad.reparto.length ? unidad.reparto : null,
          monto_adicional: unidad.monto_adicional,
        }));
        if (unidadesSolicitud.some(unidad => !unidad.entrada_id))
          throw new Error('El grupo ya no tiene entradas pendientes');
        const res = await entradasService.solicitarEntregaCovers({
          grupo_registro_id: grupo.id,
          cliente_nombre: grupo.cliente,
          entrada_ids: unidadesSolicitud.map(unidad => unidad.entrada_id as string),
          unidades: unidadesSolicitud,
          monto_total: filas
            .slice(0, unidadesSolicitud.length)
            .reduce((suma, fila) => suma + (Number(fila.monto_entrada) || 0), 0),
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
          const res = await entradasService.entregar(fila.id, {
            presentacion_id: unidad.presentacion_id,
            tipo_entrega: unidad.formato,
            acompanamientos: unidad.reparto.length ? unidad.reparto : null,
            monto_adicional: unidad.monto_adicional,
          });
          if (!res.success) throw new Error(res.message || 'No se pudo entregar el cover');
          entregadas += 1;
        }
      showToast({
        type: 'success',
        text1: entregadas === 1 ? 'Cover entregado' : `${entregadas} covers entregados`,
        text2: grupo.cliente,
      });
      await onEntregado();
      onClose();
      }
    } catch (err) {
      logger.fetchError(err, { context: 'EntregaCovers:entregar' });
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
    acompanamientos,
    entregando,
    faltanAcompanamientos,
    filas,
    grupo,
    lineas,
    onClose,
    onEntregado,
    presupuestoInsuficiente,
    topeCover,
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
    totalEntradas,
    montoAdicional,
    cambiarMontoAdicional,
    adicional,
    presupuesto,
    seleccion,
    visibles,
    totalSeleccionado,
    precioSeleccionado,
    cobroBarra,
    presupuestoInsuficiente,
    excedePresupuesto,
    excedeAdicional,
    lineas,
    faltanAcompanamientos,
    agregar,
    quitar,
    agregarSabor,
    ajustarSabor,
    quitarSabor,
    cerrar,
    entregar,
  };
}
