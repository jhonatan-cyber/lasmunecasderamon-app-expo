import Ionicons from '@expo/vector-icons/Ionicons';
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FontSize } from "@/constants/spacing";

interface ServiceCardTimerProps {
  visible: boolean;
  etiqueta: string;
  valor: string;
  totalMinutos?: number;
  progreso: number;
  icono: keyof typeof Ionicons.glyphMap;
  acento: string;
  fondo: string;
  barraFondo: string;
  textMutedColor: string;
  accessibilityLabel: string;
}

export const ServiceCardTimer: React.FC<ServiceCardTimerProps> = ({
  visible,
  etiqueta,
  valor,
  totalMinutos,
  progreso,
  icono,
  acento,
  fondo,
  barraFondo,
  textMutedColor,
  accessibilityLabel,
}) => {
  if (!visible) return null;

  const avance = Number.isFinite(progreso) ? Math.min(1, Math.max(0, progreso)) : 0;
  const ancho = `${Math.round(avance * 100)}%` as `${number}%`;

  return (
    <View
      style={[styles.timerHero, { backgroundColor: fondo }]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.timerRow}>
        <Ionicons name={icono} size={22} color={acento} />
        <View style={styles.timerInfo}>
          <Text style={[styles.timerLabel, { color: textMutedColor }]}>{etiqueta}</Text>
          <Text style={[styles.timerValue, { color: acento }]}>{valor}</Text>
        </View>
        <Text style={[styles.timerTotal, { color: textMutedColor }]}>
          de {totalMinutos ?? 0} min
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: barraFondo }]}>
        <View style={[styles.fill, { width: ancho, backgroundColor: acento }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerHero: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    gap: 10,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timerInfo: {
    flex: 1,
  },
  timerLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  timerValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  timerTotal: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
