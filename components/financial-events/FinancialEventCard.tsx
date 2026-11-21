import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';
import { BorderRadius } from '@/constants/spacing';

interface FinancialEventCardProps {
  item: any;
  index: number;
  type: 'comisiones' | 'propinas';
  isDark: boolean;
  accentColor: string;
  cardBg: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  formatDate: (dateStr: string) => string;
  formatTime: (dateStr: string) => string;
  onPress: (item: any) => void;
}

export const FinancialEventCard: React.FC<FinancialEventCardProps> = ({
  item,
  index,
  type,
  isDark,
  accentColor,
  cardBg,
  surfaceMuted,
  textPrimary,
  textSecondary,
  borderColor,
  formatDate,
  formatTime,
  onPress,
}) => {
    const { accentOnSurface } = useAccentColor();
  const isPendiente = item.estado === 1;
  const amount = item.comision || item.monto || 0;
  const code = item.codigo || item.codigo_venta;
  
  // Borde neón en modo oscuro con el color del tipo
  const cardNeonColor = type === 'comisiones' ? accentColor : '#10B981';
  const cardNeonGlow = isDark ? {
    shadowColor: cardNeonColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderColor: cardNeonColor,
    borderWidth: 1.5,
  } : {};

  return (
    <AnimatedView
      from={{ opacity: 0, translateY: 30 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: Math.min(index, 4) * 30 }}
    >
      <Pressable
        onPress={() => onPress(item)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor,
            opacity: pressed ? 0.8 : 1,
            ...cardNeonGlow,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.indexBadge,
              { backgroundColor: surfaceMuted },
            ]}
          >
            <Text style={[styles.indexText, { color: textPrimary }]}>
              {index + 1}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {code && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.05)'
                      : '#F1F5F9',
                  },
                ]}
              >
                <Ionicons
                  name="receipt-outline"
                  size={12}
                  color={accentOnSurface}
                />
                <Text style={[styles.badgeText, { color: accentOnSurface }]}>
                  {code}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isPendiente
                    ? isDark
                      ? '#065F46'
                      : '#D1FAE5'
                    : isDark
                      ? '#1e3b8a'
                      : '#DBEAFE',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isPendiente
                      ? isDark
                        ? '#6EE7B7'
                        : '#065F46'
                      : isDark
                        ? '#93C5FD'
                        : '#1E40AF',
                  },
                ]}
              >
                {isPendiente
                  ? 'Pendiente'
                  : type === 'comisiones' && Number(item.estado) === 0
                    ? 'Anulado'
                    : 'Cobrado'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={textSecondary}
            />
            <Text style={[styles.dateText, { color: textPrimary }]}>
              {formatDate(item.fecha_crea)}
            </Text>
            <Text style={[styles.timeText, { color: textSecondary }]}>
              {formatTime(item.fecha_crea)}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: textSecondary }]}>
              {type === 'comisiones' ? 'Comisión de Venta' : 'Propina'}
            </Text>
            <Text
              style={[
                styles.amountValue,
                { color: isPendiente ? accentColor : '#10B981' },
              ]}
            >
              ${amount.toLocaleString()}
            </Text>
          </View>
          <View
            style={{
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: accentOnSurface,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              Ver detalles
            </Text>
            <Ionicons
              name="chevron-forward"
              size={12}
              color={accentOnSurface}
            />
          </View>
        </View>
      </Pressable>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: BorderRadius.card, padding: 16, marginTop: 10, borderWidth: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: { fontSize: 14, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: {},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dateText: { fontSize: 14 },
  timeText: { fontSize: 13, marginLeft: 6 },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: { fontSize: 14, fontWeight: '600' },
  amountValue: { fontSize: 24, fontWeight: '900' },
});
