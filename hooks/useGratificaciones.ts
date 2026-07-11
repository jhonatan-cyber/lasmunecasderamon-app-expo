import { apiClientSafe } from '@/api/client';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { showToast } from '@/utils/toast-lazy';

export interface GratificacionItem {
  id: string;
  usuario: string;
  usuario_id: string;
  monto: number;
  descripcion: string;
  estado: number;
  estado_texto?: string;
  fecha_crea: string;
  fecha_mod?: string | null;
}

export interface GratificacionEmployee {
  id: string;
  name: string;
  lastName: string;
  nick?: string;
  role?: string;
  status?: number;
}

export function useGratificaciones() {
  const [gratificaciones, setGratificaciones] = useState<GratificacionItem[]>([]);
  const [employees, setEmployees] = useState<GratificacionEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const normalizeEmployee = (item: any): GratificacionEmployee => ({
    id: String(item.id ?? item.id_usuario),
    name: item.name ?? item.nombre ?? '',
    lastName: item.lastName ?? item.apellido ?? '',
    nick: item.nick ?? '',
    role: item.role ?? item.rol ?? '',
    status: item.status ?? item.estado ?? 1
  });

  const fetchData = useCallback(async (isManual = false, signal?: AbortSignal) => {
    try {
      setError('');

      const [gratificacionesRes, usersRes] = await Promise.all([
        apiClientSafe('/gratificaciones', { signal }),
        apiClientSafe('/users?status=active', { signal })
      ]);

      const gratificacionesData = (gratificacionesRes as any)?.data || [];
      const usersData = Array.isArray((usersRes as any)?.data) ? (usersRes as any).data : [];

      const filteredEmployees = usersData
        .map(normalizeEmployee)
        .filter((user: GratificacionEmployee) => {
          const role = (user.role || '').toLowerCase();
          return !role.includes('administrador') && !role.includes('admin');
        });

      setGratificaciones(
        gratificacionesData.map((item: any) => ({
          id: String(item.id),
          usuario: item.usuario,
          usuario_id: String(item.id_usuario ?? item.usuario_id),
          monto: Number(item.monto || 0),
          descripcion: item.descripcion || '',
          estado: Number(item.estado || 0),
          estado_texto: item.estado_texto,
          fecha_crea: item.fecha_crea || item.fecha_hora,
          fecha_mod: item.fecha_mod || null
        }))
      );
      setEmployees(filteredEmployees);

      if (isManual) {
        showToast({ type: 'success', text1: 'Éxito', text2: 'Gratificaciones actualizadas' });
      }
    } catch (err: any) {
      const message = err?.message || 'Error al cargar gratificaciones';
      setError(message);
      if (isManual) {
        showToast({ type: 'error', text1: 'Error', text2: message });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const createGratificacion = useCallback(
    async (payload: { usuario_id: string; monto: number; descripcion: string }) => {
      try {
        setSubmitting(true);
        const response = await apiClientSafe('/gratificaciones', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (!(response as any)?.success) {
          throw new Error((response as any)?.message || 'No se pudo crear la gratificación');
        }

        await fetchData();
        showToast({
          type: 'success',
          text1: 'Solicitud enviada',
          text2:
            (response as any).pendingApproval
              ? 'Se envió al administrador por WhatsApp para aprobación'
              : 'Gratificación registrada correctamente'
        });

        return response;
      } catch (err: any) {
        const message = err?.message || 'Error al crear la gratificación';
        showToast({ type: 'error', text1: 'Error', text2: message });
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchData]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      const ac = new AbortController();
      fetchData(false, ac.signal);
      return () => ac.abort();
    }, [fetchData])
  );

  return {
    gratificaciones,
    employees,
    loading,
    refreshing,
    submitting,
    error,
    fetchData,
    createGratificacion,
    onRefresh
  };
}
