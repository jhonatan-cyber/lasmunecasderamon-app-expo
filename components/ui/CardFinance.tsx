import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';
import { StatusBadge } from '@/components/ui/StatusBadge';

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
            <StatusBadge
              label={statusBadge.text}
              color={statusBadge.color}
              style={[styles.statusBadge, badgeNeon]}
            />
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
    fontFamily: FontFamily.extrabold,
  },
  totalLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  totalPrice: {
    fontSize: 20,
    fontFamily: FontFamily.black,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
    marginTop: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statusText: {
    fontSize: FontSize.xxs,
    fontFamily: FontFamily.black,
  },
});
