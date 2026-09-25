import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { formatCurrency } from '@/utils/format';
import type { BarTransfer } from '@/hooks/useBarScreen';

interface TransferCardProps {
  item: BarTransfer;
  resolving: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function TransferCard({ item, resolving, onAccept, onReject }: TransferCardProps) {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const fecha = item.fecha_crea ? new Date(item.fecha_crea) : null;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrapper, { backgroundColor: `${accentColor}20` }]}>
          <Ionicons name="swap-horizontal" size={18} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.productName, { color: textPrimary }]} numberOfLines={1}>
            {item.producto_nombre}
          </Text>
          <Text style={[styles.presentation, { color: textSecondary }]} numberOfLines={1}>
            {item.presentacion_nombre} · {item.cantidad} und.
          </Text>
        </View>
        <View style={[styles.pendingBadge]}>
          <Text style={styles.pendingText}>Pendiente</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="person-outline" size={14} color={textSecondary} />
        <Text style={[styles.metaText, { color: textSecondary }]} numberOfLines={1}>
          {item.usuario_nombre || '—'}
        </Text>
        {fecha && (
          <>
            <Ionicons name="calendar-outline" size={14} color={textSecondary} style={{ marginLeft: 8 }} />
            <Text style={[styles.metaText, { color: textSecondary }]}>
              {fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })}
            </Text>
          </>
        )}
      </View>

      <View style={styles.amountsRow}>
        <Text style={[styles.amount, { color: textSecondary }]}>
          Venta: {formatCurrency(item.precio_venta || 0)}
        </Text>
        <Text style={[styles.amount, { color: textSecondary }]}>
          Comisión: {formatCurrency(item.comision || 0)}
        </Text>
      </View>

      <TransferActions resolving={resolving} onAccept={onAccept} onReject={onReject} />
    </View>
  );
}

export function TransferActions({
  resolving,
  onAccept,
  onReject,
}: {
  resolving: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { accentColor } = useAccentColor();

  return (
    <View style={styles.actionsRow}>
      <Pressable
        onPress={onReject}
        disabled={resolving}
        style={({ pressed }) => [styles.actionBtn, styles.rejectBtn, pressed && { opacity: 0.7 }, resolving && { opacity: 0.5 }]}
      >
        <Ionicons name="close" size={16} color="#EF4444" />
        <Text style={styles.rejectText}>Rechazar</Text>
      </Pressable>
      <Pressable
        onPress={onAccept}
        disabled={resolving}
        style={({ pressed }) => [styles.actionBtn, styles.acceptBtn, { backgroundColor: accentColor }, pressed && { opacity: 0.7 }, resolving && { opacity: 0.5 }]}
      >
        {resolving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.acceptText}>Aceptar</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrapper: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 15, fontWeight: '800' },
  presentation: { fontSize: 12, marginTop: 2 },
  pendingBadge: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  pendingText: { color: '#F59E0B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  metaText: { fontSize: 12, fontWeight: '600' },
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  amount: { fontSize: 12, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rejectBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)' },
  rejectText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
  acceptBtn: {},
  acceptText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
