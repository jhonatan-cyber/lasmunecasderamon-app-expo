import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { Colors } from '@/constants/theme';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';
import { formatCurrency } from '@/utils/format';
import type { Venta } from './types';

type VentasStatsProps = {
  ventas: Venta[];
};

type StatItem = {
  key: string;
  label: string;
  value: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

/**
 * Resumen del listado de ventas por estado, equivalente a las tarjetas del
 * dashboard. Los importes se calculan sobre las ventas visibles (la caja
 * abierta o el turno completo), no sobre el resultado de la búsqueda.
 */
export function VentasStats({ ventas }: VentasStatsProps) {
  const { cardBg, borderColor, textPrimary, textSecondary, isDark } =
    useAccentColor();
  const { isTablet } = useResponsiveMetrics();
  const C = Colors[isDark ? 'dark' : 'light'];

  const stats = useMemo(() => {
    const sumBy = (estado: number) =>
      ventas
        .filter((venta) => Number(venta.estado) === estado)
        .reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const countBy = (estado: number) =>
      ventas.filter((venta) => Number(venta.estado) === estado).length;

    return {
      completadas: { count: countBy(1), total: sumBy(1) },
      proceso: { count: countBy(2), total: sumBy(2) },
      anulacion: { count: countBy(3), total: sumBy(3) },
      anuladas: { count: countBy(0), total: sumBy(0) },
    };
  }, [ventas]);

  const items: StatItem[] = [
    {
      key: 'completadas',
      label: 'Total completado',
      value: formatCurrency(stats.completadas.total),
      detail: `${stats.completadas.count} ${stats.completadas.count === 1 ? 'venta' : 'ventas'}`,
      icon: 'trending-up',
      color: C.success,
    },
    {
      key: 'proceso',
      label: 'Sin cerrar',
      value: formatCurrency(stats.proceso.total),
      detail: `${stats.proceso.count} ${stats.proceso.count === 1 ? 'cuenta abierta' : 'cuentas abiertas'}`,
      icon: 'time-outline',
      color: C.info,
    },
    {
      key: 'anulacion',
      label: 'Por anular',
      value: String(stats.anulacion.count),
      detail: `Total: ${formatCurrency(stats.anulacion.total)}`,
      icon: 'alert-circle-outline',
      color: C.warning,
    },
    {
      key: 'anuladas',
      label: 'Total cancelado',
      value: formatCurrency(stats.anuladas.total),
      detail: `${stats.anuladas.count} ${stats.anuladas.count === 1 ? 'venta' : 'ventas'}`,
      icon: 'close-circle-outline',
      color: C.error,
    },
  ];

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
          <Text style={[styles.detail, { color: textSecondary }]} numberOfLines={1}>
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
  detail: {
    fontSize: 10,
    fontFamily: FontFamily.semibold,
  },
});
