import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, RefreshControl, Image } from 'react-native';
import FlashList from '@/components/shared/FlashList';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { formatCurrency } from '@/utils/format';
import type { BarStockItem } from '@/hooks/useBarScreen';
import { BASE_URL } from '@/api/client';
import { parseOpcionesVenta } from '@/hooks/utils/saleChoice';

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
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width="48%" height={220} borderRadius={16} />
            <Skeleton width="48%" height={220} borderRadius={16} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <FlashList
      data={items}
      keyExtractor={(item: BarStockItem) => item.id}
      contentContainerStyle={styles.list}
      numColumns={2}
      columnWrapperStyle={styles.row}
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
      renderItem={({ item }: { item: BarStockItem }) => (
        (() => {
          const opcionesVenta = parseOpcionesVenta(item.opciones_venta);
          const opcionShot = opcionesVenta.find((opcion) => opcion.tipo === 'shot');
          const opcionBotella = opcionesVenta.find((opcion) => opcion.tipo === 'botella');
          const precioShotAnfitriona = Number(opcionShot?.precio_anfitriona ?? 0);
          const shotCompartido = Boolean(
            opcionShot && precioShotAnfitriona > 0 && precioShotAnfitriona === Number(opcionShot.precio),
          );

          return <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.imageWrap}>
            {item.producto_foto ? (
              <Image
                source={{ uri: `${BASE_URL}/api/images/products/${encodeURIComponent(item.producto_foto)}` }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="wine-outline" size={34} color={textSecondary} />
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: `${accentColor}E8` }]}>
              <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
                {item.stock_bar ?? 0} bar
              </Text>
            </View>
          </View>

          <Text style={[styles.productName, { color: textPrimary }]} numberOfLines={2}>
            {item.producto_nombre}
          </Text>
          <Text style={[styles.presentation, { color: textSecondary }]} numberOfLines={1}>
            {item.nombre}
          </Text>

          {opcionesVenta.length > 0 ? (
            <View style={[styles.prices, { borderTopColor: borderColor }]}>
              {opcionBotella && (
                <View style={styles.priceInfo}>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>Botella</Text>
                  <Text style={[styles.statValue, { color: textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(opcionBotella.precio)}
                  </Text>
                  <Text style={[styles.commission, { color: accentColor }]} numberOfLines={1}>
                    Comisión {formatCurrency(opcionBotella.comision)}
                  </Text>
                </View>
              )}
              {opcionShot && (
                <View style={styles.priceRow}>
                  <View style={styles.priceInfo}>
                    <Text style={[styles.statLabel, { color: textSecondary }]}>
                      {shotCompartido ? 'Shot · cliente y anfitriona' : 'Shot cliente'}
                    </Text>
                    <Text style={[styles.statValue, { color: textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                      {formatCurrency(opcionShot.precio)}
                    </Text>
                    <Text style={[styles.commission, { color: accentColor }]} numberOfLines={1}>
                      Comisión {formatCurrency(opcionShot.comision)}
                    </Text>
                  </View>
                  {!shotCompartido && precioShotAnfitriona > 0 && (
                    <View style={[styles.priceInfo, styles.rightPrice]}>
                      <Text style={[styles.statLabel, { color: textSecondary }]}>Shot anfitriona</Text>
                      <Text style={[styles.statValue, { color: textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                        {formatCurrency(precioShotAnfitriona)}
                      </Text>
                      <Text style={[styles.commission, { color: accentColor }]} numberOfLines={1}>
                        Comisión {formatCurrency(opcionShot.comision)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.prices, { borderTopColor: borderColor }]}>
              <View style={styles.priceInfo}>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Botella</Text>
                <Text style={[styles.statValue, { color: textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(item.precio_venta || 0)}
                </Text>
                <Text style={[styles.commission, { color: accentColor }]} numberOfLines={1}>
                  Comisión {formatCurrency(item.comision || 0)}
                </Text>
              </View>
            </View>
          )}

          {(item.ml_shot ?? 0) > 0 && (
            <Text style={[styles.shotSize, { color: textSecondary }]}>Shot: {item.ml_shot} ml</Text>
          )}
          {(item.ml_shot_anfitriona ?? 0) > 0 && item.ml_shot_anfitriona !== item.ml_shot && (
            <Text style={[styles.shotSize, { color: textSecondary }]}>Shot anfitriona: {item.ml_shot_anfitriona} ml</Text>
          )}
          {(item.ml_abierta ?? 0) > 0 && (
            <Text style={[styles.served, { color: '#F59E0B' }]}>Abierta: {item.ml_abierta} ml</Text>
          )}

          {(item.botellas_vacias_shots ?? 0) > 0 && (
            <Text style={[styles.served, { color: '#F59E0B' }]}>
              Vacías por shots: {item.botellas_vacias_shots} · pendientes de devolución
            </Text>
          )}

          {(item.ml_servidos ?? 0) > 0 && (
            <Text style={[styles.served, { color: textSecondary }]}>
              Servido: {item.ml_servidos} ml
            </Text>
          )}
          </View>;
        })()
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { justifyContent: 'space-between', gap: 10 },
  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  card: { flex: 1, minWidth: 0, borderRadius: 16, padding: 10, marginTop: 10, borderWidth: 1 },
  imageWrap: { position: 'relative', width: '100%', height: 116, borderRadius: 11, overflow: 'hidden', marginBottom: 10 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(127,127,127,0.12)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productName: { fontSize: 15, fontWeight: '800' },
  presentation: { fontSize: 12, marginTop: 2 },
  badge: { position: 'absolute', top: 7, right: 7, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  prices: { marginTop: 10, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, gap: 9 },
  priceRow: { flexDirection: 'row', gap: 6 },
  priceInfo: { flex: 1, minWidth: 0 },
  rightPrice: { alignItems: 'flex-end' },
  stat: { alignItems: 'flex-start' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  commission: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  shotSize: { fontSize: 10, fontWeight: '600', marginTop: 6 },
  served: { fontSize: 11, fontWeight: '700', marginTop: 8, textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
});
