import React from "react";
import { ScrollView, View } from "react-native";
import { BorderRadius } from '@/constants/spacing';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAccentColor } from '@/hooks/useAccentColor';

type AdministrativoSkeletonProps = {
  bg: string;
  isDark: boolean;
};

export function AdministrativoSkeleton({ bg, isDark }: AdministrativoSkeletonProps) {
  const { surfaceMuted, borderColor, bg: themeBg } = useAccentColor();
  return (
    <View style={{ flex: 1, backgroundColor: themeBg }}>
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
              borderRadius: BorderRadius.card,
              borderWidth: 1,
              padding: 16,
              backgroundColor: surfaceMuted,
              borderColor,
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
              <Skeleton width={56} height={56} borderRadius={16} />
              <View style={{ gap: 8, flex: 1 }}>
                <Skeleton width="60%" height={14} borderRadius={6} />
                <Skeleton width="40%" height={28} borderRadius={8} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
