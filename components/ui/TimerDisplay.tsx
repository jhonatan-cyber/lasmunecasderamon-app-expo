import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily, TabularNumbers } from '@/constants/fonts';
import { formatRemainingSeconds } from '@/hooks/useServerNowTick';

export interface TimerDisplayProps {
  seconds: number;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent: string;
  background: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  urgent?: boolean;
  urgentAccent?: string;
  urgentBackground?: string;
  urgentBorder?: string;
  accessibilityLabel?: string;
}

/** Píldora de tiempo restante reutilizable en ventas y servicios. */
export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  seconds,
  label = 'RESTANTE',
  icon = 'time',
  accent,
  background,
  borderColor,
  textColor,
  mutedColor,
  urgent = false,
  urgentAccent = accent,
  urgentBackground = background,
  urgentBorder = borderColor,
  accessibilityLabel,
}) => (
  <View
    style={[
      styles.pill,
      {
        backgroundColor: urgent ? urgentBackground : background,
        borderColor: urgent ? urgentBorder : borderColor,
      },
    ]}
    accessibilityLabel={accessibilityLabel ?? `${label} ${formatRemainingSeconds(seconds)}`}
  >
    <Ionicons
      name={icon}
      size={16}
      color={urgent ? urgentAccent : accent}
    />
    <View>
      <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
      <Text style={[styles.value, { color: urgent ? urgentAccent : textColor }]}>
        {formatRemainingSeconds(seconds)}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: BorderRadius.full,
    marginTop: 10,
    borderWidth: 1,
  },
  label: {
    fontSize: 8,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    ...TabularNumbers,
  },
});
