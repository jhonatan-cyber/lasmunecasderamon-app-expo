import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { colacionesService, reglaPorRol, mlDeColacion, acompanamientoDeColacion, type ColacionRegistro, type ColacionProducto, type AcompanamientoOpcion, type ReglaColacionResponse } from '@/services/colaciones-helpers';
import { usersService } from '@/services';
import { useCajaAbiertaStore, type CajaAbiertaInfo } from '@/store/cajaAbiertaStore';
import { useAuthStore } from '@/store/authStore';
import { useAccentColor } from '@/hooks/useAccentColor';
import { showToast } from '@/utils/toast-lazy';
import logger from '@/utils/logger';
import { eventBus } from '@/utils/eventBus';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';

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
            String(u.estado ?? 1) === '1' &&
            String(u.nombre?.toLowerCase() ?? '').toLowerCase() !== 'administrador' &&
            (u.last_name ?? '').toString().trim().length > 0 &&
            !/^admin/i.test((u.last_name ?? '').toString())
        )
        .map((u) => ({
          id: String(u.id),
          name: String(u.name),
          lastName: String(u.last_name ?? ''),
          nick: u.nick ? String(u.nick) : undefined,
          role: u.role ? String(u.role) : undefined,
        }))
    : [];
}

export function useColacionesScreen() {
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const user = useAuthStore((s) => s.user);
  const cajaAbierta = useCajaAbiertaStore((s) => s.cajaAbierta);
  const cajaInfo = useCajaAbiertaStore((s) => s.cajaInfo);

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

  const [acompanamientos, setAcompanamientos] = useState<AcompanamientoOpcion[]>([]);
  const [acompanamientosLoading, setAcompanamientosLoading] = useState(false);
  const [acompanamientosError, setAcompanamientosError] = useState<string | null>(null);

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

  const selectedAcompanamiento = useMemo(
    () => acompanamientos.find((a) => String(a.id) === acompanamientoId) ?? null,
    [acompanamientos, acompanamientoId]
  );

  const fecha = new Date().toISOString().slice(0, 10);
  const isCajaAbierta = cajaAbierta === true;

  const cargarReglas = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setRuleLoading(true);
        const res = await colacionesService.regla(signal);
        if (!res.success || !res.data) {
          throw new Error(res.message || res.error || 'No se pudo cargar la regla de colaciones');
        }
        setRule(res.data);
        setRuleError(null);
      } catch (err) {
        setRuleError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setRuleLoading(false);
      }
    },
    []
  );

  const cargarCatalogos = useCallback(
    async (signal?: AbortSignal) => {
      if (!rule) return;
      try {
        setProductosLoading(true);
        setAnalcoholicasLoading(true);
        const [pr, ar] = await Promise.all([
          colacionesService.catalogo(rule, 'productos', signal),
          colacionesService.catalogo(rule, 'analcoholicas', signal),
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
      } finally {
        setProductosLoading(false);
        setAnalcoholicasLoading(false);
      }
    },
    [rule]
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

  const cargarAcompanamientos = useCallback(
    async (signal?: AbortSignal) => {
      if (!requiereAcompanamiento) {
        setAcompanamientos([]);
        setAcompanamientosLoading(false);
        return;
      }
      try {
        setAcompanamientosLoading(true);
        const res = await colacionesService.acompanamientos(signal);
        if (!res.success || !res.data) {
          throw new Error(res.message || res.error || 'No se pudieron cargar los acompañamientos');
        }
        setAcompanamientos(Array.isArray(res.data) ? res.data : []);
        setAcompanamientosError(null);
      } catch (err) {
        setAcompanamientosError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setAcompanamientosLoading(false);
      }
    },
    [requiereAcompanamiento]
  );

  const cargarRegistros = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setRegistrosLoading(true);
        const params: { fecha?: string; caja_id?: string } = { fecha };
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
    [fecha, cajaInfo]
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
    if (!acompanamientoId) {
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
      await Promise.all([cargarRegistros(), cargarAcompanamientos()]);
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
    cargarRegistros,
    cargarAcompanamientos,
  ]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      void cargarReglas(signal);
      void cargarCatalogos(signal);
      void cargarTrabajadores(signal);
      void cargarRegistros(signal);
    },
    [cargarReglas, cargarCatalogos, cargarTrabajadores, cargarRegistros]
  );

  useFocusEffect(useCallback(() => {
    void load();
    return () => {};
  }, [load]));


  return {
    accentColor,
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
    cargarReglas,
    cargarCatalogos,
    cargarTrabajadores,
    cargarAcompanamientos,
    cargarRegistros,
    fecha,
    isCajaAbierta,
  };
}

export type ColacionesScreenResult = ReturnType<typeof useColacionesScreen>;
