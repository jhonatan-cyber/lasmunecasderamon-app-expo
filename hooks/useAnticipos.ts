import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiClientSafe } from "@/api/client";
import { showToast } from '@/utils/toast-lazy';
import * as Haptics from "expo-haptics";

import { AnticipoRequestSchema } from '@lasmunecasderamon/validations';

import logger from '@/utils/logger';
export interface Anticipo {
  id_solicitud: number | string;
  usuario_id: number | string;
  fecha_crea: string;
  fecha_mod: string | null;
  monto: number;
  estado: 'pendiente' | 'confirmada' | 'rechazada';
  estado_texto: string;
  usuario?: string;
  motivo?: string;
  motivo_rechazo?: string;
}

export function useAnticipos() {
  const [solicitudes, setSolicitudes] = useState<Anticipo[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  const [montoMaximo, setMontoMaximo] = useState(0);
  const [montoAsistencia, setMontoAsistencia] = useState(0);
  const [montoComisiones, setMontoComisiones] = useState(0);
  const [montoPropinas, setMontoPropinas] = useState(0);
  const [tieneSolicitudPendiente, setTieneSolicitudPendiente] = useState(false);

  const fetchAnticipos = useCallback(async (isManual = false, signal?: AbortSignal) => {
    try {
      setError('');
      const [solicitudesRes, pagosRes] = await Promise.all([
        apiClientSafe('/anticipos/solicitudes', { signal }),
        apiClientSafe('/anticipos/user', { signal }),
      ]);
      if (solicitudesRes.success) setSolicitudes((solicitudesRes.data || []) as Anticipo[]);
      if (pagosRes.success) setPagos((pagosRes.data || []) as any[]);
      
      if (isManual) {
        showToast({ type: 'success', text1: 'Éxito', text2: 'Datos actualizados' });
      }
    } catch (err: any) {
      if ((err as any)?.name === 'AbortError') return;
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMaximo = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await apiClientSafe('/anticipos/maximo', { signal });
      if (response.success && response.data) {
        const d = response.data as { monto_asistencia?: number; monto_comisiones?: number; monto_propinas?: number; monto_maximo?: number; tiene_solicitud_pendiente?: boolean };
        setMontoAsistencia(d.monto_asistencia || 0);
        setMontoComisiones(d.monto_comisiones || 0);
        setMontoPropinas(d.monto_propinas || 0);
        setMontoMaximo(d.monto_maximo || 0);
        setTieneSolicitudPendiente(d.tiene_solicitud_pendiente || false);
        return d;
      }
    } catch (e) {
      if ((e as any)?.name === 'AbortError') return null;
      logger.captureException(e, { context: 'useAnticipos:fetchMaximo' });
    }
    return null;
  }, []);

  const solicitarAnticipo = async (monto: number, motivo: string) => {
    const validation = AnticipoRequestSchema.safeParse({ monto, motivo });

    if (!validation.success) {
      const msg = validation.error.issues[0]?.message || 'Datos inválidos';
      showToast({ type: 'warning', text1: 'Atención', text2: msg });
      return false;
    }

    const { monto: montoVal, motivo: motivoVal } = validation.data;

    try {
      const response = await apiClientSafe('/anticipos/solicitudes', {
        method: 'POST',
        body: JSON.stringify({ monto: montoVal, motivo: motivoVal }),
      });
      if (response.success) {
        showToast({ type: 'success', text1: 'Éxito', text2: 'Solicitud enviada correctamente' });
        fetchAnticipos();
        return true;
      } else {
        showToast({ type: 'warning', text1: 'Atención', text2: response.message || 'No se pudo enviar la solicitud' });
      }
    } catch (error: any) {
      const mensaje = error?.message || 'Error de conexión';
      showToast({ type: 'error', text1: 'Error', text2: mensaje });
    }
    return false;
  };

  useFocusEffect(
    useCallback(() => {
      const ac = new AbortController();
      fetchAnticipos(false, ac.signal);
      fetchMaximo(ac.signal);
      return () => ac.abort();
    }, [fetchAnticipos, fetchMaximo])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('refresh_anticipos', () => {
      fetchAnticipos();
    });

    return () => subscription.remove();
  }, [fetchAnticipos]);

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchAnticipos(true);
  }, [fetchAnticipos]);

  return {
    solicitudes,
    pagos,
    loading,
    refreshing,
    error,
    montoMaximo,
    montoAsistencia,
    montoComisiones,
    montoPropinas,
    tieneSolicitudPendiente,
    fetchAnticipos,
    fetchMaximo,
    solicitarAnticipo,
    onRefresh
  };
}

