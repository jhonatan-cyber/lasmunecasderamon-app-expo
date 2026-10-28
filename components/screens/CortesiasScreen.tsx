import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useConfigValue } from '@/hooks/useConfigValue';
import { barService } from '@/services/bar';
import { entradasService, type EntradaPendiente } from '@/services/entradas';
import { productsService } from '@/services/products';
import { eventBus } from '@/utils/eventBus';
import { formatCurrency } from '@/utils/format';
import logger from '@/utils/logger';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import { showToast } from '@/utils/toast-lazy';

/**
 * Cortesías del día (barman y cajero cuando opera la barra). Paridad con la
 * pestaña Cortesías de la web: la puerta cobra la entrada y aquí la barra sirve
 * la bebida; el servidor decide si es cortesía o adicional según
 * `max(tope, monto_entrada)`.
 */

interface OpcionVenta {
  tipo?: string;
  acompanamiento?: { unidades?: number };
}

interface Bebida {
  presentacion_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  precio_venta: number;
  stock_bar: number;
  opciones_venta: OpcionVenta[];
}

interface Acompanamiento {
  id: string;
  producto_nombre: string;
  nombre: string;
  stock_bar: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

function fechaHoraLocal() {
  const ahora = new Date();
  return {
    fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
    hora: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
  };
}

/** `opciones_venta` llega como JSON (array u objeto serializado) desde la API. */
function opcionesDe(valor: unknown): OpcionVenta[] {
  if (Array.isArray(valor)) return valor as OpcionVenta[];
  if (typeof valor === 'string') {
    try {
      const parseado = JSON.parse(valor);
      return Array.isArray(parseado) ? (parseado as OpcionVenta[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Unidades de acompañamiento que exige la opción botella, igual que la web. */
function unidadesAcompanamiento(bebida: Bebida | null | undefined): number {
  const botella = bebida?.opciones_venta.find(opcion => opcion.tipo === 'botella');
  const unidades = Number(botella?.acompanamiento?.unidades ?? 0);
  return Number.isFinite(unidades) && unidades > 0 ? Math.floor(unidades) : 0;
}

function bebidaDe(valor: unknown): Bebida | null {
  if (!valor || typeof valor !== 'object') return null;
  const fila = valor as Record<string, unknown>;
  const presentacionId = String(fila.presentacion_id ?? '');
  if (!presentacionId) return null;
  return {
    presentacion_id: presentacionId,
    producto_nombre: String(fila.producto_nombre ?? ''),
    presentacion_nombre: String(fila.presentacion_nombre ?? ''),
    precio_venta: Number(fila.precio_venta ?? 0),
    stock_bar: Number(fila.stock_bar ?? 0),
    opciones_venta: opcionesDe(fila.opciones_venta),
  };
}

function acompanamientoDe(valor: unknown): Acompanamiento | null {
  if (!valor || typeof valor !== 'object') return null;
  const fila = valor as Record<string, unknown>;
  const id = String(fila.id ?? '');
  if (!id) return null;
  return {
    id,
    producto_nombre: String(fila.producto_nombre ?? ''),
    nombre: String(fila.nombre ?? ''),
    stock_bar: Number(fila.stock_bar ?? 0),
  };
}

export function CortesiasScreen() {
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor, isDark } =
    useAccentColor();
  const router = useRouter();

  const topeCortesia = Number(
    useConfigValue('comisiones', 'monto_base_trago_cortesia_cliente', 10000),
  );

  const [pendientes, setPendientes] = useState<EntradaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [entrada, setEntrada] = useState<EntradaPendiente | null>(null);
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [bebidasLoading, setBebidasLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [presentacionId, setPresentacionId] = useState('');
  const [acompanamientos, setAcompanamientos] = useState<Acompanamiento[]>([]);
  const [acompanamientoId, setAcompanamientoId] = useState('');
  const [acompanamientosLoading, setAcompanamientosLoading] = useState(false);
  const [entregando, setEntregando] = useState(false);

  const { fecha } = fechaHoraLocal();

  const cargar = useCallback(
    async (mostrarLoading = false) => {
      if (mostrarLoading) setLoading(true);
      try {
        // La cola es la del día de negocio, igual que en el dashboard: el
        // servidor no la limita a una caja y entregar no exige caja abierta.
        const res = await entradasService.pendientes(fecha);
        if (!res.success) {
          throw new Error(res.message || 'No se pudo cargar la cola de cortesías');
        }
        setPendientes(res.data ?? []);
      } catch (error) {
        logger.fetchError(error, { context: 'Cortesias:cargar' });
        showToast({
          type: 'error',
          text1: 'No se pudo cargar la cola',
          text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
        });
      } finally {
        if (mostrarLoading) setLoading(false);
      }
    },
    [fecha],
  );

  useFocusEffect(
    useCallback(() => {
      void cargar(true);
    }, [cargar]),
  );

  // El garzón registra entradas en la puerta mientras la cola está abierta: se
  // refresca al recibir el aviso en vivo, sin esperar a que la pantalla reciba
  // el foco.
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

  const cargarBebidas = useCallback(async () => {
    setBebidasLoading(true);
    try {
      const res = await productsService.forSale();
      const lista = (res as { data?: unknown[] })?.data;
      if (!res.success || !Array.isArray(lista)) {
        throw new Error(res.message || 'No se pudieron cargar las bebidas del bar');
      }
      setBebidas(
        lista
          .map(bebidaDe)
          .filter((bebida): bebida is Bebida => bebida !== null && bebida.stock_bar > 0),
      );
    } catch (error) {
      logger.fetchError(error, { context: 'Cortesias:cargarBebidas' });
      showToast({
        type: 'error',
        text1: 'No se pudieron cargar las bebidas',
        text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      setBebidasLoading(false);
    }
  }, []);

  const abrirEntrega = useCallback(
    (fila: EntradaPendiente) => {
      setEntrada(fila);
      setPresentacionId('');
      setAcompanamientoId('');
      setAcompanamientos([]);
      setBusqueda('');
      if (bebidas.length === 0) void cargarBebidas();
    },
    [bebidas.length, cargarBebidas],
  );

  const cerrarEntrega = useCallback(() => {
    if (entregando) return;
    setEntrada(null);
    setPresentacionId('');
    setAcompanamientoId('');
    setBusqueda('');
  }, [entregando]);

  const seleccionarBebida = useCallback(
    async (bebida: Bebida) => {
      setPresentacionId(bebida.presentacion_id);
      setAcompanamientoId('');
      if (unidadesAcompanamiento(bebida) <= 0) {
        setAcompanamientos([]);
        return;
      }
      if (acompanamientos.length > 0) return;
      setAcompanamientosLoading(true);
      try {
        const res = await barService.acompanamientos();
        const lista = (res as { data?: unknown[] })?.data;
        if (!res.success || !Array.isArray(lista)) {
          throw new Error(res.message || 'No se pudieron cargar los acompañamientos');
        }
        setAcompanamientos(
          lista
            .map(acompanamientoDe)
            .filter((fila): fila is Acompanamiento => fila !== null),
        );
      } catch (error) {
        logger.fetchError(error, { context: 'Cortesias:acompanamientos' });
        showToast({
          type: 'error',
          text1: 'No se pudieron cargar los acompañamientos',
          text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
        });
      } finally {
        setAcompanamientosLoading(false);
      }
    },
    [acompanamientos.length],
  );

  const bebidaSeleccionada = bebidas.find(bebida => bebida.presentacion_id === presentacionId);
  const requiereAcompanamiento = unidadesAcompanamiento(bebidaSeleccionada) > 0;
  const umbral = Math.max(topeCortesia, entrada?.monto_entrada ?? 0);

  const visibles = useMemo(() => {
    const term = busqueda.trim().toLocaleLowerCase('es');
    if (!term) return bebidas;
    return bebidas.filter(bebida =>
      `${bebida.producto_nombre} ${bebida.presentacion_nombre}`
        .toLocaleLowerCase('es')
        .includes(term),
    );
  }, [bebidas, busqueda]);

  const entregar = useCallback(async () => {
    if (!entrada || entregando) return;
    if (!bebidaSeleccionada) {
      showToast({
        type: 'error',
        text1: 'Falta la bebida',
        text2: 'Selecciona la bebida que se entrega.',
      });
      return;
    }
    if (requiereAcompanamiento && !acompanamientoId) {
      showToast({
        type: 'error',
        text1: 'Falta el acompañamiento',
        text2: 'Selecciona el acompañamiento incluido en esta bebida.',
      });
      return;
    }
    setEntregando(true);
    try {
      const res = await entradasService.entregar(entrada.id, {
        presentacion_id: bebidaSeleccionada.presentacion_id,
        acompanamiento_presentacion_id: requiereAcompanamiento ? acompanamientoId : null,
      });
      if (!res.success) throw new Error(res.message || 'No se pudo entregar la bebida');
      const tipo = res.data?.tipo;
      showToast({
        type: 'success',
        text1: tipo === 'cortesia' ? 'Cortesía entregada' : 'Adicional registrado',
        text2:
          tipo === 'cortesia'
            ? entrada.cliente_nombre || 'Cliente sin nombre'
            : `Cobra ${formatCurrency(res.data?.montoCobrarBarra ?? 0)} en la barra`,
      });
      setEntrada(null);
      setPresentacionId('');
      setAcompanamientoId('');
      setBusqueda('');
      await cargar();
    } catch (error) {
      logger.fetchError(error, { context: 'Cortesias:entregar' });
      showToast({
        type: 'error',
        text1: 'No se pudo entregar',
        text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      setEntregando(false);
    }
  }, [
    acompanamientoId,
    bebidaSeleccionada,
    cargar,
    entrada,
    entregando,
    requiereAcompanamiento,
  ]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <PremiumHeader
          title="Cortesías"
          subtitle="Entregas de la barra"
          rightComponent={
            <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backTextHeader}>Atrás</Text>
            </Pressable>
          }
        />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: bg }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
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
        <PremiumHeader
          title="Cortesías"
          subtitle="Entregas de la barra"
          rightComponent={
            <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backTextHeader}>Atrás</Text>
            </Pressable>
          }
        />

        <View style={{ padding: 20 }}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.listHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                  PENDIENTES DEL DÍA
                </Text>
                <Text style={[styles.totalValue, { color: textPrimary }]}>
                  {pendientes.length}
                </Text>
              </View>
              <Text style={{ color: textSecondary, fontSize: 12 }}>
                {pendientes.length === 1 ? '1 persona' : `${pendientes.length} personas`}
              </Text>
            </View>

            {pendientes.length === 0 && (
              <Text style={{ color: textSecondary, fontSize: 13, textAlign: 'center' }}>
                Sin cortesías pendientes por ahora.
              </Text>
            )}

            {pendientes.map(fila => (
              <View key={fila.id} style={[styles.entradaRow, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}
                    numberOfLines={1}
                  >
                    {fila.cliente_nombre || 'Cliente sin nombre'}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 11 }}>
                    {fila.hora} · {formatCurrency(fila.monto_entrada)} · {fila.metodo_pago}
                  </Text>
                </View>
                <Pressable
                  onPress={() => abrirEntrega(fila)}
                  style={({ pressed }) => [
                    styles.entregarBtn,
                    { backgroundColor: `${accentColor}1F`, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={{ color: accentColor, fontWeight: '800', fontSize: 11 }}>
                    ENTREGAR
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Modal de entrega ─────────────────────────────────────── */}
      <Modal visible={entrada !== null} transparent animationType="slide" onRequestClose={cerrarEntrega}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: 0 }]}>
                  ENTREGAR BEBIDA
                </Text>
                <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>
                  {entrada?.cliente_nombre || 'Cliente sin nombre'}
                </Text>
                <Text style={{ color: textSecondary, fontSize: 12 }}>
                  {entrada ? `${formatCurrency(entrada.monto_entrada)} · ${entrada.hora}` : ''}
                </Text>
              </View>
              <Pressable onPress={cerrarEntrega} hitSlop={10}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </Pressable>
            </View>

            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar bebida"
              placeholderTextColor={textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                  borderColor,
                  color: textPrimary,
                },
              ]}
            />

            {bebidasLoading ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator color={accentColor} />
              </View>
            ) : (
              <FlatList
                data={visibles}
                keyExtractor={item => item.presentacion_id}
                style={{ maxHeight: 300 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text
                    style={{
                      color: textSecondary,
                      fontSize: 12,
                      textAlign: 'center',
                      paddingVertical: 16,
                    }}
                  >
                    Sin bebidas con stock en el bar.
                  </Text>
                }
                renderItem={({ item }) => {
                  const activo = item.presentacion_id === presentacionId;
                  const esCortesia = item.precio_venta <= umbral;
                  return (
                    <Pressable
                      onPress={() => void seleccionarBebida(item)}
                      style={[
                        styles.bebidaRow,
                        {
                          borderColor: activo ? accentColor : borderColor,
                          backgroundColor: activo ? `${accentColor}14` : 'transparent',
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}>
                          {[item.producto_nombre, item.presentacion_nombre]
                            .filter(Boolean)
                            .join(' ')}
                        </Text>
                        <Text style={{ color: textSecondary, fontSize: 11 }}>
                          {formatCurrency(item.precio_venta)} · stock {item.stock_bar}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: esCortesia ? '#10B981' : '#F59E0B',
                          fontSize: 10,
                          fontWeight: '800',
                        }}
                      >
                        {esCortesia
                          ? 'CORTESÍA'
                          : `COBRA ${formatCurrency(
                              Math.max(0, item.precio_venta - (entrada?.monto_entrada ?? 0)),
                            )}`}
                      </Text>
                      {activo && (
                        <Ionicons name="checkmark-circle" size={18} color={accentColor} />
                      )}
                    </Pressable>
                  );
                }}
              />
            )}

            {requiereAcompanamiento && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                  ACOMPAÑAMIENTO INCLUIDO
                </Text>
                {acompanamientosLoading ? (
                  <ActivityIndicator color={accentColor} />
                ) : (
                  <View style={styles.chipsWrap}>
                    {acompanamientos.map(opcion => {
                      const activo = opcion.id === acompanamientoId;
                      return (
                        <Pressable
                          key={opcion.id}
                          onPress={() => setAcompanamientoId(opcion.id)}
                          style={[
                            styles.chip,
                            {
                              borderColor: activo ? accentColor : borderColor,
                              backgroundColor: activo ? `${accentColor}1F` : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: activo ? accentColor : textSecondary,
                              fontSize: 11,
                              fontWeight: '700',
                            }}
                          >
                            {[opcion.producto_nombre, opcion.nombre].filter(Boolean).join(' ')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <AnimatedButton
              onPress={entregar}
              disabled={entregando || !bebidaSeleccionada}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: accentColor,
                  opacity: entregando || !bebidaSeleccionada ? 0.6 : 1,
                },
              ]}
            >
              {entregando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>ENTREGAR EN LA BARRA</Text>
              )}
            </AnimatedButton>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  backTextHeader: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  card: { borderRadius: 28, padding: 20, borderWidth: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  totalValue: { fontSize: 22, fontWeight: '900' },
  entradaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  entregarBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 8,
  },
  bebidaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginTop: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
});
