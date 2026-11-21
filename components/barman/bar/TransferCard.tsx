import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { formatCurrency } from '@/utils/format';
import { readableTextColor } from '@/utils/color';
import type { BarTransfer } from '@/hooks/useBarScreen';
import {
  etiquetaOpcionVenta,
  resolverVentaProducto,
  type OpcionVentaProducto,
} from '@/hooks/utils/saleChoice';

interface TransferCardProps {
  item: BarTransfer;
  onPress: () => void;
}

export function TransferCard({ item, onPress }: TransferCardProps) {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface} = useAccentColor();
  const fecha = item.fecha_crea ? new Date(item.fecha_crea) : null;
  const opciones = resolverVentaProducto(item).opciones;
  // Traspasos antiguos sin opciones guardadas: queda el precio del movimiento.
  const precios: OpcionVentaProducto[] = opciones.length
    ? opciones
    : Number(item.precio_venta) > 0
      ? [
          {
            value: 'botella',
            nombre: 'Botella',
            precio: Number(item.precio_venta),
            comision: Number(item.comision ?? 0),
            esShot: false,
          },
        ]
      : [];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle del traspaso de ${item.producto_nombre}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrapper, { backgroundColor: `${accentColor}20` }]}>
          <Ionicons name="swap-horizontal" size={18} color={accentOnSurface} />
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

      {precios.length > 0 && (
        <View style={styles.amountsList}>
          {precios.map((opcion) => (
            <View key={opcion.value} style={styles.amountRow}>
              <Text style={[styles.optionLabel, { color: textSecondary }]} numberOfLines={1}>
                {etiquetaOpcionVenta(opcion, precios)}
              </Text>
              <Text style={[styles.optionAmount, { color: textPrimary }]}>
                {formatCurrency(opcion.precio)}
                {opcion.comision > 0 ? ` · Comisión ${formatCurrency(opcion.comision)}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.detailHint, { borderTopColor: borderColor }]}>
        <Text style={[styles.detailHintText, { color: accentOnSurface }]}>Ver detalle</Text>
        <Ionicons name="chevron-forward" size={16} color={accentOnSurface} />
      </View>
    </Pressable>
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
  const { accentColor} = useAccentColor();
  const btnTextColor = readableTextColor(accentColor);

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
          <ActivityIndicator size="small" color={btnTextColor} />
        ) : (
          <>
            <Ionicons name="checkmark" size={16} color={btnTextColor} />
            <Text style={[styles.acceptText, { color: btnTextColor }]}>Aceptar</Text>
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
  amountsList: { gap: 4, marginTop: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  optionLabel: { flexShrink: 1, fontSize: 12, fontWeight: '700' },
  optionAmount: { fontSize: 12, fontWeight: '800' },
  detailHint: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  detailHintText: { fontSize: 12, fontWeight: '800' },
  actionsRow: { flexDirection: 'column', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
  },
  rejectBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)' },
  rejectText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
  acceptBtn: {},
  acceptText: { fontWeight: '800', fontSize: 13 },
});
