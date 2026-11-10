import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { payrollService, type PayrollRow } from '@/services/payroll';
import { formatCurrency } from '@/utils/format';
import { showToast } from '@/utils/toast-lazy';

const COMPONENTES: { key: keyof PayrollRow; label: string; descuenta?: boolean }[] = [
  { key: 'sueldos', label: 'Sueldos' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'servicios', label: 'Servicios' },
  { key: 'propinas', label: 'Propinas' },
  { key: 'total_monto_horas', label: 'Horas extras' },
  { key: 'gratificaciones', label: 'Gratificaciones' },
  { key: 'anticipos', label: 'Anticipos', descuenta: true },
  { key: 'aportes', label: 'Aportes', descuenta: true },
  { key: 'descuentos', label: 'Descuentos', descuenta: true },
];

const numero = (value: unknown) => Number(value) || 0;

export default function PagosTrabajadoresScreen() {
  const router = useRouter();
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } =
    useAccentColor();
  const [data, setData] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [confirmRow, setConfirmRow] = useState<PayrollRow | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setError('');
      const res = await payrollService.list(signal);
      if (signal?.aborted) return;
      if (!res.success) throw new Error(res.message || 'No se pudo cargar la planilla');
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Error de conexión');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const ac = new AbortController();
      fetchData(ac.signal);
      return () => ac.abort();
    }, [fetchData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const totalGeneral = useMemo(
    () => data.reduce((suma, fila) => suma + numero(fila.total), 0),
    [data],
  );

  const pagar = useCallback(
    async (fila: PayrollRow) => {
      setPayingId(String(fila.id_usuario));
      try {
        const res = await payrollService.pay(String(fila.id_usuario), numero(fila.total));
        if (!res.success) {
          showToast({ type: 'error', text1: 'No se pudo pagar', text2: res.message });
          return;
        }
        showToast({
          type: 'success',
          text1: 'Nómina pagada',
          text2: `${fila.usuario} · ${formatCurrency(res.data?.monto ?? fila.total)}`,
        });
        await fetchData();
      } catch (err: any) {
        showToast({
          type: 'error',
          text1: 'No se pudo pagar',
          text2: err?.message || 'Error de conexión',
        });
      } finally {
        setPayingId(null);
        setConfirmRow(null);
      }
    },
    [fetchData],
  );

  const renderItem = useCallback(
    ({ item }: { item: PayrollRow }) => {
      const inicial = (item.usuario || '?').trim().charAt(0).toUpperCase();
      const componentes = COMPONENTES.map(componente => ({
        ...componente,
        valor: numero(item[componente.key]),
      })).filter(componente => componente.valor > 0);
      const pagando = payingId === String(item.id_usuario);

      return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: `${accentColor}22` }]}>
              <Text style={[styles.avatarText, { color: accentColor }]}>{inicial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nombre, { color: textPrimary }]} numberOfLines={1}>
                {item.usuario}
              </Text>
              <Text style={[styles.meta, { color: textSecondary }]} numberOfLines={1}>
                {item.rol || 'Sin rol'}
              </Text>
            </View>
            <Text style={[styles.total, { color: accentColor }]}>
              {formatCurrency(item.total)}
            </Text>
          </View>

          <View style={styles.componentes}>
            {componentes.map(componente => (
              <View key={String(componente.key)} style={styles.componenteRow}>
                <Text style={[styles.componenteLabel, { color: textSecondary }]}>
                  {componente.label}
                </Text>
                <Text
                  style={[
                    styles.componenteValor,
                    { color: componente.descuenta ? '#EF4444' : textPrimary },
                  ]}
                >
                  {componente.descuenta ? '-' : ''}
                  {formatCurrency(componente.valor)}
                </Text>
              </View>
            ))}
            {componentes.length === 0 ? (
              <Text style={[styles.meta, { color: textSecondary }]}>Sin componentes pendientes</Text>
            ) : null}
          </View>

          {item.ultima_liquidacion_fecha ? (
            <Text style={[styles.meta, { color: textSecondary }]}>
              Última liquidación: {formatCurrency(item.ultima_liquidacion_monto || 0)} ·{' '}
              {new Date(item.ultima_liquidacion_fecha).toLocaleDateString('es-CL')}
            </Text>
          ) : null}

          <Pressable
            disabled={pagando}
            onPress={() => setConfirmRow(item)}
            style={[
              styles.payBtn,
              { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}55` },
              pagando && { opacity: 0.6 },
            ]}
          >
            {pagando ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <Ionicons name="wallet-outline" size={16} color={accentColor} />
            )}
            <Text style={[styles.payText, { color: accentColor }]}>
              {pagando ? 'Pagando…' : `Pagar ${formatCurrency(item.total)}`}
            </Text>
          </Pressable>
        </View>
      );
    },
    [accentColor, borderColor, cardBg, payingId, textPrimary, textSecondary],
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <PremiumHeader title="Pagos a trabajadores" subtitle="Planilla pendiente" />
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonLoader width="100%" height={180} borderRadius={20} />
          <SkeletonLoader width="100%" height={180} borderRadius={20} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Pagos a trabajadores"
        subtitle={`${data.length} trabajadores · ${formatCurrency(totalGeneral)}`}
        rightComponent={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backText}>Atrás</Text>
          </Pressable>
        }
      />

      {error ? (
        <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={[styles.emptyText, { color: textSecondary }]}>{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              fetchData();
            }}
            style={[styles.retryBtn, { backgroundColor: accentColor }]}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => String(item.id_usuario)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <Ionicons name="checkmark-done-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                No hay saldos pendientes de pago
              </Text>
            </View>
          }
        />
      )}

      <PremiumAlert
        visible={!!confirmRow}
        title="Pagar nómina"
        message={
          confirmRow
            ? `¿Pagar ${formatCurrency(confirmRow.total)} a ${confirmRow.usuario}? Se liquidarán todos sus montos pendientes.`
            : ''
        }
        type="warning"
        showCancel
        confirmText="Pagar"
        onConfirm={() => {
          if (confirmRow) void pagar(confirmRow);
        }}
        onCancel={() => setConfirmRow(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '900' },
  nombre: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 2 },
  total: { fontSize: 17, fontWeight: '900' },
  componentes: { marginTop: 12, gap: 6 },
  componenteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  componenteLabel: { fontSize: 12, fontWeight: '600' },
  componenteValor: { fontSize: 12, fontWeight: '800' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  payText: { fontSize: 13, fontWeight: '800' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    gap: 6,
  },
  backText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', margin: 16 },
  emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
});
