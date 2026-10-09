import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OpcionVentaProducto, SaleChoice } from '@/hooks/utils/saleChoice';

type Props = {
  product: any;
  options: OpcionVentaProducto[];
  shotMl: number;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  cardBg: string;
  onAdd: (choice: SaleChoice, cantidad: number) => void;
};

/** Cantidad y acción independientes para botella, shot cliente y shot anfitriona. */
export function SaleFormatSelector({
  product,
  options,
  shotMl,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
  cardBg,
  onAdd,
}: Props) {
  const [quantities, setQuantities] = useState<Partial<Record<SaleChoice, number>>>({});
  const mlCliente = Number(product?.ml_shot) > 0 ? Number(product.ml_shot) : shotMl;
  const mlAnfitriona =
    Number(product?.ml_shot_anfitriona) > 0 ? Number(product.ml_shot_anfitriona) : mlCliente;

  return (
    <View style={styles.list}>
      {options.map(option => {
        const cantidad = quantities[option.value] || 0;
        const max = option.esShot ? 99 : Number(product?.stock_bar ?? 0);
        const ml = option.value === 'shot_anfitriona' ? mlAnfitriona : mlCliente;
        const label = `${option.nombre}${option.esShot ? ` · ${ml} ml` : ''}`;
        return (
          <View key={option.value} style={[styles.row, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.info}>
              <Text style={[styles.name, { color: textPrimary }]} numberOfLines={1}>{label}</Text>
              <Text style={[styles.meta, { color: textSecondary }]}>
                ${option.precio.toLocaleString()} · comisión ${option.comision.toLocaleString()}
              </Text>
            </View>
            <View style={styles.controls}>
              <Pressable
                onPress={() => setQuantities(current => ({ ...current, [option.value]: Math.max(0, cantidad - 1) }))}
                disabled={cantidad === 0}
                accessibilityRole="button"
                accessibilityLabel={`${label}: disminuir cantidad`}
                style={[styles.step, { borderColor, opacity: cantidad === 0 ? 0.4 : 1 }]}
              >
                <Ionicons name="remove" size={15} color={textPrimary} />
              </Pressable>
              <Text style={[styles.count, { color: textPrimary }]}>{cantidad}</Text>
              <Pressable
                onPress={() => setQuantities(current => ({ ...current, [option.value]: Math.min(max, cantidad + 1) }))}
                disabled={max < 1 || cantidad >= max}
                accessibilityRole="button"
                accessibilityLabel={`${label}: aumentar cantidad`}
                style={[styles.step, { borderColor, opacity: max < 1 || cantidad >= max ? 0.4 : 1 }]}
              >
                <Ionicons name="add" size={15} color={textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  onAdd(option.value, cantidad);
                  setQuantities(current => ({ ...current, [option.value]: 0 }));
                }}
                disabled={cantidad === 0}
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${label}`}
                style={[styles.add, { backgroundColor: accentColor, opacity: cantidad === 0 ? 0.4 : 1 }]}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 8, gap: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 14, padding: 8 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 11, fontWeight: '900' },
  meta: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  step: { width: 28, height: 28, borderRadius: 9999, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  count: { minWidth: 18, textAlign: 'center', fontSize: 12, fontWeight: '900' },
  add: { width: 30, height: 30, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
});
