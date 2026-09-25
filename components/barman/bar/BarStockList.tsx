import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import FlashList from '@/components/shared/FlashList';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { formatCurrency } from '@/utils/format';
import type { BarStockItem } from '@/hooks/useBarScreen';

interface BarStockListProps {
  items: BarStockItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export function BarStockList({ items, loading, refreshing, onRefresh }: BarStockListProps) {
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
      keyExtractor={(item: BarStockItem) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="wine-outline" size={48} color={textSecondary} />
          <Text style={[styles.emptyText, { color: textSecondary }]}>
            Sin productos en el bar
          </Text>
        </View>
      }
      renderItem={({ item, index }: { item: BarStockItem; index: number }) => (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, { color: textPrimary }]} numberOfLines={1}>
                {item.producto_nombre}
              </Text>
              <Text style={[styles.presentation, { color: textSecondary }]} numberOfLines={1}>
                {item.nombre}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {item.stock_bar ?? 0} bar
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Precio venta</Text>
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {formatCurrency(item.precio_venta || 0)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Almacén</Text>
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {item.stock ?? 0}
              </Text>
            </View>
            {(item.ml_abierta ?? 0) > 0 && (
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Botella abierta</Text>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  {item.ml_abierta} ml
                </Text>
              </View>
            )}
          </View>

          {(item.ml_servidos ?? 0) > 0 && (
            <Text style={[styles.served, { color: textSecondary }]}>
              Servido: {item.ml_servidos} ml
            </Text>
          )}
          <Text style={[styles.indexHint, { color: textSecondary }]}>#{index + 1}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productName: { fontSize: 15, fontWeight: '800' },
  presentation: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  cardBody: { flexDirection: 'row', gap: 18, marginTop: 12 },
  stat: { alignItems: 'flex-start' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  served: { fontSize: 11, fontWeight: '700', marginTop: 8, textTransform: 'uppercase' },
  indexHint: { fontSize: 10, marginTop: 6, opacity: 0.6 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
});
