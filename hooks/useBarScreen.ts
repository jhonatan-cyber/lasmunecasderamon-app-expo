import { useCallback, useEffect, useRef, useState } from 'react';
import { barService } from '@/services/bar';
import {
  getMirror,
  MIRROR_KEYS,
  MIRROR_MAX_AGE_MS,
  OfflineCacheMissError,
} from '@/services/mirror';
import { blockOffline } from '@/utils/offlineGuard';
import { eventBus } from '@/utils/eventBus';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import { showToast } from '@/utils/toast-lazy';
import logger from '@/utils/logger';
import type { SaleOption } from '@/hooks/utils/saleChoice';

export interface BarStockItem {
  id: string;
  producto_id: string;
  producto_nombre: string;
  producto_foto?: string | null;
  nombre: string;
  codigo_barras: string | null;
  precio_venta: number;
  comision: number;
  opciones_venta?: SaleOption[] | string | null;
  ml_shot?: number | null;
  ml_shot_anfitriona?: number | null;
  stock: number;
  stock_bar?: number;
  /** Botellas agotadas por shots que siguen en el bar pendientes de devolución. */
  botellas_vacias_shots?: number;
  botellas_abiertas?: {
    id: string;
    codigo: string;
    codigo_barras: string | null;
    ml_restante: number;
  }[];
  botellas_por_devolver?: {
    id: string;
    codigo: string;
    codigo_barras: string | null;
    ml_restante: number;
  }[];
  ml_abierta?: number;
  ml_servidos?: number;
}

export interface BarTransfer {
  id: string;
  estado: string;
  producto_nombre: string;
  presentacion_nombre: string;
  cantidad: number;
  fecha_crea: string;
  usuario_nombre: string;
  precio_venta: number;
  comision: number;
  opciones_venta?: SaleOption[] | string | null;
  ml_shot?: number | null;
  ml_shot_anfitriona?: number | null;
  producto_id?: string | null;
  categoria_nombre?: string | null;
  aceptado_nombre?: string | null;
  aceptado_por?: string | null;
  fecha_aceptacion?: string | null;
}

export interface BarMovement {
  id: string;
  tipo: string;
  estado?: string;
  cantidad: number;
  ml?: number | null;
  precio_venta: number | null;
  comision: number | null;
  fecha_crea: string;
  producto_nombre: string | null;
  presentacion_nombre: string | null;
  usuario_nombre: string | null;
  usuario_nick: string | null;
  producto_id?: string | null;
  presentacion_id?: string | null;
  producto_foto?: string | null;
  codigo_barras?: string | null;
  categoria_nombre?: string | null;
  aceptado_nombre?: string | null;
  aceptado_por?: string | null;
  fecha_aceptacion?: string | null;
  referencia?: string | null;
  opciones_venta?: SaleOption[] | string | null;
  ml_shot?: number | null;
  ml_shot_anfitriona?: number | null;
}

type ApiList<T> = { success?: boolean; data?: T[] | { data?: T[] } | null };

const unwrapList = <T,>(res: ApiList<T>): T[] => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data as T[];
  return [];
};

