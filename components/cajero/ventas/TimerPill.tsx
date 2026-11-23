import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FontFamily, TabularNumbers } from "@/constants/fonts";
import { calculateRemainingTime } from "@/utils/timeUtils";
import type { Timer } from "@/context/types";
import { useAccentColor } from '@/hooks/useAccentColor';

type TimerPillProps = {
  timer: Timer;
  serverOffset: number;
  accentColor: string;
  textSecondary: string;
  textPrimary: string;
};

export function TimerPill({
  timer,
  serverOffset,
  accentColor,
  textSecondary,
  textPrimary,
}: TimerPillProps) {
  const { accentColor: urgentColor, accentBg: urgentBg, accentBorder: urgentBorder } = useAccentColor();
  // El instante entra como argumento del cálculo: React Compiler cachea las
  // llamadas por sus argumentos, así que sin esto el reloj no avanza.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.isPaused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.isPaused]);

  const remaining = calculateRemainingTime(timer, serverOffset, now);

  const fmt = (secs: number) => {
    const absSecs = isNaN(secs) ? 0 : Math.max(0, Math.floor(Math.abs(secs)));
    const m = Math.floor(absSecs / 60);
    const s = absSecs % 60;
    return `${secs < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View
      style={[
        styles.timerPill,
        {
          backgroundColor: remaining < 60 ? urgentBg : `${accentColor}20`,
          borderColor: remaining < 60 ? urgentBorder : `${accentColor}40`,
        },
      ]}
    >
      <Ionicons
        name="time"
        size={16}
        color={remaining < 60 ? urgentColor : accentColor}
      />
      <View>
        <Text style={[styles.timerLabel, { color: textSecondary }]}>
          RESTANTE
        </Text>
        <Text
          style={[
            styles.timerValue,
            { color: remaining < 60 ? urgentColor : textPrimary },
          ]}
        >
          {fmt(remaining)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: BorderRadius.full,
    marginTop: 10,
    borderWidth: 1,
  },
  timerLabel: {
    fontSize: 8,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    ...TabularNumbers,
  },
});
