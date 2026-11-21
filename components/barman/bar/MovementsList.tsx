import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import { View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import VirtualizedList from '@/components/shared/VirtualizedList';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatCurrency } from '@/utils/format';
import { preciosOpcionesVenta } from '@/hooks/utils/saleChoice';
import type { BarMovement } from '@/hooks/useBarScreen';

interface MovementsListProps {
  items: BarMovement[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onPressItem: (item: BarMovement) => void;
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

export function MovementsList({ items, loading, refreshing, onRefresh, onPressItem }: MovementsListProps) {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface, isDark } = useAccentColor();
  const reducedMotion = useReducedMotion();

  // Animación de entrada escalonada para las cards
  const cardAnimations = items.map(() => useSharedValue(0));
  const fadeAnimations = items.map(() => useSharedValue(0));

  if (reducedMotion) {
    // Sin animación cuando el usuario prefiere movimiento reducido.
    cardAnimations.forEach(sv => sv.value = 1);
    fadeAnimations.forEach(sv => sv.value = 1);
  } else {
    cardAnimations.forEach((sv, index) => {
      sv.value = withDelay(index * 50, withSpring(1, { damping: 12, stiffness: 100 }));
    });
    fadeAnimations.forEach((sv, index) => {
      sv.value = withDelay(index * 50, withTiming(1, { duration: 250 }));
    });
  }

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
    <VirtualizedList
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
      renderItem={({ item, index }: { item: BarMovement; index: number }) => {
        const fecha = item.fecha_crea ? new Date(item.fecha_crea) : null;
        const precios = preciosOpcionesVenta(item.opciones_venta);
        const precioRegistrado =
          item.precio_venta !== null && item.precio_venta !== undefined
            ? formatCurrency(item.precio_venta)
            : null;
        const comisionRegistrada =
          Number(item.comision ?? 0) > 0
            ? formatCurrency(Number(item.comision))
            : null;

        // Animación de entrada escalonada
        const animatedStyle = useAnimatedStyle(() => ({
          transform: [{ scale: cardAnimations[index]?.value ?? 1 }],
          opacity: fadeAnimations[index]?.value ?? 1,
        }));

        // Borde neón en modo oscuro con el color del estado
        const statusColor = estadoColor(item);
        const neonGlow = isDark ? {
          shadowColor: statusColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 3,
        } : {};

        // Dot animado para estado pendiente
        const isPendiente = item.estado === 'pendiente';

        return (
          <Animated.View style={animatedStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver detalle de ${item.tipo} de ${item.producto_nombre || 'producto'}`}
              onPress={() => onPressItem(item)}
              style={({ pressed }) => [styles.card, { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.78 : 1 }, neonGlow]}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: textPrimary }]} numberOfLines={1}>
                    {item.producto_nombre || '—'}
                  </Text>
                  <Text style={[styles.presentation, { color: textSecondary }]} numberOfLines={1}>
                    {item.presentacion_nombre || '—'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                  {isPendiente && isDark && (
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  )}
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {estadoLabel(item)}
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <Text style={[styles.amount, { color: textPrimary }]}>
                  {item.cantidad} und.
                  {(item.ml ?? 0) > 0 ? ` · ${item.ml} ml` : ''}
                </Text>
                {precios.length === 0 && (
                  <View style={styles.amountRight}>
                    <Text style={[styles.amount, { color: accentOnSurface }]}>
                      {precioRegistrado ?? '—'}
                    </Text>
                    {comisionRegistrada && (
                      <Text style={[styles.amount, { color: textSecondary }]}>
                        Comisión {comisionRegistrada}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {precios.length > 0 && (
                <View style={styles.amountsList}>
                  {precios.map((precio, pIndex) => (
                    <View key={`${precio.label}-${pIndex}`} style={styles.amountRow}>
                      <Text
                        style={[styles.priceLabel, { color: textSecondary }]}
                        numberOfLines={1}
                      >
                        {precio.label}
                      </Text>
                      <Text style={[styles.amount, { color: textPrimary }]}>
                        {formatCurrency(precio.precio)}
                        {precio.comision > 0
                          ? ` · Comisión ${formatCurrency(precio.comision)}`
                          : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

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
              <View style={[styles.detailHint, { borderTopColor: borderColor }]}>
                <Text style={[styles.detailHintText, { color: accentOnSurface }]}>Ver detalle completo</Text>
                <Ionicons name="chevron-forward" size={16} color={accentOnSurface} />
              </View>
            </Pressable>
          </Animated.View>
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
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 8 },
  amountRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountsList: { gap: 4, marginTop: 8 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  priceLabel: { flexShrink: 1, fontSize: 12, fontWeight: '700' },
  amount: { fontSize: 13, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  footerText: { fontSize: 11, fontWeight: '600' },
  detailHint: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth },
  detailHintText: { fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
});
