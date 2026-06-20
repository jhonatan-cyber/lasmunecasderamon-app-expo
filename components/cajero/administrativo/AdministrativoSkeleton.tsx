import React, { useEffect, useState } from "react";
import { Animated, Easing, ScrollView, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PremiumHeader } from "@/components/ui/PremiumHeader";

const SkeletonBox = ({
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
  const [anim] = useState(() => new Animated.Value(0.3));
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 750,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 750,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#111111",
          opacity: anim,
        },
        style,
      ]}
    />
  );
};

type AdministrativoSkeletonProps = {
  bg: string;
  isDark: boolean;
};

export function AdministrativoSkeleton({ bg, isDark }: AdministrativoSkeletonProps) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? "light" : "dark"} />

      <PremiumHeader
        title="Resumen Personal"
        subtitle="Actividad y eventos"
      />

      <ScrollView style={{ flex: 1 }} scrollEnabled={false}>
        <View style={{ padding: 20, gap: 20 }}>
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              padding: 16,
              backgroundColor: isDark ? "#111111" : "#FFF",
              borderColor: isDark ? "#374151" : "#E2E8F0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <SkeletonBox width={56} height={56} borderRadius={16} />
              <View style={{ gap: 8, flex: 1 }}>
                <SkeletonBox width="60%" height={14} borderRadius={6} />
                <SkeletonBox width="40%" height={28} borderRadius={8} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
