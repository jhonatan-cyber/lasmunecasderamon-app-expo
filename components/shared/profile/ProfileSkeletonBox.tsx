import React, { useState, useEffect } from "react";
import { Animated, Easing } from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";

export const SkeletonBox = ({
  width,
  height,
  borderRadius = 10,
  style = {},
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) => {
  const { accentColor, isDark } = useAccentColor();
  const [anim] = useState(() => new Animated.Value(0.3));
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 750, easing: Easing.ease, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: isDark ? `${accentColor}25` : `${accentColor}15`, opacity: anim }, style]}
    />
  );
};
