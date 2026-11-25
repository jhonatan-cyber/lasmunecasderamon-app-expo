import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { FontSize } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';

export interface DetailRowItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number | React.ReactNode;
}

export interface CardDetailsListProps {
  items: DetailRowItem[];
  textColor: string;
  textMutedColor: string;
  /** Permite ajustar gap/márgenes sin crear otra lista de detalles. */
  style?: StyleProp<ViewStyle>;
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
  style,
}) => (
  <View style={[styles.list, style]}>
    {items.map((item, index) => {
      const isPrimitive =
        typeof item.value === 'string' || typeof item.value === 'number';
      return (
        <View key={`${item.label}-${index}`} style={styles.row}>
          <Ionicons name={item.icon} size={14} color={textMutedColor} style={styles.icon} />
          {isPrimitive ? (
            <Text style={[styles.text, { color: textColor }]}>
              <Text style={styles.bold}>{item.label}</Text>
              {' '}{item.value}
            </Text>
          ) : (
            <View style={styles.valueSlot}>{item.value}</View>
          )}
        </View>
      );
    })}
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
  icon: {
    width: 16,
    textAlign: 'center',
  },
  valueSlot: {
    flex: 1,
    minWidth: 0,
  },
  text: {
    fontSize: FontSize.xs,
    flex: 1,
  },
  bold: {
    fontFamily: FontFamily.extrabold,
  },
});
