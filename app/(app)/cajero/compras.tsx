import Ionicons from '@expo/vector-icons/Ionicons';
import { contentColumn } from '@/constants/layout';
import { FontFamily } from '@/constants/fonts';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { ErrorState } from '@/components/ui/ErrorState';
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
  const { accentColor, bg, cardBg, surfaceMuted, textPrimary, textSecondary, borderColor, accentOnSurface} =
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
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de compra ${item.folio}`}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.folio, { color: textPrimary }]}>{item.folio}</Text>
            <Text style={[styles.meta, { color: textSecondary }]}>
              {fechaCorta(item.fecha_crea)}
              {item.usuario_nombre ? ` · ${item.usuario_nombre}` : ''}
            </Text>
          </View>
          <Text style={[styles.total, { color: accentOnSurface }]}>
            {formatCurrency(item.total)}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: `${accentColor}18` }]}>
              <Ionicons name="cube-outline" size={12} color={accentOnSurface} />
              <Text style={[styles.chipText, { color: accentOnSurface }]}>
                {item.detalles?.length || 0} ítems
              </Text>
            </View>
            {item.metodo_pago ? (
              <View style={[styles.chip, { backgroundColor: surfaceMuted }]}>
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
    [accentColor, accentOnSurface, borderColor, cardBg, surfaceMuted, textPrimary, textSecondary],
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
        onBack={() => router.back()}
      />

      {error ? (
        <ErrorState
          title="No se pudieron cargar las compras"
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchData();
          }}
        />
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
              <Pressable onPress={() => setSelected(null)} hitSlop={10}
                accessibilityRole="button" accessibilityLabel="Cerrar detalle de compra"
              >
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
              <Text style={[styles.modalTotalValue, { color: accentOnSurface }]}>
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
  list: { ...contentColumn, padding: 16, paddingBottom: 40, gap: 10 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  folio: { fontSize: 15, fontFamily: FontFamily.black },
  meta: { fontSize: 12, marginTop: 3 },
  total: { fontSize: 17, fontFamily: FontFamily.black },
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
  chipText: { fontSize: 12, fontFamily: FontFamily.bold, textTransform: 'capitalize' },
  proveedor: { fontSize: 12, fontFamily: FontFamily.semibold },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    gap: 6,
  },
  backText: { fontFamily: FontFamily.extrabold, fontSize: 13, letterSpacing: 0.5 },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', margin: 16 },
  emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
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
  modalTitle: { fontSize: 17, fontFamily: FontFamily.black },
  detalleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  detalleNombre: { fontSize: 13, fontFamily: FontFamily.bold },
  detalleSubtotal: { fontSize: 13, fontFamily: FontFamily.extrabold },
  modalInfo: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, gap: 6 },
  modalTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 12,
  },
  modalTotalLabel: { fontSize: 12, fontFamily: FontFamily.extrabold, letterSpacing: 0.8 },
  modalTotalValue: { fontSize: 22, fontFamily: FontFamily.black },
});