export const useBarScreen = () => {
  const [stock, setStock] = useState<BarStockItem[]>([]);
  const [transfers, setTransfers] = useState<BarTransfer[]>([]);
  const [movements, setMovements] = useState<BarMovement[]>([]);
  const [transferHistory, setTransferHistory] = useState<BarTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const fetchStock = useCallback(async (signal?: AbortSignal) => {
    try {
      // Red primero; sin red se sirve el stock guardado en el dispositivo: el
      // barman sigue viendo la barra aunque caiga la conexión.
      const lectura = await getMirror().readThroughDetailed(
        MIRROR_KEYS.barStock,
        async () => (await barService.stock(signal)) as ApiList<BarStockItem>,
        { maxAgeMs: MIRROR_MAX_AGE_MS.operativo },
      );
      const res = lectura.data;
      if (res?.success !== false) setStock(unwrapList<BarStockItem>(res));
    } catch (e) {
      if (signal?.aborted) return;
      if (e instanceof OfflineCacheMissError) {
        setError(e.message);
        return;
      }
      logger.fetchError(e, { context: 'BarScreen:fetchStock' });
    }
  }, []);

  const fetchTransfers = useCallback(async (signal?: AbortSignal) => {
    setLoadingTransfers(true);
    try {
      const lectura = await getMirror().readThroughDetailed(
        MIRROR_KEYS.barTransfers,
        async () => (await barService.pendingTransfers(signal)) as ApiList<BarTransfer>,
        { maxAgeMs: MIRROR_MAX_AGE_MS.operativo },
      );
      const all = unwrapList<BarTransfer>(lectura.data);
      setTransfers(all.filter((t) => t.estado === 'pendiente'));
      setError(null);
    } catch (e) {
      if (!signal?.aborted) {
        if (e instanceof OfflineCacheMissError) {
          setError(e.message);
        } else {
          logger.fetchError(e, { context: 'BarScreen:fetchTransfers' });
          setError('No se pudieron cargar las recepciones');
        }
      }
    } finally {
      if (!signal?.aborted) setLoadingTransfers(false);
    }
  }, []);

  const fetchMovements = useCallback(async (signal?: AbortSignal) => {
    setLoadingMovements(true);
    try {
      const lectura = await getMirror().readThroughDetailed(
        MIRROR_KEYS.barMovements,
        async () => (await barService.movements(100, signal)) as ApiList<BarMovement>,
        { maxAgeMs: MIRROR_MAX_AGE_MS.operativo },
      );
      setMovements(unwrapList<BarMovement>(lectura.data));
    } catch (e) {
      if (signal?.aborted) return;
      if (e instanceof OfflineCacheMissError) return;
      logger.fetchError(e, { context: 'BarScreen:fetchMovements' });
    } finally {
      if (!signal?.aborted) setLoadingMovements(false);
    }
  }, []);

  const fetchTransferHistory = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await barService.transfers(signal) as {
        success?: boolean;
        data?: { history?: BarTransfer[] };
      };
      if (response?.success !== false) setTransferHistory(response?.data?.history ?? []);
    } catch (e) {
      if (!signal?.aborted) logger.fetchError(e, { context: 'BarScreen:fetchTransferHistory' });
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      if (!loadedRef.current) setLoading(true);
      await Promise.all([fetchStock(ac.signal), fetchTransfers(ac.signal)]);
      loadedRef.current = true;
      setLoading(false);
    })();
    return () => ac.abort();
  }, [fetchStock, fetchTransfers]);

  // `bar_shot_alert` (SSE): una botella bajó del umbral de shots y su ml cambió:
  // la pantalla Bar, si está abierta, refresca el stock sin esperar al pull.
  useEffect(() => {
    const subscription = eventBus.addListener(REALTIME_EVENT_NAMES.refreshBar, (payload) => {
      logger.debug('[BarScreen] refresh_bar received', { type: payload?.type });
      void fetchStock();
      if (payload?.type === 'transfers_updated') void fetchTransfers();
    });
    return () => subscription.remove();
  }, [fetchStock, fetchTransfers]);

  const loadMovements = useCallback(
    (signal?: AbortSignal) => {
      if (!loadedRef.current) return;
      fetchMovements(signal);
    },
    [fetchMovements],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStock(), fetchTransfers(), fetchMovements(), fetchTransferHistory()]);
    setRefreshing(false);
  }, [fetchStock, fetchTransfers, fetchMovements, fetchTransferHistory]);

  const resolver = useCallback(
    async (id: string, accion: 'aprobar' | 'rechazar') => {
      // Aprobar mueve stock entre almacén y bar: es decisión del servidor, no
      // se encola ni se confirma en el dispositivo.
      if (!blockOffline('transferencia')) return false;

      setResolvingId(id);
      try {
        const res =
          accion === 'aprobar'
            ? await barService.acceptTransfer(id)
            : await barService.rejectTransfer(id);
        if ((res as { success?: boolean })?.success === false) {
          throw new Error((res as { message?: string }).message || 'No se pudo resolver la solicitud.');
        }
        showToast({
          type: 'success',
          text1: accion === 'aprobar' ? 'Transferencia aprobada' : 'Transferencia rechazada',
        });
        await Promise.all([fetchStock(), fetchTransfers(), fetchMovements(), fetchTransferHistory()]);
        return true;
      } catch (e) {
        showToast({
          type: 'error',
          text1: 'Error',
          text2: e instanceof Error ? e.message : 'No se pudo resolver la solicitud',
        });
        return false;
      } finally {
        setResolvingId(null);
      }
    },
    [fetchStock, fetchTransfers, fetchMovements, fetchTransferHistory],
  );

  const filteredStock = stock.filter((i) =>
    (i.stock_bar ?? 0) > 0 || (i.botellas_vacias_shots ?? 0) > 0,
  ).filter((i) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      i.producto_nombre.toLowerCase().includes(term) ||
      i.nombre.toLowerCase().includes(term) ||
      (i.codigo_barras || '').toLowerCase().includes(term)
    );
  });

  const totalBar = stock.reduce((acc, i) => acc + (i.stock_bar ?? 0), 0);

  return {
    stock: filteredStock,
    allStock: stock,
    transfers,
    movements,
    transferHistory,
    loading,
    refreshing,
    loadingTransfers,
    loadingMovements,
    resolvingId,
    search,
    setSearch,
    error,
    totalBar,
    onRefresh,
    resolver,
    loadMovements,
    fetchTransferHistory,
    fetchTransfers,
  };
};
