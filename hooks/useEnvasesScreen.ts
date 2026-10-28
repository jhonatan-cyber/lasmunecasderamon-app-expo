import { useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { barService } from '@/services/bar';
import {
  getMirror,
  MIRROR_KEYS,
  MIRROR_MAX_AGE_MS,
  OfflineCacheMissError,
} from '@/services/mirror';
import { blockOffline } from '@/utils/offlineGuard';
import { showToast } from '@/utils/toast-lazy';
import { emitRefreshBar, REALTIME_EVENT_NAMES } from '@/utils/realtime';
import { useDebouncedEventListener } from '@/hooks/useDebouncedEventListener';
import logger from '@/utils/logger';

export const MOTIVO_ENVASE: Record<string, string> = {
  no_es_nuestro: 'No es nuestro',
  no_esta_vacia: 'No está vacío',
  ya_devuelto: 'Ya entregado',
  venta_entera: 'Se vendió entera',
  no_entregado: 'El bar no lo entregó',
  ya_confirmado: 'Ya confirmado',
};

export interface EnvaseUnidad {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  estado: string;
  ml_merma: number;
  fecha_devolucion: string | null;
  fecha_confirmacion: string | null;
  producto_nombre: string | null;
  presentacion_nombre: string | null;
  compra_folio: string | null;
}

export interface EnvaseDevolucion extends EnvaseUnidad {
  usuario_nombre: string | null;
  usuario_apellido: string | null;
  usuario_nick: string | null;
  confirmado_nombre: string | null;
  confirmado_apellido: string | null;
  confirmado_nick: string | null;
  pendiente_confirmacion: boolean;
}

export interface EnvaseResultado {
  ok: boolean;
  motivo?: string;
  mensaje: string;
  unidad: EnvaseUnidad | null;
}

export interface EnvaseEscaneo {
  id: string;
  codigo: string;
  ok: boolean;
  motivo: string | null;
  mensaje: string;
  hora: string;
}

export interface EnvaseResumen {
  pendientes: number;
  vencidos: number;
  umbral_horas?: number;
}

export interface EnvaseVeredicto {
  ok: boolean;
  texto: string;
}

export interface EnvaseResultadoLote {
  codigo: string;
  ok: boolean;
  texto: string;
}

const MAXIMO_SESION = 50;

const horaAhora = () =>
  new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const useEnvasesScreen = () => {
  const [devoluciones, setDevoluciones] = useState<EnvaseDevolucion[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState<EnvaseResultado | null>(null);
  const [sesion, setSesion] = useState<EnvaseEscaneo[]>([]);
  const cargado = useRef(false);
  const enCurso = useRef(false);
  const consecutivo = useRef(0);

  const fetchDevoluciones = useCallback(async () => {
    if (!cargado.current) setLoading(true);
    try {
      const lectura = await getMirror().readThroughDetailed(
        MIRROR_KEYS.barContainers,
        async () => (await barService.containers()) as { data?: EnvaseDevolucion[] | null },
        { maxAgeMs: MIRROR_MAX_AGE_MS.operativo },
      );
      const data = lectura.data?.data;
      if (Array.isArray(data)) {
        setDevoluciones(data);
        setError(null);
        cargado.current = true;
      }
    } catch (e) {
      if (!cargado.current) {
        setError(
          e instanceof OfflineCacheMissError
            ? e.message
            : 'No se pudieron cargar los envases',
        );
      }
      logger.fetchError(e, { context: 'useEnvasesScreen:fetchDevoluciones' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDevoluciones();
  }, [fetchDevoluciones]);

  useDebouncedEventListener(
    REALTIME_EVENT_NAMES.refreshBar,
    useCallback(() => {
      void fetchDevoluciones();
    }, [fetchDevoluciones]),
  );

  const enviarEscaneo = useCallback(
    async (valor: string): Promise<EnvaseVeredicto | null> => {
      const escaneo = valor.trim().toUpperCase();
      if (!escaneo || enCurso.current) return null;
      if (!blockOffline('envase')) return null;

      enCurso.current = true;
      setVerificando(true);
      try {
        const res = await barService.returnContainer(escaneo);
        const veredicto = res?.data as EnvaseResultado | undefined;
        if (!veredicto || typeof veredicto.ok !== 'boolean') {
          throw new Error(res?.message || 'Respuesta inesperada del servidor');
        }
        const texto = veredicto.ok
          ? veredicto.mensaje
          : MOTIVO_ENVASE[veredicto.motivo ?? ''] || veredicto.mensaje;
        setResultado(veredicto);
        void Haptics.notificationAsync(
          veredicto.ok
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
        setSesion((previa) =>
          [
            {
              id: `${Date.now()}-${escaneo}-${consecutivo.current++}`,
              codigo: escaneo,
              ok: veredicto.ok,
              motivo: veredicto.ok ? null : (veredicto.motivo ?? null),
              mensaje: veredicto.mensaje,
              hora: horaAhora(),
            },
            ...previa,
          ].slice(0, MAXIMO_SESION),
        );
        if (veredicto.ok) {
          void fetchDevoluciones();
          emitRefreshBar({ type: 'container_returned' });
        }
        return { ok: veredicto.ok, texto };
      } catch (e) {
        logger.captureException(e, { context: 'useEnvasesScreen:enviarEscaneo' });
        showToast({
          type: 'error',
          text1: 'No se pudo verificar el envase',
          text2: e instanceof Error ? e.message : 'Revisa tu conexión e intenta de nuevo',
        });
        return null;
      } finally {
        enCurso.current = false;
        setVerificando(false);
      }
    },
    [fetchDevoluciones],
  );

  const enviarLoteEscaneos = useCallback(async (codigos: string[]): Promise<EnvaseResultadoLote[] | null> => {
    const unicos = [...new Set(codigos.map((codigo) => codigo.trim().toUpperCase()).filter(Boolean))];
    if (unicos.length === 0 || enCurso.current) return null;
    if (!blockOffline('envase')) return null;

    enCurso.current = true;
    setVerificando(true);
    try {
      const respuesta = await barService.returnContainers(unicos) as {
        data?: { resultados?: EnvaseResultado[] };
        success?: boolean;
        message?: string;
      };
      const resultados = respuesta?.data?.resultados;
      if (!Array.isArray(resultados) || resultados.length !== unicos.length) {
        throw new Error(respuesta?.message || 'El servidor no devolvió el resultado completo del lote');
      }
      const lote = resultados.map((veredicto, index) => ({
        codigo: unicos[index],
        ok: veredicto.ok,
        texto: veredicto.ok ? veredicto.mensaje : MOTIVO_ENVASE[veredicto.motivo ?? ''] || veredicto.mensaje,
      }));
      setResultado(resultados.at(-1) ?? null);
      setSesion((previa) => [
        ...lote.map((resultadoCodigo) => ({
          id: `${Date.now()}-${resultadoCodigo.codigo}-${consecutivo.current++}`,
          codigo: resultadoCodigo.codigo,
          ok: resultadoCodigo.ok,
          motivo: resultadoCodigo.ok ? null : (resultados[unicos.indexOf(resultadoCodigo.codigo)]?.motivo ?? null),
          mensaje: resultadoCodigo.texto,
          hora: horaAhora(),
        })),
        ...previa,
      ].slice(0, MAXIMO_SESION));
      void Haptics.notificationAsync(
        lote.some((resultadoCodigo) => !resultadoCodigo.ok)
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      );
      if (lote.some((resultadoCodigo) => resultadoCodigo.ok)) {
        void fetchDevoluciones();
        emitRefreshBar({ type: 'container_returned' });
      }
      return lote;
    } catch (e) {
      logger.captureException(e, { context: 'useEnvasesScreen:enviarLoteEscaneos' });
      showToast({
        type: 'error',
        text1: 'No se pudo enviar el lote',
        text2: e instanceof Error ? e.message : 'Revisa tu conexión e intenta de nuevo',
      });
      return null;
    } finally {
      enCurso.current = false;
      setVerificando(false);
    }
  }, [fetchDevoluciones]);

  const limpiarSesion = useCallback(() => setSesion([]), []);

  const entregados = sesion.filter((e) => e.ok).length;
  const rechazados = sesion.length - entregados;
  const pendientes = devoluciones.filter((d) => d.pendiente_confirmacion).length;

  return {
    devoluciones,
    loading,
    refreshing,
    error,
    codigo,
    setCodigo,
    verificando,
    resultado,
    sesion,
    entregados,
    rechazados,
    pendientes,
    fetchDevoluciones,
    onRefresh,
    enviarEscaneo,
    enviarLoteEscaneos,
    limpiarSesion,
  };
};
