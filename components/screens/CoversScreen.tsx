import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { contentColumn, tabBarBottomPadding } from '@/constants/layout';
import {
  agruparEntradas,
  EntradasListadoCard,
  estadoDelGrupo,
  type GrupoEntrada,
} from '@/components/entradas/EntradasListadoCard';
import { SolicitudCard } from '@/components/entradas/SolicitudCard';
import { EntregaCoversModal } from '@/components/entradas/EntregaCoversModal';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontFamily } from '@/constants/fonts';
import { useConfigValue } from '@/hooks/useConfigValue';
import { entradasService, type EntradaCliente, type EntradaPendiente } from '@/services/entradas';
import { productsService } from '@/services/products';
import { eventBus } from '@/utils/eventBus';
import { formatCurrency } from '@/utils/format';
import logger from '@/utils/logger';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import { showToast } from '@/utils/toast-lazy';
import { useAuthStore } from '@/store/authStore';
import { isBarmanRole, isCajeroRole } from '@/utils/userRole';

/** Compra con al menos un cover pendiente: se muestra como en el listado del garzón. */
interface GrupoPendiente {
  id: string;
  dia: GrupoEntrada;
  filas: EntradaPendiente[];
}

const pad = (n: number) => String(n).padStart(2, '0');

const ETIQUETAS_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

const metodoLabel = (m: string) => ETIQUETAS_METODO[m] ?? m;

function fechaHoraLocal() {
  const ahora = new Date();
  return {
    fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
    hora: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
  };
}

