import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontSize } from '@/constants/spacing';

export interface CardHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  date?: string;
  statusColor: string;
  statusText: string;
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
  accentColor,
  textColor,
  textMutedColor,
  formatDateTime,
}) => (
  <View style={styles.cardHeader}>
    <View style={styles.headerInfo}>
      <View style={[styles.iconBox, { backgroundColor: `${accentColor}15` }]}>
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
    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}10` }]}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
    </View>
  </View>
);

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
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 16,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSize.xxs,
    fontWeight: '900',
  },
});
