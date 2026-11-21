import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { useAccentColor } from '@/hooks/useAccentColor';

export interface CardHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  date?: string;
  statusColor: string;
  statusText: string;
  /** Fondo/Texto de la píldora; por defecto deriva de `statusColor`. */
  statusBgColor?: string;
  statusTextColor?: string;
  accentColor: string;
  textColor: string;
  textMutedColor: string;
  formatDateTime?: (dateStr?: string) => string;
}

/**
 * Reusable card header with icon, title, subtitle, date, and status badge.
 * Unifies CuentaCardHeader and ServiceCardHeader which share the same layout.
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  icon,
  title,
  subtitle,
  date,
  statusColor,
  statusText,
  statusBgColor,
  statusTextColor,
  accentColor,
  textColor,
  textMutedColor,
  formatDateTime,
}) => {
  const { isDark } = useAccentColor();

  // Glow neón en iconBox en modo oscuro
  const iconBoxNeon = isDark ? {
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  } : {};

  // Glow neón en statusBadge en modo oscuro
  const statusBadgeNeon = isDark ? {
    shadowColor: statusColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  } : {};

  return (
    <View style={styles.cardHeader}>
      <View style={styles.headerInfo}>
        <View style={[styles.iconBox, { backgroundColor: `${accentColor}15` }, iconBoxNeon]}>
          <Ionicons name={icon} size={18} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: textMutedColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
          {date && formatDateTime && (
            <Text style={[styles.date, { color: textMutedColor }]}>
              {formatDateTime(date)}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusBgColor ?? `${statusColor}10` }, statusBadgeNeon]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusTextColor ?? statusColor }]}>{statusText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  date: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
    overflow: 'hidden',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.xxs,
    fontWeight: '900',
  },
});
