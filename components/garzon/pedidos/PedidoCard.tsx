import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Colors } from '@/constants/theme';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';
import { formatCurrency } from '@/utils/format';
import { parseDateSafe } from '@/utils/timeUtils';
import type { Pedido } from '@/hooks/useMisPedidos';
import { StatusBadge } from '@/components/ui/StatusBadge';

type PedidoCardProps = {
  pedido: Pedido;
  onPress: (pedido: Pedido) => void;
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Aprobado',
  1: 'Pendiente',
  2: 'Rechazado',
  3: 'Cancelado',
};

export function PedidoCard({ pedido, onPress }: PedidoCardProps) {
  const { cardBg, borderColor, textPrimary, textSecondary, isDark } =
    useAccentColor();
  const C = Colors[isDark ? 'dark' : 'light'];
  const statusColor =
    pedido.estado === 0
      ? C.success
      : pedido.estado === 1
        ? C.warning
        : pedido.estado === 2
          ? C.error
          : textSecondary;
  const fecha = pedido.fecha_crea
    ? parseDateSafe(pedido.fecha_crea).toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const nicks = String(pedido.nicks || '')
    .split(',')
    .map((nick) => nick.trim())
    .filter(Boolean);

  return (
    <Pressable
      onPress={() => onPress(pedido)}
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${pedido.codigo}, ${STATUS_LABELS[pedido.estado] || 'desconocido'}, total ${formatCurrency(pedido.total)}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor,
          borderLeftColor: statusColor,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.code, { color: textPrimary }]} numberOfLines={1}>
          {pedido.codigo || `#${pedido.id_pedido}`}
        </Text>
        <StatusBadge
          label={STATUS_LABELS[pedido.estado] || 'Desconocido'}
          color={statusColor}
          bg={`${statusColor}18`}
          dot
        />
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={14} color={textSecondary} />
        <Text style={[styles.infoText, { color: textPrimary }]} numberOfLines={1}>
          {pedido.cliente_nombre || 'Sin cliente'}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={14} color={textSecondary} />
        <Text style={[styles.infoText, { color: textSecondary }]} numberOfLines={1}>
          {fecha || 'Sin fecha'}
        </Text>
      </View>
      {!!pedido.mesero_nombre && (
        <View style={styles.infoRow}>
          <Ionicons name="walk-outline" size={14} color={textSecondary} />
          <Text style={[styles.infoText, { color: textSecondary }]} numberOfLines={1}>
            {pedido.mesero_nombre}
          </Text>
        </View>
      )}

      {nicks.length > 0 && (
        <View style={styles.nicks}>
          {nicks.slice(0, 4).map((nick, index) => (
            <View
              key={`${nick}-${index}`}
              style={[styles.nick, { backgroundColor: `${statusColor}14` }]}
            >
              <Text style={[styles.nickText, { color: textSecondary }]}>
                {nick}
              </Text>
            </View>
          ))}
          {nicks.length > 4 && (
            <Text style={[styles.moreNicks, { color: textSecondary }]}>
              +{nicks.length - 4}
            </Text>
          )}
        </View>
      )}

      <View style={[styles.totalRow, { borderTopColor: borderColor }]}>
        <View>
          <Text style={[styles.totalLabel, { color: textSecondary }]}>
            Subtotal {formatCurrency(pedido.subtotal || 0)}
          </Text>
          <Text style={[styles.total, { color: textPrimary }]}>
            {formatCurrency(pedido.total)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderLeftWidth: 5,
    padding: 14,
    gap: 6,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  code: { flex: 1, fontSize: 17, fontFamily: FontFamily.extrabold },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  infoText: { flex: 1, fontSize: 13, fontFamily: FontFamily.medium },
  nicks: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  nick: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  nickText: { fontSize: 10, fontFamily: FontFamily.bold },
  moreNicks: { alignSelf: 'center', fontSize: 10, fontFamily: FontFamily.bold },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 9,
    marginTop: 3,
  },
  totalLabel: { fontSize: 10, fontFamily: FontFamily.semibold },
  total: { fontSize: 20, fontFamily: FontFamily.black, letterSpacing: -0.4 },
});