export function CoversScreen() {
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor, isDark, accentOnSurface, accentText, accentBorder } = useAccentColor();
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const requiereSolicitud = isBarmanRole(user);
  const esCajero = isCajeroRole(user);

  const topeCover = Number(
    useConfigValue('comisiones', 'monto_base_trago_cover_cliente', 10000),
  );

  const [pendientes, setPendientes] = useState<EntradaPendiente[]>([]);
  const [entradasDia, setEntradasDia] = useState<EntradaCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grupoEntrega, setGrupoEntrega] = useState<GrupoPendiente | null>(null);
  const [grupoAnular, setGrupoAnular] = useState<GrupoPendiente | null>(null);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
  const [solicitudesCovers, setSolicitudesCovers] = useState<any[]>([]);
  const [nombresBebida, setNombresBebida] = useState<Record<string, string>>({});
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState<Set<string>>(() => new Set());

  const { fecha } = fechaHoraLocal();

  const totalPendiente = useMemo(
    () => pendientes.reduce((suma, fila) => suma + Number(fila.monto_entrada), 0),
    [pendientes],
  );

  // Agrupa las entradas pendientes por su grupo_registro_id
  const gruposPendientes = useMemo<GrupoPendiente[]>(() => {
    const porGrupo = new Map<string, EntradaPendiente[]>();
    for (const fila of pendientes) {
      const clave = fila.grupo_registro_id ?? fila.id;
      const actual = porGrupo.get(clave);
      if (actual) actual.push(fila);
      else porGrupo.set(clave, [fila]);
    }

    const diaPorGrupo = new Map(agruparEntradas(entradasDia).map(grupo => [grupo.id, grupo]));
    return Array.from(porGrupo.entries()).map(([clave, filas]) => ({
      id: clave,
      dia:
        diaPorGrupo.get(clave) ?? {
          id: clave,
          cliente: filas[0].cliente_nombre || 'Cliente sin nombre',
          cantidad: filas.length,
          costoUnitario: Number(filas[0].monto_entrada),
          total: filas.reduce((suma, fila) => suma + Number(fila.monto_entrada), 0),
          metodo: filas[0].metodo_pago,
          adicional: 0,
          totalGrupo: filas.reduce((suma, fila) => suma + Number(fila.monto_entrada), 0),
          hora: filas[0].hora || '',
          registradoPor: filas[0].registrado_por_nombre || '',
          entregadas: 0,
          anuladas: 0,
          devueltas: 0,
          devueltoMonto: 0,
          baucherEntradaId: null,
          registros: [],
          filas,
        },
      filas,
    }));
  }, [pendientes, entradasDia]);

  const cargar = useCallback(
    async (mostrarLoading = false) => {
      if (mostrarLoading) setLoading(true);
      try {
        if (esCajero) {
          // La solicitud guarda solo la presentación; el catálogo traduce el nombre.
          const [solicitudes, catalogo] = await Promise.all([
            entradasService.listarSolicitudesCovers('pendiente'),
            productsService.forSale(),
          ]);
          if (!solicitudes.success)
            throw new Error(solicitudes.message || 'No se pudieron cargar las solicitudes');
          setSolicitudesCovers(solicitudes.data ?? []);
          const mapa: Record<string, string> = {};
          if (catalogo.success && Array.isArray(catalogo.data)) {
            for (const item of catalogo.data as {
              presentacion_id?: unknown;
              producto_nombre?: unknown;
              presentacion_nombre?: unknown;
            }[]) {
              if (!item?.presentacion_id) continue;
              const etiqueta = [item.producto_nombre, item.presentacion_nombre]
                .filter(Boolean)
                .join(' · ');
              if (etiqueta) mapa[String(item.presentacion_id)] = etiqueta;
            }
          }
          setNombresBebida(mapa);
          return;
        }
        // La cola es la del día de negocio, igual que en el dashboard: el
        // servidor no la limita a una caja y entregar no exige caja abierta.
        const [res, listado, solicitudesRes] = await Promise.all([
          entradasService.pendientes(fecha),
          entradasService.listar(fecha),
          // El barman no repite la solicitud de una compra que ya espera al cajero.
          entradasService.listarSolicitudesCovers('pendiente'),
        ]);
        if (!res.success) {
          throw new Error(res.message || 'No se pudo cargar la cola de covers');
        }
        setPendientes(res.data ?? []);
        // El listado es de consulta: si falla, la entrega sigue disponible.
        setEntradasDia(listado.success ? (listado.data ?? []) : []);
        // Marcar los grupos con solicitud ya enviada (paridad con dashboard).
        if (solicitudesRes.success && Array.isArray(solicitudesRes.data)) {
          const ids = new Set<string>();
          for (const s of solicitudesRes.data) {
            const gid = typeof s === 'object' && s !== null && s.grupo_registro_id
              ? String(s.grupo_registro_id)
              : null;
            if (gid) ids.add(gid);
          }
          setSolicitudesEnviadas(ids);
        }
        if (!listado.success) {
          logger.fetchError(
            new Error(listado.message || 'No se pudo cargar el listado de entradas'),
            { context: 'Covers:listado' },
          );
        }
      } catch (error) {
        logger.fetchError(error, { context: 'Covers:cargar' });
        showToast({
          type: 'error',
          text1: 'No se pudo cargar la cola',
          text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
        });
      } finally {
        if (mostrarLoading) setLoading(false);
      }
    },
    [fecha, esCajero],
  );

  useFocusEffect(
    useCallback(() => {
      void cargar(true);
    }, [cargar]),
  );

  // Refresca al recibir aviso en vivo, sin esperar a que la pantalla reciba el foco.
  useEffect(() => {
    const subscription = eventBus.addListener(
      REALTIME_EVENT_NAMES.refreshEntradas,
      () => {
        void cargar();
      },
    );
    return () => subscription.remove();
  }, [cargar]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  }, [cargar]);

  /** Anula todas las entradas pendientes de la compra. */
  const anularPendientes = useCallback(
    async (grupo: GrupoPendiente) => {
      setGrupoAnular(null);
      setAnulandoId(grupo.id);
      let anuladas = 0;
      try {
        for (const fila of grupo.filas) {
          const res = await entradasService.anular(fila.id);
          if (!res.success) throw new Error(res.message || 'No se pudo anular la entrada');
          anuladas += 1;
        }
        showToast({
          type: 'success',
          text1: anuladas === 1 ? 'Entrada anulada' : `${anuladas} entradas anuladas`,
          text2: grupo.dia.cliente,
        });
      } catch (error) {
        logger.fetchError(error, { context: 'Covers:anular' });
        showToast({
          type: 'error',
          text1: 'No se pudieron anular las entradas',
          text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
        });
      } finally {
        if (anuladas > 0) await cargar();
        setAnulandoId(null);
      }
    },
    [cargar],
  );

  const abrirEntrega = useCallback((grupo: GrupoPendiente) => {
    setGrupoEntrega(grupo);
  }, []);

  const cerrarEntrega = useCallback(() => {
    setGrupoEntrega(null);
  }, []);

  const aprobarSolicitud = useCallback(async (id: string) => {
    const res = await entradasService.aprobarSolicitudCovers(id);
    if (!res.success) {
      showToast({ type: 'error', text1: 'No se pudo aprobar', text2: res.message });
      return;
    }
    showToast({
      type: 'success',
      text1: 'Entrega aprobada',
      text2: `${res.data?.entradas ?? 0} covers entregados`,
    });
    await cargar();
  }, [cargar]);

  const rechazarSolicitud = useCallback(async (id: string) => {
    const res = await entradasService.rechazarSolicitudCovers(
      id,
      'Solicitud rechazada por el cajero',
    );
    if (!res.success) {
      showToast({ type: 'error', text1: 'No se pudo rechazar', text2: res.message });
      return;
    }
    showToast({ type: 'success', text1: 'Solicitud rechazada' });
    await cargar();
  }, [cargar]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <PremiumHeader
          title="Covers"
          subtitle={esCajero ? 'Solicitudes de la barra' : 'Entregas de la barra'}
          onBack={() => router.back()}
        />
        <View style={[styles.loadingBox, { paddingHorizontal: 20 }]}>
          <Skeleton height={120} borderRadius={BorderRadius.xxl} />
          <View style={{ height: 16 }} />
          <Skeleton height={96} borderRadius={BorderRadius.xxl} />
          <View style={{ height: 16 }} />
          <Skeleton height={96} borderRadius={BorderRadius.xxl} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PremiumHeader
        title="Covers"
        subtitle={esCajero ? 'Solicitudes de la barra' : 'Entregas de la barra'}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[contentColumn, { paddingBottom: tabBarBottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        <View style={{ padding: 16 }}>
          {esCajero && (
            <AnimatedView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400 }}
            >
              <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.listHeader}>
                <View>
                  <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    SOLICITUDES DEL BARMAN
                  </Text>
                  <Text style={[styles.totalValue, { color: textPrimary }]}>
                    {solicitudesCovers.length}
                  </Text>
                </View>
                <Text style={{ color: textSecondary, fontSize: 12 }}>
                  Pendientes de autorización
                </Text>
              </View>
              {solicitudesCovers.length === 0 && (
                <EmptyState
                  icon="cafe-outline"
                  title="Sin solicitudes"
                />
              )}
              {solicitudesCovers.length > 0 && (
                <View>
                  {solicitudesCovers.map((solicitud) => (
                    <SolicitudCard
                      key={solicitud.id}
                      solicitud={solicitud}
                      nombresBebida={nombresBebida}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      successColor={accentOnSurface}
                      dangerColor={accentColor}
                      borderColor={borderColor}
                      onAprobar={aprobarSolicitud}
                      onRechazar={rechazarSolicitud}
                    />
                  ))}
                </View>
              )}
            </View>
            </AnimatedView>
          )}

          {!esCajero && (
            <AnimatedView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400 }}
            >
              <View style={styles.listHeader}>
                <View>
                  <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    COVERS PENDIENTES
                  </Text>
                  <Text style={[styles.totalValue, { color: textPrimary }]}>
                    {formatCurrency(totalPendiente)}
                  </Text>
                </View>
                <Text style={{ color: textSecondary, fontSize: 12 }}>
                  {gruposPendientes.length} {gruposPendientes.length === 1 ? 'compra' : 'compras'} ·{' '}
                  {pendientes.length} {pendientes.length === 1 ? 'entrada' : 'entradas'}
                </Text>
              </View>

              {gruposPendientes.length === 0 && (
                <EmptyState
                  icon="ticket-outline"
                  title="Sin pendientes"
                />
              )}

              {gruposPendientes.length > 0 && (
                <View>
                  {gruposPendientes.map((grupo) => {
                    const estado = estadoDelGrupo(grupo.dia);
                    const multiple = grupo.filas.length > 1;
                    const abierto = grupoAbierto === grupo.id;
                    const yaEnviada = requiereSolicitud && solicitudesEnviadas.has(grupo.id);
                    return (
                      <View key={grupo.id} style={[styles.coverCard, { backgroundColor: cardBg, borderColor }]}>
                        <Pressable
                          onPress={() => {
                            if (multiple) {
                              setGrupoAbierto(actual => (actual === grupo.id ? null : grupo.id));
                              return;
                            }
                            if (!yaEnviada) abrirEntrega(grupo);
                          }}
                          style={styles.coverHeader}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={1}
                              style={{
                                color: textPrimary,
                                fontWeight: '700',
                                fontSize: 15,
                              }}>
                              {grupo.dia.cliente}
                            </Text>
                            <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                              {grupo.dia.hora ? `${grupo.dia.hora} · ` : ''}
                              {grupo.dia.cantidad}{' '}
                              {grupo.dia.cantidad === 1 ? 'entrada' : 'entradas'} ·{' '}
                              {formatCurrency(grupo.dia.costoUnitario)} c/u · {metodoLabel(grupo.dia.metodo)}
                            </Text>
                            {multiple && (
                              <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                                {grupo.filas.length} sin entregar
                              </Text>
                            )}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 18 }}>
                              {formatCurrency(grupo.dia.totalGrupo)}
                            </Text>
                            <View style={[styles.badge, { backgroundColor: `${estado.color}1F` }]}>
                              <Text style={{ color: estado.color, fontSize: FontSize.xxs, fontWeight: '800' }}>
                                {estado.label}
                              </Text>
                            </View>
                            {multiple && (
                              <Ionicons
                                name={abierto ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color={textSecondary}
                                style={{ marginTop: 4 }}
                              />
                            )}
                          </View>
                        </Pressable>

                        {abierto && multiple && (
                          <View style={{ paddingTop: 8, borderTopWidth: 1, borderColor, marginBottom: 12 }}>
                            {grupo.filas.map((fila) => (
                              <View key={fila.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '600' }}>
                                    {fila.cliente_nombre || grupo.dia.cliente}
                                  </Text>
                                  <Text style={{ color: textSecondary, fontSize: 11 }}>
                                    {fila.hora || '—'} · {formatCurrency(Number(fila.monto_entrada))}
                                    {fila.registrado_por_nombre ? ` · ${fila.registrado_por_nombre}` : ''}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={styles.coverActions}>
                          {yaEnviada ? (
                            <View style={[styles.badge, { backgroundColor: `${textSecondary}1F`, flex: 1, alignItems: 'center', paddingVertical: 10 }]}>
                              <Ionicons name="time-outline" size={16} color={textSecondary} />
                              <Text style={{ color: textSecondary, fontSize: FontSize.xs, fontWeight: '800', marginLeft: 4 }}>
                                SOLICITUD ENVIADA
                              </Text>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => abrirEntrega(grupo)}
                              style={[styles.coverActionBtn, { backgroundColor: accentColor }]}
                            >
                              <Ionicons name="enter-outline" size={16} color={accentText} />
                              <Text style={[styles.coverActionBtnText, { color: accentText }]}>
                                {requiereSolicitud ? 'SOLICITAR' : 'ENTREGAR'}
                              </Text>
                            </Pressable>
                          )}

                          <Pressable
                            onPress={() => setGrupoAnular(grupo)}
                            disabled={anulandoId === grupo.id}
                            style={[styles.coverActionBtn, { backgroundColor: accentColor }, { opacity: anulandoId === grupo.id ? 0.5 : 1 }]}
                          >
                            {anulandoId === grupo.id ? (
                              <ActivityIndicator size="small" color={accentText} />
                            ) : (
                              <>
                                <Ionicons name="close-circle-outline" size={16} color={accentText} />
                                <Text style={[styles.coverActionBtnText, { color: accentText }]}>ANULAR</Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={{ marginTop: 20 }}>
                <EntradasListadoCard
                  entradas={entradasDia}
                  titulo={`HOY · ${fecha.split('-').reverse().join('/')}`}
                  vacio="Sin entradas registradas hoy."
                />
              </View>
            </AnimatedView>
          )}

          <PremiumAlert
            visible={grupoAnular !== null}
            type="danger"
            title={grupoAnular && grupoAnular.filas.length > 1 ? 'Anular entradas' : 'Anular entrada'}
            message={
              grupoAnular
                ? grupoAnular.filas.length === 1
                  ? '¿Anular la entrada pendiente de este grupo? El dinero cobrado se devuelve en la puerta.'
                  : `¿Anular las ${grupoAnular.filas.length} entradas pendientes de este grupo? El dinero cobrado se devuelve en la puerta.`
                : ''
            }
            confirmText="Anular"
            cancelText="Cancelar"
            showCancel
            onConfirm={() => {
              if (grupoAnular) void anularPendientes(grupoAnular);
            }}
            onCancel={() => setGrupoAnular(null)}
          />

          {!esCajero && (
            <EntregaCoversModal
              key={grupoEntrega?.id ?? 'cerrado'}
              visible={grupoEntrega !== null}
              grupo={
                grupoEntrega
                  ? {
                      id: grupoEntrega.id,
                      cliente: grupoEntrega.dia.cliente,
                      filas: grupoEntrega.filas,
                      metodo_pago: grupoEntrega.dia.metodo,
                      baucher_foto: grupoEntrega.dia.baucherEntradaId,
                    }
                  : null
              }
              tope={topeCover}
              onClose={cerrarEntrega}
              onEntregado={cargar}
              modo={requiereSolicitud ? 'solicitud' : 'entrega'}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 20 },
  backBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  backTextHeader: { fontWeight: '700', fontSize: 13 },
  card: { borderRadius: BorderRadius.xxl, padding: 20, borderWidth: 1, marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalValue: { fontSize: 22, fontWeight: '900' },
  coverCard: {
    borderRadius: BorderRadius.xxl,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  coverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  coverActions: {
    flexDirection: 'row',
    gap: 8,
  },
  coverActionBtn: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  coverActionBtnText: {
    fontFamily: FontFamily.extrabold,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontFamily: FontFamily.extrabold,
    fontSize: 12,
  },
  smallActionBtn: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  smallActionBtnText: {
    fontFamily: FontFamily.extrabold,
    fontSize: 10,
  },
});
