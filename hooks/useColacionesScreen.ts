import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { colacionesService, reglaPorRol, mlDeColacion, acompanamientoDeColacion, acompanamientosDeColacion, type ColacionRegistro, type ColacionProducto, type ReglaColacionResponse } from '@/services/colaciones';
import { usersService } from '@/services';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import type { CajaAbiertaInfo } from '@/store/cajaAbiertaStore';
import { useAccentColor } from '@/hooks/useAccentColor';
import { showToast } from '@/utils/toast-lazy';

interface LimpioTrabajador {
  id: string;
  name: string;
  lastName: string;
  nick?: string;
  role?: string;
}

function parseTrabajador(data: any[]): LimpioTrabajador[] {
  return Array.isArray(data)
    ? data
        .filter(
          (u) =>
            u &&
            u.id &&
            u.name &&
            String(u.status ?? u.estado ?? 1) === '1' &&
            (u.role ?? '').toString().toLowerCase() !== 'administrador' &&
            (u.lastName ?? u.apellido ?? '').toString().trim().length > 0
        )
        .map((u) => ({
          id: String(u.id),
          name: String(u.name),
          lastName: String(u.lastName ?? u.apellido ?? ''),
          nick: u.nick ? String(u.nick) : undefined,
          role: u.role ? String(u.role) : undefined,
        }))
    : [];
}

