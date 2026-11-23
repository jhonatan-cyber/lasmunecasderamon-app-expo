import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { Colors } from '@/constants/theme';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';
import { formatCurrency } from '@/utils/format';
import type { Pedido } from '@/hooks/useMisPedidos';

type PedidosResumenProps = {
  pedidos: Pedido[];
};

type ResumenItem = {
  key: string;
  label: string;
  value: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

/** Resumen de pedidos del garzón, con los mismos indicadores del dashboard. */
export function PedidosResumen({ pedidos }: PedidosResumenProps) {
  const { cardBg, borderColor, textPrimary, textSecondary, isDark } =
    useAccentColor();
  const { isTablet } = useResponsiveMetrics();
  const C = Colors[isDark ? 'dark' : 'light'];

  const items = useMemo<ResumenItem[]>(() => {
    const totalGanado = pedidos.reduce(
      (sum, pedido) => sum + Number(pedido.total || 0),
      0,
    );
    const pendientes = pedidos.filter((p) => Number(p.estado) === 1).length;
    const aprobados = pedidos.filter((p) => Number(p.estado) === 0).length;
    const rechazados = pedidos.filter((p) => Number(p.estado) === 2).length;

    return [
      {
        key: 'total',
        label: 'Total ganado',
        value: formatCurrency(totalGanado),
        detail: `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'}`,
        icon: 'cash-outline',
        color: C.success,
      },
      {
        key: 'pendientes',
        label: 'Por aprobar',
        value: String(pendientes),
        detail: 'En espera',
        icon: 'time-outline',
        color: C.info,
      },
      {
        key: 'aprobados',
        label: 'Completados',
        value: String(aprobados),
        detail: 'Exitosos',
        icon: 'checkmark-circle-outline',
        color: C.success,
      },
      {
        key: 'rechazados',
        label: 'Rechazados',
        value: String(rechazados),
        detail: 'No procesados',
        icon: 'close-circle-outline',
        color: C.error,
      },
    ];
  }, [pedidos, C.error, C.info, C.success]);

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={item.key}
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: isDark ? `${item.color}55` : borderColor,
              flexBasis: isTablet ? '23%' : '47%',
            },
          ]}
          accessibilityLabel={`${item.label}: ${item.value}. ${item.detail}`}
        >
          <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
            <Ionicons name={item.icon} size={18} color={item.color} />
          </View>
          <Text style={[styles.label, { color: textSecondary }]}>
            {item.label}
          </Text>
          <Text style={[styles.value, { color: textPrimary }]} numberOfLines={1}>
            {item.value}
          </Text>
          <Text style={[styles.detail, { color: textSecondary }]}>
            {item.detail}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  card: {
    flexGrow: 1,
    minWidth: 0,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    padding: 12,
    gap: 3,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 18,
    fontFamily: FontFamily.black,
    letterSpacing: -0.4,
  },
  detail: { fontSize: 10, fontFamily: FontFamily.semibold },
});
