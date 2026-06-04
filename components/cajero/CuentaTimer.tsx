import React from "react";
import { Text } from "react-native";
import { Timer } from "@/context/TimerContext";
import { calculateRemainingTime } from "@/utils/timeUtils";

type CuentaTimerProps = {
  timer: Timer;
  serverOffset: number;
  accentColor: string;
};

export const CuentaTimer = React.memo(({ timer, serverOffset, accentColor }: CuentaTimerProps) => {
  const [remaining, setRemaining] = React.useState(() =>
    calculateRemainingTime(timer, serverOffset),
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calculateRemainingTime(timer, serverOffset));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, serverOffset]);

  const isOverdue = remaining <= 0;
  const m = Math.floor(Math.abs(remaining) / 60);
  const s = Math.abs(remaining) % 60;
  const formatted = `${remaining < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;

  return (
    <Text
      style={{
        fontWeight: "900",
        color: isOverdue ? "#EF4444" : accentColor,
        fontSize: 24,
      }}
    >
      {isOverdue ? "AGOTADO" : formatted}
    </Text>
  );
});

CuentaTimer.displayName = "CuentaTimer";
