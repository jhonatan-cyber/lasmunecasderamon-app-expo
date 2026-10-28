import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
import { cajaService } from '@/services/caja';
import {
  entradasService,
  type EntradaCliente,
  type EstadoCortesia,
  type MetodoPagoEntrada,
} from '@/services/entradas';
import { adjuntarBaucher } from '@/utils/baucherPicker';
import { eventBus } from '@/utils/eventBus';
import { formatCurrency } from '@/utils/format';
import logger from '@/utils/logger';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import { showToast } from '@/utils/toast-lazy';

const METODOS: {
  id: MetodoPagoEntrada;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { id: 'efectivo', label: 'Efectivo', icon: 'cash-outline' },
    { id: 'tarjeta', label: 'Tarjeta', icon: 'card-outline' },
    { id: 'transferencia', label: 'Transferencia', icon: 'swap-horizontal-outline' },
  ];

const ESTADOS: Record<EstadoCortesia, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#F59E0B' },
  entregada: { label: 'Entregada', color: '#10B981' },
  anulada: { label: 'Anulada', color: '#EF4444' },
};

const pad = (n: number) => String(n).padStart(2, '0');

function fechaHoraLocal() {
  const ahora = new Date();
  return {
    fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
    hora: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
  };
}

export default function GarzonEntradasScreen() {
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor, isDark } =
    useAccentColor();
  const router = useRouter();

  const costoEntrada = Number(useConfigValue('comisiones', 'costo_entrada', 10000));

  const [clienteNombre, setClienteNombre] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [metodo, setMetodo] = useState<MetodoPagoEntrada>('efectivo');
  const [baucherFoto, setBaucherFoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fotoLoading, setFotoLoading] = useState(false);

  const [entradas, setEntradas] = useState<EntradaCliente[]>([]);
  const [caja, setCaja] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { fecha } = fechaHoraLocal();
  const total = entradas.reduce((sum, entrada) => sum + Number(entrada.monto_entrada), 0);
  const totalPuerta = costoEntrada * cantidad;
  const cargar = useCallback(async (mostrarLoading = false) => {
    if (mostrarLoading) setLoading(true);
    try {

      const status = await cajaService.status();
      const datosCaja = (
        status as {
          data?: { hasOpenCaja?: boolean; cajaInfo?: { id_caja?: string } | null };
        }
      )?.data;
      const cajaAbierta =
        datosCaja?.hasOpenCaja && datosCaja.cajaInfo?.id_caja
          ? datosCaja.cajaInfo.id_caja
          : null;
      setCaja(cajaAbierta);
      if (!cajaAbierta) {
        setEntradas([]);
        return;
      }
      const res = await entradasService.listar(fecha);
      if (!res.success) throw new Error(res.message || 'No se pudieron cargar las entradas');

      setEntradas((res.data ?? []).filter(entrada => entrada.caja_id === cajaAbierta));
    } catch (error) {
      logger.fetchError(error, { context: 'Entradas:cargar' });
      showToast({
        type: 'error',
        text1: 'No se pudieron cargar las entradas',
        text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  }, [fecha]);

  useFocusEffect(
    useCallback(() => {
      void cargar(true);
    }, [cargar]),
  );

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

  const tomarFotoBaucher = useCallback(async () => {
    setFotoLoading(true);
    try {
      const dataUrl = await adjuntarBaucher('Entradas:tomarFotoBaucher');
      if (dataUrl) setBaucherFoto(dataUrl);
    } finally {
      setFotoLoading(false);
    }
  }, []);

  const registrar = useCallback(async () => {
    if (saving) return;
    if (!caja) {
      showToast({
        type: 'error',
        text1: 'No hay caja abierta',
        text2: 'Abre una caja antes de cobrar entradas en la puerta.',
      });
      return;
    }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
      showToast({
        type: 'error',
        text1: 'Cantidad no válida',
        text2: 'Indica entre 1 y 100 entradas para registrar.',
      });
      return;
    }
    if (metodo === 'transferencia' && !baucherFoto) {
      showToast({
        type: 'error',
        text1: 'Falta el baucher',
        text2: 'Adjunta la foto del baucher de la transferencia.',
      });
      return;
    }
    if (!Number.isInteger(totalPuerta) || totalPuerta <= 0) {
      showToast({
        type: 'error',
        text1: 'Costo de entrada no configurado',
        text2: 'Pide que configuren el costo de la entrada e inténtalo de nuevo.',
      });
      return;
    }
    setSaving(true);
    try {
      const { hora } = fechaHoraLocal();
      const res = await entradasService.registrar({
        cliente_nombre: clienteNombre.trim(),
        cantidad_entradas: cantidad,
        metodo_pago: metodo,
        ...(metodo === 'transferencia' && baucherFoto
          ? { baucher_foto: baucherFoto }
          : {}),
        fecha,
        hora,
        monto_entrada: totalPuerta,
      });
      if (!res.success) throw new Error(res.message || 'No se pudo registrar la entrada');
      showToast({
        type: 'success',
        text1: cantidad > 1 ? `${cantidad} entradas registradas` : 'Entrada registrada',
        text2: clienteNombre.trim() ? clienteNombre.trim() : undefined,
      });
      setClienteNombre('');
      setCantidad(1);
      setMetodo('efectivo');
      setBaucherFoto(null);
      await cargar();
    } catch (error) {
      logger.fetchError(error, { context: 'Entradas:registrar' });
      showToast({
        type: 'error',
        text1: 'No se pudo registrar la entrada',
        text2: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  }, [
    baucherFoto,
    caja,
    cantidad,
    cargar,
    clienteNombre,
    fecha,
    metodo,
    saving,
    totalPuerta,
  ]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <PremiumHeader
          title="Entradas"
          subtitle="Cobro de acceso en la puerta"
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
          title="Entradas"
          subtitle="Cobro de acceso en la puerta"
          rightComponent={
            <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backTextHeader}>Atrás</Text>
            </Pressable>
          }
        />

        <View style={{ padding: 20 }}>
          {!caja && (
            <View style={[styles.cajaBanner, { backgroundColor: '#F59E0B1F', borderColor: '#F59E0B' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700', flex: 1 }}>
                Sin caja abierta. Las entradas del turno se listan mientras la caja esté
                abierta: abre una caja para cobrar en la puerta.
              </Text>
            </View>
          )}

          {/* ── Registro ─────────────────────────────────────────── */}
          <View
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
          >
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>
              NUEVA ENTRADA
            </Text>

            <TextInput
              value={clienteNombre}
              onChangeText={setClienteNombre}
              placeholder="Nombre del cliente (opcional)"
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

            <Text style={[styles.sectionLabel, { color: textSecondary }]}>
              CANTIDAD
            </Text>
            <View
              style={[
                styles.stepper,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                  borderColor,
                },
              ]}
            >
              <Pressable
                onPress={() => setCantidad(c => Math.max(1, c - 1))}
                disabled={cantidad <= 1}
                style={[styles.stepperBtn, cantidad <= 1 && { opacity: 0.4 }]}
              >
                <Ionicons name="remove" size={20} color={textPrimary} />
              </Pressable>
              <Text style={[styles.stepperValue, { color: textPrimary }]}>
                {cantidad}
              </Text>
              <Pressable
                onPress={() => setCantidad(c => Math.min(100, c + 1))}
                disabled={cantidad >= 100}
                style={[styles.stepperBtn, cantidad >= 100 && { opacity: 0.4 }]}
              >
                <Ionicons name="add" size={20} color={textPrimary} />
              </Pressable>
            </View>

            <Text style={[styles.sectionLabel, { color: textSecondary }]}>
              MÉTODO DE PAGO
            </Text>
            <View style={styles.metodosRow}>
              {METODOS.map(metodoOp => {
                const activo = metodo === metodoOp.id;
                return (
                  <Pressable
                    key={metodoOp.id}
                    onPress={() => setMetodo(metodoOp.id)}
                    style={[
                      styles.metodoChip,
                      {
                        backgroundColor: activo ? `${accentColor}1F` : isDark ? '#1F2937' : '#F9FAFB',
                        borderColor: activo ? accentColor : borderColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={metodoOp.icon}
                      size={16}
                      color={activo ? accentColor : textSecondary}
                    />
                    <Text
                      style={[
                        styles.metodoLabel,
                        { color: activo ? accentColor : textSecondary },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {metodoOp.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {metodo === 'transferencia' && (
              <Pressable
                onPress={tomarFotoBaucher}
                disabled={fotoLoading}
                style={[
                  styles.fotoBtn,
                  {
                    backgroundColor: baucherFoto ? '#10B9811F' : `${accentColor}1F`,
                    borderColor: baucherFoto ? '#10B981' : accentColor,
                  },
                ]}
              >
                {fotoLoading ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : baucherFoto ? (
                  <Image source={{ uri: baucherFoto }} style={styles.fotoThumb} />
                ) : (
                  <Ionicons name="camera-outline" size={20} color={accentColor} />
                )}
                <Text
                  style={{
                    color: baucherFoto ? '#10B981' : accentColor,
                    fontWeight: '700',
                    fontSize: 13,
                    flex: 1,
                  }}
                >
                  {baucherFoto ? 'Baucher adjunto (toca para repetir)' : 'Fotografiar baucher'}
                </Text>
              </Pressable>
            )}

            <View style={styles.totalRow}>
              <Text style={{ color: textSecondary, fontSize: 13 }}>Total en la puerta</Text>
              <Text style={[styles.totalValue, { color: textPrimary }]}>
                {formatCurrency(totalPuerta)}
              </Text>
            </View>

            <AnimatedButton
              onPress={registrar}
              disabled={saving || !caja}
              style={[
                styles.submitBtn,
                { backgroundColor: accentColor, opacity: saving || !caja ? 0.6 : 1 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>REGISTRAR ENTRADA</Text>
              )}
            </AnimatedButton>
          </View>

          {/* ── Listado del día ──────────────────────────────────── */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor, marginTop: 20 },
            ]}
          >
            <View style={styles.listHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                  HOY · {fecha.split('-').reverse().join('/')}
                </Text>
                <Text style={[styles.totalValue, { color: textPrimary, fontSize: 20 }]}>
                  {formatCurrency(total)}
                </Text>
              </View>
              <Text style={{ color: textSecondary, fontSize: 12 }}>
                {entradas.length} {entradas.length === 1 ? 'persona' : 'personas'}
              </Text>
            </View>

            {entradas.length === 0 && (
              <Text style={{ color: textSecondary, fontSize: 13, textAlign: 'center' }}>
                {caja
                  ? 'Sin entradas registradas en este turno.'
                  : 'Sin caja abierta: no hay turno que listar.'}
              </Text>
            )}

            {entradas.map(entrada => {
              const estado = ESTADOS[entrada.cortesia_estado] ?? ESTADOS.pendiente;
              return (
                <View
                  key={entrada.id}
                  style={[styles.entradaRow, { borderColor }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}
                      numberOfLines={1}
                    >
                      {entrada.cliente_nombre || 'Cliente sin nombre'}
                    </Text>
                    <Text style={{ color: textSecondary, fontSize: 11 }}>
                      {entrada.hora} · {entrada.metodo_pago}
                      {entrada.registrado_por_nombre
                        ? ` · ${entrada.registrado_por_nombre}`
                        : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>
                      {formatCurrency(entrada.monto_entrada)}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: `${estado.color}1F` }]}>
                      <Text style={{ color: estado.color, fontSize: 10, fontWeight: '800' }}>
                        {estado.label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
  card: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    height: 52,
  },
  stepperBtn: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: { fontSize: 18, fontWeight: '900', minWidth: 56, textAlign: 'center' },
  metodosRow: { flexDirection: 'row', gap: 8 },
  metodoChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  metodoLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  fotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },
  fotoThumb: { width: 40, height: 40, borderRadius: 10 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
  },
  totalValue: { fontSize: 22, fontWeight: '900' },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  cajaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  entradaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
});
