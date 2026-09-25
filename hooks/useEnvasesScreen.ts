import { useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { barService } from '@/services/bar';
import { showToast } from '@/utils/toast-lazy';
import logger from '@/utils/logger';

/**
 * Texto corto del motivo por el que un escaneo no se aceptó.
 * Espejo de `MOTIVO_ENVASE` del dashboard (hooks/productos/useContainerScan.ts).
 */
export const MOTIVO_ENVASE: Record<string, string> = {
  no_es_nuestro: 'No es nuestro',
  no_esta_vacia: 'No está vacío',
  ya_devuelto: 'Ya entregado',
  no_entregado: 'El bar no lo entregó',
  ya_confirmado: 'Ya confirmado',
};

/** Envase verificado, con lo necesario para mostrarlo en el resultado y el historial. */
export interface EnvaseUnidad {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  estado: string;
  fecha_devolucion: string | null;
  fecha_confirmacion: string | null;
  producto_nombre: string | null;
  presentacion_nombre: string | null;
  compra_folio: string | null;
}

/** Registro del historial: el envase + quién entregó y quién recibió. */
export interface EnvaseDevolucion extends EnvaseUnidad {
  usuario_nombre: string | null;
  usuario_apellido: string | null;
  usuario_nick: string | null;
  confirmado_nombre: string | null;
  confirmado_apellido: string | null;
  confirmado_nick: string | null;
  /** true mientras el almacén no confirme la recepción. */
  pendiente_confirmacion: boolean;
}

/** Veredicto del servidor para un escaneo (`data` del POST /bar/containers). */
export interface EnvaseResultado {
  ok: boolean;
  motivo?: string;
  mensaje: string;
  unidad: EnvaseUnidad | null;
}

/** Escaneo de la sesión actual (contador del lote), del más reciente al más antiguo. */
export interface EnvaseEscaneo {
  id: string;
  codigo: string;
  ok: boolean;
  motivo: string | null;
  mensaje: string;
  hora: string;
}

/** Contador del control de envases (`GET /bar/containers/summary`). */
export interface EnvaseResumen {
  pendientes: number;
  vencidos: number;
  umbral_horas?: number;
}

/** Lo que ve la UI (y el scanner) tras cada lectura. `null` = no se procesó. */
export interface EnvaseVeredicto {
  ok: boolean;
  texto: string;
}

/** Cuántos escaneos de la sesión se conservan en pantalla. */
const MAXIMO_SESION = 50;

const horaAhora = () =>
  new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * Tab «Envases» de la pantalla Bar del barman.
 *
 * Porta el paso 1 del control de envases del dashboard (bar → almacén):
 * escanear un envase vacío verifica que es nuestro, que está vacío y que no se
 * entregó antes, y lo marca como entregado en el mismo POST. La recepción la
 * confirma después el almacén desde el dashboard (permiso distinto: el barman
 * no puede confirmar su propia entrega).
 *
 * A diferencia del dashboard (cola offline en localStorage), aquí cada lectura
 * se verifica en línea: si no hay red se muestra el error y se reintenta.
 */
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
      const res = await barService.containers();
      const data = res?.data;
      if (Array.isArray(data)) {
        setDevoluciones(data as EnvaseDevolucion[]);
        setError(null);
        cargado.current = true;
      }
    } catch (e) {
      if (!cargado.current) setError('No se pudieron cargar los envases');
      logger.captureException(e, { context: 'useEnvasesScreen:fetchDevoluciones' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDevoluciones();
  }, [fetchDevoluciones]);

  /**
   * Procesa un código escaneado (o tecleado) contra `POST /bar/containers`.
   *
   * Devuelve el veredicto para que el caller limpie el campo / muestre el aviso
   * del scanner, o `null` si no se procesó (vacío, otra lectura en curso o
   * error de red ya avisado con toast) para que el código se conserve.
   */
  const enviarEscaneo = useCallback(
    async (valor: string): Promise<EnvaseVeredicto | null> => {
      const escaneo = valor.trim().toUpperCase();
      if (!escaneo || enCurso.current) return null;
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
        // Un envase entregado ya aparece en el historial del almacén: refresca.
        if (veredicto.ok) void fetchDevoluciones();
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
    limpiarSesion,
  };
};
