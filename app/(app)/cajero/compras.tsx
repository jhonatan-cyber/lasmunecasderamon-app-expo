import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { comprasService, type Compra } from '@/services/compras';
import { formatCurrency } from '@/utils/format';
import { parseDateSafe } from '@/utils/timeUtils';

const fechaCorta = (fecha: string) =>
  parseDateSafe(fecha).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ComprasScreen() {
  const router = useRouter();
  const { accentColor, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } =
    useAccentColor();
  const [data, setData] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Compra | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setError('');
      const res = await comprasService.list(signal);
      if (signal?.aborted) return;
      if (!res.success) throw new Error(res.message || 'No se pudieron cargar las compras');
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

  const totalCompras = useMemo(
    () => data.reduce((suma, compra) => suma + Number(compra.total || 0), 0),
    [data],
  );

  const renderItem = useCallback(
    ({ item }: { item: Compra }) => (
      <Pressable
        onPress={() => setSelected(item)}
        style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.folio, { color: textPrimary }]}>{item.folio}</Text>
            <Text style={[styles.meta, { color: textSecondary }]}>
              {fechaCorta(item.fecha_crea)}
              {item.usuario_nombre ? ` · ${item.usuario_nombre}` : ''}
            </Text>
          </View>
          <Text style={[styles.total, { color: accentColor }]}>
            {formatCurrency(item.total)}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: `${accentColor}18` }]}>
              <Ionicons name="cube-outline" size={12} color={accentColor} />
              <Text style={[styles.chipText, { color: accentColor }]}>
                {item.detalles?.length || 0} ítems
              </Text>
            </View>
            {item.metodo_pago ? (
              <View style={[styles.chip, { backgroundColor: isDark ? '#111111' : '#F1F5F9' }]}>
                <Text style={[styles.chipText, { color: textSecondary }]}>
                  {item.metodo_pago}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.proveedor, { color: textSecondary }]} numberOfLines={1}>
            {item.proveedor || 'Sin proveedor'}
          </Text>
        </View>
      </Pressable>
    ),
    [accentColor, borderColor, cardBg, isDark, textPrimary, textSecondary],
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <PremiumHeader title="Compras" subtitle="Últimas 100 compras" />
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonLoader width="100%" height={110} borderRadius={20} />
          <SkeletonLoader width="100%" height={110} borderRadius={20} />
          <SkeletonLoader width="100%" height={110} borderRadius={20} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Compras"
        subtitle={`${data.length} compras · ${formatCurrency(totalCompras)}`}
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
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <Ionicons name="bag-handle-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                No hay compras registradas
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                  Compra {selected?.folio}
                </Text>
                <Text style={[styles.meta, { color: textSecondary }]}>
                  {selected ? fechaCorta(selected.fecha_crea) : ''}
                </Text>
              </View>
              <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {selected?.detalles?.map(detalle => (
                <View
                  key={String(detalle.id)}
                  style={[styles.detalleRow, { borderTopColor: borderColor }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detalleNombre, { color: textPrimary }]}>
                      {detalle.producto_nombre || 'Producto'}
                      {detalle.presentacion_nombre ? ` · ${detalle.presentacion_nombre}` : ''}
                    </Text>
                    <Text style={[styles.meta, { color: textSecondary }]}>
                      {detalle.cantidad} × {formatCurrency(detalle.precio_compra)}
                      {detalle.fecha_vencimiento
                        ? ` · vence ${parseDateSafe(detalle.fecha_vencimiento).toLocaleDateString('es-CL')}`
                        : ''}
                    </Text>
                  </View>
                  <Text style={[styles.detalleSubtotal, { color: textPrimary }]}>
                    {formatCurrency(detalle.subtotal)}
                  </Text>
                </View>
              ))}

              <View style={[styles.modalInfo, { borderTopColor: borderColor }]}>
                <Text style={[styles.meta, { color: textSecondary }]}>
                  Proveedor: {selected?.proveedor || 'Sin proveedor'}
                  {selected?.telefono ? ` · ${selected.telefono}` : ''}
                </Text>
                <Text style={[styles.meta, { color: textSecondary }]}>
                  Pago: {selected?.metodo_pago || 'Sin método'}
                  {selected?.usuario_nombre ? ` · Registró ${selected.usuario_nombre}` : ''}
                </Text>
                {selected?.observaciones ? (
                  <Text style={[styles.meta, { color: textSecondary }]}>
                    {selected.observaciones}
                  </Text>
                ) : null}
              </View>
            </ScrollView>

            <View style={[styles.modalTotal, { borderTopColor: borderColor }]}>
              <Text style={[styles.modalTotalLabel, { color: textSecondary }]}>TOTAL</Text>
              <Text style={[styles.modalTotalValue, { color: accentColor }]}>
                {formatCurrency(selected?.total || 0)}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  folio: { fontSize: 15, fontWeight: '900' },
  meta: { fontSize: 12, marginTop: 3 },
  total: { fontSize: 17, fontWeight: '900' },
  cardFooter: { marginTop: 12, gap: 8 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  chipText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  proveedor: { fontSize: 12, fontWeight: '600' },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900' },
  detalleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  detalleNombre: { fontSize: 13, fontWeight: '700' },
  detalleSubtotal: { fontSize: 13, fontWeight: '800' },
  modalInfo: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, gap: 6 },
  modalTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 12,
  },
  modalTotalLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  modalTotalValue: { fontSize: 22, fontWeight: '900' },
});
