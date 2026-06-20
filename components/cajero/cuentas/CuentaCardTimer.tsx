import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CuentaTimer } from "@/components/cajero/CuentaTimer";

interface CuentaCardTimerProps {
  timer: any;
  serverOffset: number;
  activeTime: number;
  isOverdue: boolean;
  accentColor: string;
  dangerColor: string;
  textSecondary: string;
}

export const CuentaCardTimer: React.FC<CuentaCardTimerProps> = ({
  timer,
  serverOffset,
  activeTime,
  isOverdue,
  accentColor,
  dangerColor,
  textSecondary,
}) => (
  <View
    style={[
      styles.timerRow,
      {
        backgroundColor: isOverdue
          ? `${dangerColor}15`
          : `${accentColor}08`,
      },
    ]}
  >
    <Ionicons
      name="time"
      size={24}
      color={isOverdue ? dangerColor : accentColor}
    />
    <View style={{ marginLeft: 10 }}>
      <Text style={[styles.timerLabel, { color: textSecondary }]}>
        TIEMPO RESTANTE
      </Text>
      {timer ? (
        <CuentaTimer
          timer={timer}
          serverOffset={serverOffset}
          accentColor={accentColor}
        />
      ) : (
        <Text style={[styles.timerValueDefault, { color: textSecondary }]}>
          --:--
        </Text>
      )}
    </View>
    <View style={{ flex: 1 }} />
    <View style={{ alignItems: "flex-end" }}>
      <Text style={[styles.timerTotalLabel, { color: textSecondary }]}>
        TOTAL {activeTime} MIN
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  timerValueDefault: {
    fontSize: 24,
    fontWeight: "900",
  },
  timerTotalLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
