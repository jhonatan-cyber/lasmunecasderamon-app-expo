import Ionicons from '@expo/vector-icons/Ionicons';
import { contentColumn, tabBarBottomPadding } from '@/constants/layout';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
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
import { EntradasListadoCard } from '@/components/entradas/EntradasListadoCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useConfigValue } from '@/hooks/useConfigValue';
import { cajaService } from '@/services/caja';
import {
  entradasService,
  type EntradaCliente,
  type MetodoPagoEntrada,
} from '@/services/entradas';
import { adjuntarBaucher } from '@/utils/baucherPicker';
import { eventBus } from '@/utils/eventBus';
import { formatCurrency } from '@/utils/format';
import logger from '@/utils/logger';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import { showToast } from '@/utils/toast-lazy';
import { PaymentMethodSelect, type PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';

const METODOS: PaymentMethod[] = ['efectivo', 'tarjeta', 'transferencia'];

const pad = (n: number) => String(n).padStart(2, '0');

function fechaHoraLocal() {
  const ahora = new Date();
  return {
    fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
    hora: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
  };
}

export default function GarzonEntradasScreen() {
  const { accentColor, bg, cardBg, surfaceMuted, textPrimary, textSecondary, borderColor, accentText, accentOnSurface, accentBg, accentBorder } =
    useAccentColor();
  const router = useRouter();

  const costoEntrada = Number(useConfigValue('comisiones', 'costo_entrada', 10000));

  const [clienteNombre, setClienteNombre] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [metodo, setMetodo] = useState<MetodoPagoEntrada>('efectivo');
  const [baucherFoto, setBaucherFoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fotoLoading, setFotoLoading] = useState(false);
  const [registroAbierto, setRegistroAbierto] = useState(true);

  const [entradas, setEntradas] = useState<EntradaCliente[]>([]);
  const [caja, setCaja] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { fecha } = fechaHoraLocal();

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
          onBack={() => router.back()}
        />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={accentOnSurface} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: bg }}
    >
      <PremiumHeader
        title="Entradas"
        subtitle="Cobro de acceso en la puerta"
        onBack={() => router.back()}
      />

      <ScrollView
        automaticallyAdjustKeyboardInsets
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
        <View style={{ padding: 20 }}>
          {!caja && (
            <View style={[styles.cajaBanner, { backgroundColor: accentBg, borderColor: accentBorder }]}>
              <Ionicons name="lock-closed-outline" size={18} color={accentOnSurface} />
              <Text style={{ color: accentOnSurface, fontSize: 12, fontFamily: FontFamily.bold, flex: 1 }}>
                Sin caja abierta. Las entradas del turno se listan mientras la caja esté
                abierta: abre una caja para cobrar en la puerta.
              </Text>
            </View>
          )}

          {/* ── Registro ─────────────────────────────────────────── */}
          <View
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
          >
            <Pressable
              onPress={() => setRegistroAbierto(abierto => !abierto)}
              style={styles.cardToggle}
              accessibilityRole="button"
              accessibilityLabel={registroAbierto ? 'Colapsar nueva entrada' : 'Expandir nueva entrada'}
              accessibilityState={{ expanded: registroAbierto }}
            >
              <Text
                style={[styles.sectionLabel, { color: textSecondary, marginTop: 0, marginBottom: 0 }]}
              >
                NUEVA ENTRADA
              </Text>
              <Ionicons
                name={registroAbierto ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={textSecondary}
              />
            </Pressable>

            {registroAbierto && (
              <>
            <TextInput
              value={clienteNombre}
              onChangeText={setClienteNombre}
              placeholder="Nombre del cliente (opcional)"
              placeholderTextColor={textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: surfaceMuted,
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
                  backgroundColor: surfaceMuted,
                  borderColor,
                },
              ]}
            >
              <Pressable
                onPress={() => setCantidad(c => Math.max(1, c - 1))}
                disabled={cantidad <= 1}
                style={[styles.stepperBtn, cantidad <= 1 && { opacity: 0.4 }]}
                accessibilityRole="button"
                accessibilityLabel="Reducir cantidad"
                accessibilityState={{ disabled: cantidad <= 1 }}
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
                accessibilityRole="button"
                accessibilityLabel="Aumentar cantidad"
                accessibilityState={{ disabled: cantidad >= 100 }}
              >
                <Ionicons name="add" size={20} color={textPrimary} />
              </Pressable>
            </View>

            <PaymentMethodSelect
              methods={METODOS}
              variant="compact"
              selectedMethod={metodo}
              onSelect={(metodoOp) => setMetodo(metodoOp as MetodoPagoEntrada)}
            />

            {metodo === 'transferencia' && (
              <Pressable
                onPress={tomarFotoBaucher}
                disabled={fotoLoading}
                accessibilityRole="button"
                accessibilityLabel="Tomar foto del baucher"
                accessibilityState={{ disabled: fotoLoading }}
                style={[
                  styles.fotoBtn,
                  {
                    backgroundColor: baucherFoto ? accentBg : `${accentColor}1F`,
                    borderColor: baucherFoto ? accentOnSurface : accentColor,
                  },
                ]}
              >
                {fotoLoading ? (
                  <ActivityIndicator size="small" color={accentOnSurface} />
                ) : baucherFoto ? (
                  <Image source={{ uri: baucherFoto }} style={styles.fotoThumb} />
                ) : (
                  <Ionicons name="camera-outline" size={20} color={accentOnSurface} />
                )}
                <Text
                  style={{
                    color: accentOnSurface,
                    fontFamily: FontFamily.bold,
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
                <ActivityIndicator size="small" color={accentText} />
              ) : (
                <Text style={styles.submitText}>REGISTRAR ENTRADA</Text>
              )}
            </AnimatedButton>
              </>
            )}
          </View>

          <View style={{ marginTop: 20 }}>
            <EntradasListadoCard
              entradas={entradas}
              titulo={`HOY · ${fecha.split('-').reverse().join('/')}`}
              vacio={
                caja
                  ? 'Sin entradas registradas en este turno.'
                  : 'Sin caja abierta: no hay turno que listar.'
              }
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: BorderRadius.card,
    padding: 20,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
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
  stepperValue: { fontSize: 18, fontFamily: FontFamily.black, minWidth: 56, textAlign: 'center' },
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
  totalValue: { fontSize: 22, fontFamily: FontFamily.black },
  submitBtn: {
    borderRadius: 16,
    minHeight: 52,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontFamily: FontFamily.black, fontSize: 14, letterSpacing: 0.5 },
  cajaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
});
