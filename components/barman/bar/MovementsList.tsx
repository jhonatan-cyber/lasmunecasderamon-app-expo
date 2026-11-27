import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MovementsListProps {
  items: BarMovement[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onPressItem: (item: BarMovement) => void;
}

interface MovementCardProps {
  item: BarMovement;
  index: number;
  onPressItem: (item: BarMovement) => void;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  accentOnSurface: string;
  accentColor: string;
  isDark: boolean;
  reducedMotion: boolean;
}

function MovementCard({ item, index, onPressItem, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface, accentColor, isDark, reducedMotion }: MovementCardProps) {
  const cardAnim = useSharedValue(reducedMotion ? 1 : 0);
  const fadeAnim = useSharedValue(reducedMotion ? 1 : 0);

  if (!reducedMotion) {
    cardAnim.value = withDelay(index * 50, withSpring(1, { damping: 12, stiffness: 100 }));
    fadeAnim.value = withDelay(index * 50, withTiming(1, { duration: 250 }));
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardAnim.value }],
    opacity: fadeAnim.value,
  }));

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

  const key = estadoKey(item);
  const statusColor = key === 'success' ? accentOnSurface : key === 'warning' ? accentOnSurface : key === 'error' ? accentColor : textSecondary;
  const neonGlow = isDark ? {
    shadowColor: statusColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  } : {};

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
          <View style={{ flex: 1, minWidth: 0 }}>
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
          <Text
            style={[styles.amount, { color: textPrimary, flexShrink: 1 }]}
            numberOfLines={1}
          >
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
                <Text
                  style={[styles.amount, { color: textPrimary }]}
                  numberOfLines={1}
                >
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
          <Text
            style={[styles.footerText, { color: textSecondary, flexShrink: 1, minWidth: 0 }]}
            numberOfLines={1}
          >
            {item.usuario_nombre || item.usuario_nick || '—'}
          </Text>
          {fecha && (
            <Text style={[styles.footerText, { color: textSecondary }]} numberOfLines={1}>
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
}

const estadoLabel = (m: BarMovement) => {
  if (m.tipo === 'venta') return 'Vendida';
  if (m.estado === 'aceptada') return 'Aceptada';
  if (m.estado === 'pendiente') return 'Pendiente';
  if (m.estado === 'rechazada') return 'Rechazada';
  return 'Histórica';
};

const estadoKey = (m: BarMovement): 'success' | 'warning' | 'error' | 'neutral' => {
  if (m.tipo === 'venta') return 'success';
  if (m.estado === 'aceptada') return 'success';
  if (m.estado === 'pendiente') return 'warning';
  if (m.estado === 'rechazada') return 'error';
  return 'neutral';
};

export function MovementsList({ items, loading, refreshing, onRefresh, onPressItem }: MovementsListProps) {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface, isDark } = useAccentColor();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  if (loading) {
    return (
      <View style={{ padding: 16, gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="100%" height={90} borderRadius={16} accessibilityRole="progressbar" accessibilityLabel="Cargando movimientos" />
        ))}
      </View>
    );
  }

  return (
    <VirtualizedList
      data={items}
      keyExtractor={(item: BarMovement) => item.id}
      contentContainerStyle={[
        styles.list,
        { paddingBottom: 24 + insets.bottom },
      ]}
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
      renderItem={({ item, index }: { item: BarMovement; index: number }) => (
        <MovementCard
          item={item}
          index={index}
          onPressItem={onPressItem}
          cardBg={cardBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
          accentOnSurface={accentOnSurface}
          accentColor={accentColor}
          isDark={isDark}
          reducedMotion={reducedMotion}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16 },
  card: { borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productName: { fontSize: 15, fontFamily: FontFamily.extrabold },
  presentation: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 10, fontFamily: FontFamily.extrabold, textTransform: 'uppercase' },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 8 },
  amountRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  amountsList: { gap: 4, marginTop: 8 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  priceLabel: { flexShrink: 1, minWidth: 0, fontSize: 12, fontFamily: FontFamily.bold },
  amount: { fontSize: 13, fontFamily: FontFamily.bold },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  footerText: { fontSize: 11, fontFamily: FontFamily.semibold },
  detailHint: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth },
  detailHintText: { fontSize: 11, fontFamily: FontFamily.extrabold },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: FontFamily.semibold },
});
