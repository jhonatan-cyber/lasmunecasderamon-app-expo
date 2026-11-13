import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  entradasService,
  type EntregaGrupoPayload,
  type SolicitudEntregaCoversPayload,
} from '@/services/entradas';
import { formatCurrency } from '@/utils/format';
import { productsService } from '@/services/products';
import logger from '@/utils/logger';
import { showToast } from '@/utils/toast-lazy';
import {
  acompanamientoDe,
  acompanamientosParaLinea,
  bebidaDe,
  calcularReparto,
  categoriaFueraDeCover,
  claveDe,
  consumoProducto,
  consumoSeleccion,
  costoSeleccion,
  formatosCover,
  normalizar,
  precioVisible,
  stockSeleccionValido,
  unidadesEntregaGrupo,
  unidadesPorEntrega,
} from './helpers';
import {
  formularioInicial,
  formularioReducer,
  seleccionInicial,
  seleccionReducer,
} from './reducer';
import type { Acompanamiento, Bebida, Formato, GrupoEntrega, LineaEntrega } from './types';

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
  onClose,
  onEntregado,
  modo = 'entrega',
}: UseEntregaCoversParams) {
  const enviando = useRef(false);
  const [formulario, dispatchFormulario] = useReducer(formularioReducer, formularioInicial);
  const { busqueda, montoAdicional, errorMonto } = formulario;
  const [seleccion, dispatch] = useReducer(seleccionReducer, seleccionInicial);
  const catalogo = useQuery({
    queryKey: ['covers', 'productos'],
    enabled: visible && grupo !== null,
    queryFn: async ({ signal }) => {
      const res = await productsService.forSale(signal);
      if (!res.success || !Array.isArray(res.data))
        throw new Error(res.message || 'No se pudieron cargar las bebidas del bar');
      return (res.data as unknown[]).map(bebidaDe).filter((item): item is Bebida => item !== null);
    },
  });
  const catalogoCover = useQuery({
    queryKey: ['covers', 'acompanamientos'],
    enabled: visible && grupo !== null,
    queryFn: async ({ signal }) => {
      const res = await productsService.forCover(signal);
      if (!res.success || !Array.isArray(res.data))
        throw new Error(res.message || 'No se pudieron cargar los acompañamientos del bar');
      return (res.data as unknown[])
        .map(acompanamientoDe)
        .filter((item): item is Acompanamiento => item !== null);
    },
  });
  const bebidas = useMemo(() => catalogo.data ?? [], [catalogo.data]);
  const acompanamientos = useMemo(() => catalogoCover.data ?? [], [catalogoCover.data]);
  const cargando = catalogo.isFetching || catalogoCover.isFetching;
  const error = catalogo.error?.message ?? catalogoCover.error?.message ?? null;
  const filas = useMemo(() => grupo?.filas ?? [], [grupo]);
  const totalEntradas = filas.reduce((total, fila) => total + (Number(fila.monto_entrada) || 0), 0);
  const adicional = Math.max(0, Math.floor(Number(montoAdicional) || 0));
  const presupuesto = totalEntradas + adicional;
  const limites = useMemo(
    () => ({ bebidas, acompanamientos, presupuesto }),
    [bebidas, acompanamientos, presupuesto],
  );

  useEffect(() => {
    if (!visible) return;
    dispatch({ type: 'reiniciar' });
    dispatchFormulario({ type: 'reiniciar' });
  }, [visible, grupo?.id]);

  const setBusqueda = useCallback((valor: string) => {
    dispatchFormulario({ type: 'busqueda', valor });
  }, []);

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda);
    return bebidas
      .flatMap((bebida) => {
        if (categoriaFueraDeCover(bebida.categoria_nombre)) return [];
        const formatos = formatosCover(bebida, presupuesto);
        // Lo ya elegido se mantiene visible aunque el presupuesto baje, para
        // poder ajustarlo antes de entregar.
        for (const formato of ['corte', 'botella'] as Formato[]) {
          const clave = claveDe(bebida, formato);
          if (seleccion[clave] && !formatos.includes(formato)) formatos.push(formato);
        }
        return formatos.map((formato) => ({ bebida, formato }));
      })
      .filter(
        ({ bebida, formato }) =>
          !termino ||
          Boolean(seleccion[claveDe(bebida, formato)]) ||
          normalizar(`${bebida.producto_nombre} ${bebida.presentacion_nombre}`).includes(termino),
      );
  }, [bebidas, busqueda, presupuesto, seleccion]);

  const gruposVisibles = useMemo(() => {
    const categorias = new Map<string, typeof visibles>();
    for (const item of visibles) {
      const categoria = item.bebida.categoria_nombre ?? 'Sin categoría';
      const items = categorias.get(categoria);
      if (items) items.push(item);
      else categorias.set(categoria, [item]);
    }
    return [...categorias]
      .sort(([a], [b]) => {
        if (a === b) return 0;
        if (a === 'Sin categoría') return 1;
        if (b === 'Sin categoría') return -1;
        return a.localeCompare(b, 'es');
      })
      .map(([categoria, items]) => ({ categoria, items }));
  }, [visibles]);

  const totalSeleccionado = useMemo(
    () => Object.values(seleccion).reduce((suma, linea) => suma + linea.cantidad, 0),
    [seleccion],
  );

  const lineas = useMemo<LineaEntrega[]>(
    () =>
      Object.entries(seleccion).flatMap(([clave, linea]) => {
        const [presentacionId, formato] = clave.split(':') as [string, Formato];
        const bebida = bebidas.find((item) => item.presentacion_id === presentacionId);
        if (!bebida) return [];
        return [{ clave, bebida, formato, ...linea }];
      }),
    [bebidas, seleccion],
  );

  const repartoDeLinea = useCallback(
    (bebida: Bebida, formato: Formato) => {
      const clave = claveDe(bebida, formato);
      const linea = seleccion[clave];
      return calcularReparto(
        bebida,
        formato,
        linea?.reparto ?? [],
        linea?.cantidad ?? 1,
        acompanamientos,
        acompanamientosParaLinea(clave, seleccion, acompanamientos),
      );
    },
    [acompanamientos, seleccion],
  );
  const faltanAcompanamientos = lineas.some(
    (linea) => repartoDeLinea(linea.bebida, linea.formato).falta,
  );
  const precioSeleccionado = costoSeleccion(seleccion, bebidas);
  const consumo = useMemo(() => consumoSeleccion(seleccion, bebidas), [seleccion, bebidas]);
  const excedePresupuesto = precioSeleccionado > presupuesto;
  const excedeStock = !stockSeleccionValido(seleccion, bebidas, acompanamientos);
  const mutacion = useMutation({
    mutationFn: async (payload: SolicitudEntregaCoversPayload) => {
      if (modo === 'solicitud') {
        const res = await entradasService.solicitarEntregaCovers(payload);
        if (!res.success) throw new Error(res.message || 'No se pudo enviar la solicitud');
        return;
      }
      const entrega: EntregaGrupoPayload = {
        entrada_ids: payload.entrada_ids,
        monto_adicional: payload.monto_adicional,
        unidades: payload.unidades.map(({ presentacion_id, tipo_entrega, acompanamientos }) => ({
          presentacion_id,
          tipo_entrega,
          acompanamientos,
        })),
      };
      const res = await entradasService.entregarGrupo(entrega);
      if (!res.success) throw new Error(res.message || 'No se pudo entregar el grupo');
    },
    retry: false,
  });
  const entregando = mutacion.isPending;
  const puedeAgregar = useCallback(
    (bebida: Bebida, formato: Formato) =>
      !entregando &&
      precioSeleccionado + precioVisible(bebida, formato) <= presupuesto &&
      (consumo.get(bebida.presentacion_id) ?? 0) + consumoProducto(bebida, formato) <=
        bebida.stock_bar + 1e-9,
    [consumo, entregando, precioSeleccionado, presupuesto],
  );
  const agregar = useCallback(
    (bebida: Bebida, formato: Formato) => {
      if (!entregando) dispatch({ type: 'agregar', bebida, formato, ...limites });
    },
    [entregando, limites],
  );

  const quitar = useCallback(
    (clave: string) => {
      if (entregando) return;
      const [id, formato] = clave.split(':') as [string, Formato];
      const bebida = bebidas.find((item) => item.presentacion_id === id);
      dispatch({
        type: 'quitar',
        clave,
        unidadesPorEntrega: bebida ? unidadesPorEntrega(bebida, formato) : 0,
      });
    },
    [bebidas, entregando],
  );
  const agregarSabor = useCallback(
    (clave: string, opcion: Acompanamiento) => {
      if (!entregando) dispatch({ type: 'agregarSabor', clave, opcion, ...limites });
    },
    [entregando, limites],
  );
  const ajustarSabor = useCallback(
    (clave: string, presentacionId: string, delta: number) => {
      if (!entregando)
        dispatch({
          type: 'ajustarSabor',
          clave,
          presentacionId,
          delta,
          ...limites,
        });
    },
    [entregando, limites],
  );
  const quitarSabor = useCallback(
    (clave: string, presentacionId: string) => {
      if (!entregando) dispatch({ type: 'quitarSabor', clave, presentacionId });
    },
    [entregando],
  );
  const cambiarMontoAdicional = useCallback(
    (valor: string) => {
      if (entregando) return;
      const limpio = valor.replace(/[^\d]/g, '');
      const nuevo = Number(limpio) || 0;
      if (!Number.isSafeInteger(nuevo) || totalEntradas + nuevo < precioSeleccionado) {
        dispatchFormulario({
          type: 'errorMonto',
          mensaje: `Quita productos antes de reducir el adicional. La selección requiere al menos ${formatCurrency(Math.max(0, precioSeleccionado - totalEntradas))}.`,
        });
        return;
      }
      dispatchFormulario({ type: 'errorMonto', mensaje: null });
      dispatchFormulario({ type: 'montoAdicional', valor: limpio });
    },
    [entregando, precioSeleccionado, totalEntradas],
  );

  const cerrar = useCallback(() => {
    if (entregando) return;
    onClose();
  }, [entregando, onClose]);

  const entregar = async () => {
    if (!grupo || entregando || enviando.current || cargando || error || filas.length === 0) return;
    if (!lineas.length || faltanAcompanamientos || excedePresupuesto || excedeStock) {
      showToast({
        type: 'error',
        text1: 'Revisa la selección',
        text2:
          'Elige productos y reparte sus acompañamientos dentro del presupuesto y stock disponibles.',
      });
      return;
    }
    enviando.current = true;
    try {
      await mutacion.mutateAsync({
        grupo_registro_id: grupo.id,
        cliente_nombre: grupo.cliente,
        entrada_ids: filas.map((fila) => fila.id),
        unidades: unidadesEntregaGrupo(lineas),
        monto_total: adicional,
        monto_adicional: adicional,
      });
    } catch (err) {
      logger.fetchError(err, { context: 'EntregaCovers:entregar' });
      showToast({
        type: 'error',
        text1:
          modo === 'solicitud' ? 'No se pudo enviar la solicitud' : 'No se pudo entregar el grupo',
        text2: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
      return;
    } finally {
      enviando.current = false;
    }
    showToast({
      type: 'success',
      text1:
        modo === 'solicitud'
          ? 'Solicitud enviada al cajero'
          : `${totalSeleccionado} productos entregados`,
      text2: modo === 'solicitud' ? 'La entrega quedará pendiente de autorización.' : grupo.cliente,
    });
    onClose();
    try {
      await onEntregado();
    } catch {
      showToast({
        type: 'error',
        text1: 'No se pudo actualizar el listado',
        text2: 'La operación ya se registró. Actualiza la pantalla.',
      });
    }
  };

  return {
    acompanamientos,
    busqueda,
    setBusqueda,
    cargando,
    error,
    errorMonto,
    entregando,
    filas,
    totalEntradas,
    montoAdicional,
    cambiarMontoAdicional,
    adicional,
    presupuesto,
    seleccion,
    visibles,
    gruposVisibles,
    totalSeleccionado,
    precioSeleccionado,
    excedePresupuesto,
    excedeStock,
    puedeAgregar,
    repartoDeLinea,
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
