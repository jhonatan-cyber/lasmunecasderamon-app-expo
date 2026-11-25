import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { BorderRadius } from "@/constants/spacing";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { useAccentColor } from "@/hooks/useAccentColor";
import { styles } from "../HomeScreen.styles";

interface HomeScreenSkeletonProps {
  bg: string;
  gradientColors: string[];
  topInset: number;
}

export function HomeScreenSkeleton({
  bg,
  gradientColors,
  topInset,
}: HomeScreenSkeletonProps) {
  const { gradientControlBg } = useAccentColor();

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient
        colors={
          gradientColors as unknown as readonly [string, string, ...string[]]
        }
        style={[styles.header, { paddingTop: topInset + 10, paddingBottom: 25 }]}
      >
        <SkeletonLoader
          width={40}
          height={40}
          borderRadius={20}
          accessibilityRole="button"
          accessibilityLabel="Icono de control"
          style={{ backgroundColor: gradientControlBg }}
        />
        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <SkeletonLoader
            width={60}
            height={60}
            borderRadius={30}
            accessibilityRole="button"
            accessibilityLabel="Tarjeta principal"
            style={{ backgroundColor: gradientControlBg }}
          />
          <View style={{ gap: 8 }}>
            <SkeletonLoader
              width={120}
              height={20}
              accessibilityRole="text"
              accessibilityLabel="Título principal"
              style={{ backgroundColor: gradientControlBg }}
            />
            <SkeletonLoader
              width={80}
              height={15}
              accessibilityRole="text"
              accessibilityLabel="Subtítulo"
              style={{ backgroundColor: gradientControlBg }}
            />
          </View>
        </View>
      </LinearGradient>
      <View style={{ padding: 20, gap: 15 }}>
        {/* Analytics section skeleton */}
        <SkeletonLoader width="100%" height={150} borderRadius={BorderRadius.card} accessibilityRole="progressbar" accessibilityLabel="Estadísticas" />
        <View style={{ flexDirection: "row", gap: 15 }}>
          <SkeletonLoader width="48%" height={100} borderRadius={BorderRadius.card} accessibilityRole="button" accessibilityLabel="Módulo" />
          <SkeletonLoader width="48%" height={100} borderRadius={BorderRadius.card} accessibilityRole="button" accessibilityLabel="Módulo" />
        </View>
        {/* Módulos: replica el cuadro del dashboard (chip + título + descripción). */}
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: "row", gap: 12 }}>
            {[0, 1].map((col) => (
              <View
                key={col}
                style={{
                  flex: 1,
                  borderRadius: BorderRadius.card,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  padding: 14,
                  gap: 10,
                  overflow: 'hidden',
                }}
              >
                <SkeletonLoader width={46} height={46} borderRadius={14} accessibilityRole="image" accessibilityLabel="Icono de módulo" />
                <SkeletonLoader width="72%" height={14} borderRadius={7} accessibilityRole="text" accessibilityLabel="Título del módulo" />
                <SkeletonLoader width="48%" height={12} borderRadius={6} accessibilityRole="text" accessibilityLabel="Descripción" />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