export function useColacionesScreen() {
  const { accentColor, bg, cardBg, surfaceMuted, textPrimary, textSecondary, borderColor } = useAccentColor();
  const { cajaAbierta, cajaInfo } = useCajaAbierta();
  // useCajaAbierta garantiza que el estado se refresca al montar y al recibir
  // eventos de caja abierta/cerrada, evitando que la pantalla muestre el mensaje
  // de "caja cerrada" cuando ya hay una caja abierta.

  const [rule, setRule] = useState<ReglaColacionResponse | null>(null);
  const [ruleLoading, setRuleLoading] = useState(true);
  const [ruleError, setRuleError] = useState<string | null>(null);

  const [productos, setProductos] = useState<ColacionProducto[]>([]);
  const [productosLoading, setProductosLoading] = useState(false);
  const [productosError, setProductosError] = useState<string | null>(null);

  const [analcoholicas, setAnalcoholicas] = useState<ColacionProducto[]>([]);
  const [analcoholicasLoading, setAnalcoholicasLoading] = useState(false);
  const [analcoholicasError, setAnalcoholicasError] = useState<string | null>(null);

  const [trabajadores, setTrabajadores] = useState<LimpioTrabajador[]>([]);
  const [trabajadoresLoading, setTrabajadoresLoading] = useState(false);
  const [trabajadoresError, setTrabajadoresError] = useState<string | null>(null);

  const [registros, setRegistros] = useState<ColacionRegistro[]>([]);
  const [registrosLoading, setRegistrosLoading] = useState(true);
  const [registrosError, setRegistrosError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [workerId, setWorkerId] = useState<string>('');
  const [productoId, setProductoId] = useState<string>('');
  const [acompanamientoId, setAcompanamientoId] = useState<string>('');

  const setSelectedWorker = useCallback(
    (id: string) => {
      setWorkerId(id);
      setProductoId('');
      setAcompanamientoId('');
    },
    [setProductoId, setAcompanamientoId]
  );

  const setSelectedProducto = useCallback(
    (id: string) => {
      setProductoId(id);
      setAcompanamientoId('');
    },
    []
  );

  const setSelectedAcompanamiento = useCallback((id: string) => {
    setAcompanamientoId(id ?? '');
  }, []);

  const selectedWorker = useMemo(
    () =>
      trabajadores.find((t) => t.id === workerId) ?? null,
    [trabajadores, workerId]
  );

  const ruleFromWorker = useMemo(() => {
    if (!rule) return null;
    return reglaPorRol(rule, selectedWorker?.role ?? '');
  }, [rule, selectedWorker]);

  const catalogoVisible = useMemo(() => {
    if (!ruleFromWorker) return [];
    if (ruleFromWorker.catalogo === 'productos') return productos;
    if (ruleFromWorker.catalogo === 'analcoholicas') return analcoholicas;
    return [];
  }, [ruleFromWorker, productos, analcoholicas]);

  const productoSeleccionado = useMemo(() => {
    const lista = ruleFromWorker?.catalogo === 'productos' ? productos : analcoholicas;
    return lista.find((p) => String(p.presentacion_id) === productoId) ?? null;
  }, [productoId, ruleFromWorker, productos, analcoholicas]);

  const opcionBotella = useMemo(() => {
    if (!productoSeleccionado) return null;
    return (productoSeleccionado.opciones_venta ?? [])
      .find((o) => o.tipo === 'botella') ?? null;
  }, [productoSeleccionado]);

  const acompanamientoConfigurado = useMemo(() => {
    if (!productoSeleccionado) return { unidades: 0, ml: null as unknown as number | null };
    return acompanamientoDeColacion(productoSeleccionado);
  }, [productoSeleccionado]);

  const requiereAcompanamiento = acompanamientoConfigurado.unidades > 0;
  const mlPorRegistrar = useMemo(() => {
    if (!productoSeleccionado) return 0;
    return mlDeColacion(productoSeleccionado);
  }, [productoSeleccionado]);

  const acompanamientos = useMemo(
    () =>
      acompanamientosDeColacion(
        analcoholicas,
        productoSeleccionado,
        acompanamientoConfigurado.unidades
      ),
    [analcoholicas, productoSeleccionado, acompanamientoConfigurado.unidades]
  );
  const acompanamientosLoading = analcoholicasLoading;
  const acompanamientosError = analcoholicasError;

  const selectedAcompanamiento = useMemo(
    () => acompanamientos.find((a) => String(a.id) === acompanamientoId) ?? null,
    [acompanamientos, acompanamientoId]
  );

  const isCajaAbierta = cajaAbierta === true;

  /** Colaciones ya recibidas por trabajador en el turno visible. */
  const recepcionesPorTrabajador = useMemo(() => {
    const conteos: Record<string, number> = {};
    for (const fila of registros) {
      if (!fila.usuario_id) continue;
      conteos[fila.usuario_id] = (conteos[fila.usuario_id] ?? 0) + 1;
    }
    return conteos;
  }, [registros]);

  const cargarReglas = useCallback(
    async (signal?: AbortSignal): Promise<ReglaColacionResponse | null> => {
      try {
        setRuleLoading(true);
        const res = await colacionesService.regla(signal);
        if (!res.success || !res.data) {
          throw new Error(res.message || res.error || 'No se pudo cargar la regla de colaciones');
        }
        setRule(res.data);
        setRuleError(null);
        return res.data;
      } catch (err) {
        setRuleError(err instanceof Error ? err.message : 'Error desconocido');
        return null;
      } finally {
        setRuleLoading(false);
      }
    },
    []
  );

  const cargarCatalogos = useCallback(
    async (regla: ReglaColacionResponse, signal?: AbortSignal) => {
      try {
        setProductosLoading(true);
        setAnalcoholicasLoading(true);
        const [pr, ar] = await Promise.all([
          colacionesService.catalogo(regla, 'productos', signal),
          colacionesService.catalogo(regla, 'analcoholicas', signal),
        ]);
        if (!pr.success || !ar.success) {
          if (!pr.success) setProductosError(pr.message || pr.error || 'No se pudo cargar el catálogo');
          if (!ar.success) setAnalcoholicasError(ar.message || ar.error || 'No se pudo cargar el catálogo');
          return;
        }
        setProductos(Array.isArray(pr.data) ? pr.data : []);
        setAnalcoholicas(Array.isArray(ar.data) ? ar.data : []);
        setProductosError(null);
        setAnalcoholicasError(null);
      } catch (err) {
        const mensaje =
          err instanceof Error ? err.message : 'No se pudo cargar el catálogo de colaciones';
        setProductosError(mensaje);
        setAnalcoholicasError(mensaje);
      } finally {
        setProductosLoading(false);
        setAnalcoholicasLoading(false);
      }
    },
    []
  );

  const cargarTrabajadores = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setTrabajadoresLoading(true);
        const res = await usersService.list('status=active&limit=500', signal);
        if (!res.success || !res.data) {
          throw new Error(res.message || res.error || 'No se pudo cargar el personal');
        }
        setTrabajadores(parseTrabajador(res.data as any[]));
        setTrabajadoresError(null);
      } catch (err) {
        setTrabajadoresError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setTrabajadoresLoading(false);
      }
    },
    []
  );

  const cargarRegistros = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setRegistrosLoading(true);
        // Sin caja abierta el servidor usa su fecha de negocio; mandar la del
        // dispositivo desfasaba el turno después de las 21:00 en Chile.
        const params: { caja_id?: string } = {};
        const caja = cajaInfo as CajaAbiertaInfo | undefined;
        if (caja?.id_caja) {
          params.caja_id = String(caja.id_caja);
        }
        const res = await colacionesService.listar(params, signal);
        if (!res.success || !res.data) {
          throw new Error(res.message || res.error || 'No se pudieron cargar las colaciones del turno');
        }
        setRegistros(Array.isArray(res.data) ? res.data : []);
        setRegistrosError(null);
      } catch (err) {
        setRegistrosError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setRegistrosLoading(false);
      }
    },
    [cajaInfo]
  );

  const registrar = useCallback(async () => {
    if (!workerId || !productoId) {
      showToast({ type: 'error', text1: 'Selecciona trabajador y bebida' });
      return;
    }
    if (!selectedWorker) {
      showToast({ type: 'error', text1: 'Selecciona un trabajador válido' });
      return;
    }
    if (!ruleFromWorker) {
      showToast({ type: 'error', text1: 'Este rol no recibe colación' });
      return;
    }
    if (!productoSeleccionado) {
      showToast({ type: 'error', text1: 'Selecciona una bebida habilitada' });
      return;
    }
    if (mlPorRegistrar <= 0) {
      showToast({ type: 'error', text1: 'La bebida no tiene la colación configurada' });
      return;
    }
    if (requiereAcompanamiento && !acompanamientoId) {
      showToast({ type: 'error', text1: 'Selecciona el acompañamiento' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        usuario_id: workerId,
        presentacion_id: String(productoSeleccionado.presentacion_id),
        ml_bebida: mlPorRegistrar,
        nombre_bebida: `${productoSeleccionado.producto_nombre} ${productoSeleccionado.presentacion_nombre}`.trim(),
        acompanamiento: acompanamientoId ? ('gaseosa' as const) : null,
        ...(acompanamientoId ? { acompanamiento_presentacion_id: acompanamientoId } : {}),
      };
      const res = await colacionesService.registrar(payload);
      if (!res.success) {
        throw new Error(res.message || res.error || 'No se pudo registrar la colación');
      }
      showToast({ type: 'success', text1: 'Colación registrada' });
      setWorkerId('');
      setProductoId('');
      setAcompanamientoId('');
      // El stock y los ml abiertos cambian con lo recién entregado.
      await Promise.all([
        cargarRegistros(),
        rule ? cargarCatalogos(rule) : Promise.resolve(),
      ]);
    } catch (err) {
      showToast({
        type: 'error',
        text1: 'No se pudo registrar',
        text2: err instanceof Error ? err.message : 'Intenta de nuevo',
      });
    } finally {
      setSaving(false);
    }
  }, [
    workerId,
    productoId,
    selectedWorker,
    ruleFromWorker,
    productoSeleccionado,
    mlPorRegistrar,
    acompanamientoId,
    requiereAcompanamiento,
    rule,
    cargarRegistros,
    cargarCatalogos,
  ]);

  /**
   * Recarga la pantalla. El catálogo depende de la regla (endpoint y
   * parámetros), así que se pide en cadena: en el primer foco `rule` todavía
   * es null y las demás cargas no necesitan esperarla.
   */
  const recargar = useCallback(
    async (signal?: AbortSignal) => {
      await Promise.all([
        cargarTrabajadores(signal),
        cargarRegistros(signal),
        (async () => {
          const regla = await cargarReglas(signal);
          if (regla) await cargarCatalogos(regla, signal);
        })(),
      ]);
    },
    [cargarReglas, cargarCatalogos, cargarTrabajadores, cargarRegistros]
  );

  useFocusEffect(useCallback(() => {
    void recargar();
    return () => {};
  }, [recargar]));


  return {
    accentColor,
    surfaceMuted,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
    rule,
    ruleLoading,
    ruleError,
    productos,
    productosLoading,
    productosError,
    analcoholicas,
    analcoholicasLoading,
    analcoholicasError,
    trabajadores,
    trabajadoresLoading,
    trabajadoresError,
    acompanamientos,
    acompanamientosLoading,
    acompanamientosError,
    registros,
    registrosLoading,
    registrosError,
    saving,
    workerId,
    productoId,
    acompanamientoId,
    setSelectedWorker,
    setSelectedProducto,
    setSelectedAcompanamiento,
    registrar,
    cajaAbierta,
    cajaInfo,
    selectedWorker,
    ruleFromWorker,
    catalogoVisible,
    productoSeleccionado,
    opcionBotella,
    acompanamientoConfigurado,
    requiereAcompanamiento,
    mlPorRegistrar,
    selectedAcompanamiento,
    recargar,
    recepcionesPorTrabajador,
    isCajaAbierta,
  };
}

export type ColacionesScreenResult = ReturnType<typeof useColacionesScreen>;
