import { useCallback, useEffect, useRef, useState } from 'react';
import { barService } from '@/services/bar';
import { eventBus } from '@/utils/eventBus';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import { showToast } from '@/utils/toast-lazy';
import logger from '@/utils/logger';

export interface BarStockItem {
  id: string;
  producto_id: string;
  producto_nombre: string;
  nombre: string;
  codigo_barras: string | null;
  precio_venta: number;
  comision: number;
  stock: number;
  stock_bar?: number;
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
      const res = (await barService.stock(signal)) as ApiList<BarStockItem>;
      if (res?.success !== false) setStock(unwrapList<BarStockItem>(res));
    } catch (e) {
      if (!signal?.aborted) logger.captureException(e, { context: 'BarScreen:fetchStock' });
    }
  }, []);

  const fetchTransfers = useCallback(async (signal?: AbortSignal) => {
    setLoadingTransfers(true);
    try {
      const res = (await barService.pendingTransfers(signal)) as ApiList<BarTransfer>;
      const all = unwrapList<BarTransfer>(res);
      setTransfers(all.filter((t) => t.estado === 'pendiente'));
      setError(null);
    } catch (e) {
      if (!signal?.aborted) {
        logger.captureException(e, { context: 'BarScreen:fetchTransfers' });
        setError('No se pudieron cargar las recepciones');
      }
    } finally {
      if (!signal?.aborted) setLoadingTransfers(false);
    }
  }, []);

  const fetchMovements = useCallback(async (signal?: AbortSignal) => {
    setLoadingMovements(true);
    try {
      const res = (await barService.movements(100, signal)) as ApiList<BarMovement>;
      setMovements(unwrapList<BarMovement>(res));
    } catch (e) {
      if (!signal?.aborted) logger.captureException(e, { context: 'BarScreen:fetchMovements' });
    } finally {
      if (!signal?.aborted) setLoadingMovements(false);
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
    const subscription = eventBus.addListener(REALTIME_EVENT_NAMES.refreshBar, () => {
      logger.debug('[BarScreen] refresh_bar received');
      void fetchStock();
    });
    return () => subscription.remove();
  }, [fetchStock]);

  const loadMovements = useCallback(
    (signal?: AbortSignal) => {
      if (!loadedRef.current) return;
      fetchMovements(signal);
    },
    [fetchMovements],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStock(), fetchTransfers(), fetchMovements()]);
    setRefreshing(false);
  }, [fetchStock, fetchTransfers, fetchMovements]);

  const resolver = useCallback(
    async (id: string, accion: 'aprobar' | 'rechazar') => {
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
        await Promise.all([fetchStock(), fetchTransfers(), fetchMovements()]);
      } catch (e) {
        showToast({
          type: 'error',
          text1: 'Error',
          text2: e instanceof Error ? e.message : 'No se pudo resolver la solicitud',
        });
      } finally {
        setResolvingId(null);
      }
    },
    [fetchStock, fetchTransfers, fetchMovements],
  );

  const filteredStock = stock.filter((i) => (i.stock_bar ?? 0) > 0).filter((i) => {
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
    fetchTransfers,
  };
};
