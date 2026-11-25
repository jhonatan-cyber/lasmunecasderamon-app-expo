import React from "react";
import { calculateRemainingTime } from "@/utils/timeUtils";
import type { Timer } from "@/context/types";
import { useAccentColor } from '@/hooks/useAccentColor';
import { useServerNowTick } from '@/hooks/useServerNowTick';
import { TimerDisplay } from '@/components/ui/TimerDisplay';

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
  const {
    accentColor: urgentColor,
    accentBg: urgentBg,
    accentBorder: urgentBorder,
  } = useAccentColor();
  const now = useServerNowTick(!timer.isPaused);
  const remaining = calculateRemainingTime(timer, serverOffset, now);

  return (
    <TimerDisplay
      seconds={remaining}
      label="RESTANTE"
      icon="time"
      accent={accentColor}
      background={`${accentColor}20`}
      borderColor={`${accentColor}40`}
      textColor={textPrimary}
      mutedColor={textSecondary}
      urgent={remaining < 60}
      urgentAccent={urgentColor}
      urgentBackground={urgentBg}
      urgentBorder={urgentBorder}
      accessibilityLabel="Tiempo restante del servicio"
    />
  );
}
