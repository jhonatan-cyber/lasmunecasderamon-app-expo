import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { useAccentColor } from '@/hooks/useAccentColor';

export interface CardFinanceProps {
  total: number;
  pillText: string;
  label?: string;
  statusBadge?: {
    text: string;
    color: string;
  };
  textColor: string;
  textMutedColor: string;
  children?: React.ReactNode;
}

/**
 * Reusable finance section with payment pill, total label, and price.
 * Unifies ServiceCardFinance and CuentaCardFinance which share the same layout.
 */
export const CardFinance: React.FC<CardFinanceProps> = ({
  total,
  pillText,
  label = 'TOTAL',
  statusBadge,
  textColor,
  textMutedColor,
  children,
}) => {
  const { isDark } = useAccentColor();

  // Glow neón en statusBadge en modo oscuro
  const badgeNeon = statusBadge && isDark ? {
    shadowColor: statusBadge.color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  } : {};

  return (
    <>
      <View style={styles.financeBox}>
        <View style={[styles.pill, { borderRadius: BorderRadius.sm }]}>
          <Ionicons name="card-outline" size={12} color={textMutedColor} />
          <Text style={[styles.pillText, { color: textMutedColor }]}>{pillText}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.totalLabel, { color: textMutedColor }]}>{label}</Text>
          <Text style={[styles.totalPrice, { color: textColor }]}>
            ${total.toLocaleString()}
          </Text>
          {statusBadge && (
            <View style={[styles.statusBadge, { backgroundColor: `${statusBadge.color}15`, borderColor: statusBadge.color }, badgeNeon]}>
              <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.text}</Text>
            </View>
          )}
        </View>
      </View>
      {children}
    </>
  );
};

const styles = StyleSheet.create({
  financeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  pillText: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
  },
  totalLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
    marginTop: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statusText: {
    fontSize: FontSize.xxs,
    fontWeight: '900',
  },
});
