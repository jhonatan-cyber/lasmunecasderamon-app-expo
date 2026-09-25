import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import FlashList from '@/components/shared/FlashList';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { formatCurrency } from '@/utils/format';
import type { BarMovement } from '@/hooks/useBarScreen';

interface MovementsListProps {
  items: BarMovement[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

const estadoLabel = (m: BarMovement) => {
  if (m.tipo === 'venta') return 'Vendida';
  if (m.estado === 'aceptada') return 'Aceptada';
  if (m.estado === 'pendiente') return 'Pendiente';
  if (m.estado === 'rechazada') return 'Rechazada';
  return 'Histórica';
};

const estadoColor = (m: BarMovement) => {
  if (m.tipo === 'venta') return '#10B981';
  if (m.estado === 'aceptada') return '#10B981';
  if (m.estado === 'pendiente') return '#F59E0B';
  if (m.estado === 'rechazada') return '#EF4444';
  return '#6B7280';
};

export function MovementsList({ items, loading, refreshing, onRefresh }: MovementsListProps) {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();

  if (loading) {
    return (
      <View style={{ padding: 16, gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="100%" height={90} borderRadius={16} />
        ))}
      </View>
    );
  }

  return (
    <FlashList
      data={items}
      keyExtractor={(item: BarMovement) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={48} color={textSecondary} />
          <Text style={[styles.emptyText, { color: textSecondary }]}>
            Sin movimientos registrados
          </Text>
        </View>
      }
      renderItem={({ item }: { item: BarMovement }) => {
        const fecha = item.fecha_crea ? new Date(item.fecha_crea) : null;
        return (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.productName, { color: textPrimary }]} numberOfLines={1}>
                  {item.producto_nombre || '—'}
                </Text>
                <Text style={[styles.presentation, { color: textSecondary }]} numberOfLines={1}>
                  {item.presentacion_nombre || '—'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${estadoColor(item)}20` }]}>
                <Text style={[styles.statusText, { color: estadoColor(item) }]}>
                  {estadoLabel(item)}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={[styles.amount, { color: textPrimary }]}>
                {item.cantidad} und.
                {(item.ml ?? 0) > 0 ? ` · ${item.ml} ml` : ''}
              </Text>
              <Text style={[styles.amount, { color: accentColor }]}>
                {item.precio_venta !== null ? formatCurrency(item.precio_venta) : '—'}
              </Text>
              <Text style={[styles.amount, { color: textSecondary }]}>
                {item.comision !== null ? formatCurrency(item.comision) : '—'}
              </Text>
            </View>

            <View style={styles.footer}>
              <Ionicons name="person-outline" size={13} color={textSecondary} />
              <Text style={[styles.footerText, { color: textSecondary }]} numberOfLines={1}>
                {item.usuario_nombre || item.usuario_nick || '—'}
              </Text>
              {fecha && (
                <Text style={[styles.footerText, { color: textSecondary }]}>
                  {fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })}{' '}
                  {fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productName: { fontSize: 15, fontWeight: '800' },
  presentation: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 8 },
  amount: { fontSize: 13, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  footerText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
});
