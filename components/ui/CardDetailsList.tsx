import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontSize } from '@/constants/spacing';

export interface DetailRowItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number | React.ReactNode;
}

export interface CardDetailsListProps {
  items: DetailRowItem[];
  textColor: string;
  textMutedColor: string;
}

/**
 * Reusable details list with icon + label + value rows.
 * Unifies ServiceCardDetails, CuentaCardDetails, and VentaCardDetails
 * which all share the same pattern of icon + bold label + value.
 */
export const CardDetailsList: React.FC<CardDetailsListProps> = ({
  items,
  textColor,
  textMutedColor,
}) => (
  <View style={styles.list}>
    {items.map((item, index) => (
      <View key={`${item.label}-${index}`} style={styles.row}>
        <Ionicons name={item.icon} size={14} color={textMutedColor} />
        <Text style={[styles.text, { color: textColor }]}>
          {typeof item.value === 'string' || typeof item.value === 'number' ? (
            <>
              <Text style={styles.bold}>{item.label}</Text>
              {' '}{item.value}
            </>
          ) : (
            item.value
          )}
        </Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: {
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: FontSize.xs,
    flex: 1,
  },
  bold: {
    fontWeight: '800',
  },
});
