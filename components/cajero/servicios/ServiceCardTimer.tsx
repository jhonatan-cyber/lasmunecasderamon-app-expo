import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ServiceCardTimerProps {
  visible: boolean;
  isOverdue: boolean;
  isCritical: boolean;
  remaining: number;
  duration?: number;
  dangerColor: string;
  warningColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  textMutedColor: string;
  formatTime: (secs: number) => string;
}

export const ServiceCardTimer: React.FC<ServiceCardTimerProps> = ({
  visible,
  isOverdue,
  isCritical,
  remaining,
  duration,
  dangerColor,
  warningColor,
  accentColor,
  bgColor,
  textColor,
  textMutedColor,
  formatTime,
}) => {
  if (!visible) return null;

  return (
    <View style={[
      styles.timerHero,
      {
        backgroundColor: isOverdue ? dangerColor + "15" : isCritical ? warningColor + "15" : bgColor,
      },
    ]}>
      <Ionicons name="time" size={24} color={isOverdue ? dangerColor : isCritical ? warningColor : accentColor} />
      <View style={styles.timerValueContainer}>
        <Text style={[styles.timerLabel, { color: textMutedColor }]}>TIEMPO RESTANTE</Text>
        <Text style={[styles.timerValue, { color: isOverdue ? dangerColor : textColor }]}>
          {formatTime(remaining)}
        </Text>
      </View>
      <View style={styles.flexSpacer} />
      <View style={styles.durationContainer}>
        <Text style={[styles.timerTotalLabel, { color: textMutedColor }]}>TOTAL {duration} MIN</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerHero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  timerValueContainer: {
    marginLeft: 10,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  timerValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  flexSpacer: {
    flex: 1,
  },
  durationContainer: {
    alignItems: 'flex-end',
  },
  timerTotalLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
