import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { apiClientSafe } from '@/api/client';
import {
  getMirror,
  MIRROR_KEYS,
  MIRROR_MAX_AGE_MS,
  OfflineCacheMissError,
} from '@/services/mirror';
import { useDebouncedEventListener } from '@/hooks/useDebouncedEventListener';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import { showToast } from '@/utils/toast-lazy';
import logger from '@/utils/logger';

export interface Pedido {
  id: string;
  id_pedido: string;
  codigo: string;
  cliente_nombre?: string | null;
  mesero_nombre?: string | null;
  mesero_nick?: string | null;
  nicks?: string | null;
  subtotal?: number;
  total: number;
  propina?: number;
  estado: number;
  fecha_crea?: string;
  metodo_pago?: string | null;
  baucher_foto?: string | null;
}

const normalizePedido = (row: any): Pedido => {
  const id = String(row?.id_pedido ?? row?.id ?? '');
  return {
    ...row,
    id,
    id_pedido: id,
    codigo: String(row?.codigo ?? ''),
    cliente_nombre: row?.cliente_nombre ?? null,
    mesero_nombre: row?.mesero_nombre ?? row?.garzon ?? null,
    nicks: row?.nicks ?? row?.usuarios_nicks ?? row?.anfitrionas_nicks ?? null,
    subtotal: Number(row?.subtotal ?? row?.sub_total ?? 0),
    total: Number(row?.total ?? 0),
    propina: Number(row?.propina ?? 0),
    estado: Number(row?.estado ?? 0),
    fecha_crea: row?.fecha_crea ?? row?.fecha_creacion ?? null,
  };
};

const extractRows = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.pedidos)) return payload.pedidos;
  return [];
};

/**
 * Pedidos propios del usuario autenticado (`/orders/user`), con el mismo listado que usa el
 * dashboard. Se lee a través del espejo para no dejar la pantalla vacía cuando
 * se cae la conexión.
 */
export function useMisPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const dataRef = useRef('');

  const fetchPedidos = useCallback(async (isManual = false, signal?: AbortSignal) => {
    try {
      setError('');
      const result = await getMirror().readThroughDetailed<any>(
        MIRROR_KEYS.ordersList,
        () => apiClientSafe('/orders/user', { signal }),
        { maxAgeMs: MIRROR_MAX_AGE_MS.operativo },
      );
      if (signal?.aborted) return;

      const payload = result.data;
      if (payload?.success === false) {
        throw new Error(payload?.message || 'No se pudieron cargar los pedidos');
      }

      const rows = extractRows(payload).map(normalizePedido);
      setPedidos(rows);
      setFromCache(result.fromCache);

      const serialized = JSON.stringify(rows);
      const hasChanges = dataRef.current !== serialized;
      dataRef.current = serialized;

      if (isManual) {
        showToast({
          type: hasChanges ? 'success' : 'info',
          text1: hasChanges ? 'Éxito' : 'Información',
          text2: hasChanges ? 'Pedidos actualizados' : 'Sin cambios en los pedidos',
          visibilityTime: 3000,
        });
      }
    } catch (err: any) {
      if (signal?.aborted) return;
      logger.fetchError(err, { context: 'useMisPedidos:fetchPedidos' });
      setError(
        err instanceof OfflineCacheMissError
          ? 'Sin conexión y sin pedidos guardados en este dispositivo.'
          : err?.message || 'No se pudieron cargar tus pedidos.',
      );
      if (isManual) {
        showToast({
          type: 'error',
          text1: 'Error',
          text2: 'No se pudo actualizar el listado de pedidos',
          visibilityTime: 3000,
        });
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void fetchPedidos(false, controller.signal);
      return () => controller.abort();
    }, [fetchPedidos]),
  );

  useDebouncedEventListener(
    REALTIME_EVENT_NAMES.refreshRequests,
    useCallback(() => {
      void fetchPedidos(false);
    }, [fetchPedidos]),
    500,
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchPedidos(true);
  }, [fetchPedidos]);

  return {
    pedidos,
    loading,
    refreshing,
    error,
    fromCache,
    onRefresh,
    fetchPedidos,
  };
}
