import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
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
          style={{ backgroundColor: gradientControlBg }}
        />
        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <SkeletonLoader
            width={60}
            height={60}
            borderRadius={30}
            style={{ backgroundColor: gradientControlBg }}
          />
          <View style={{ gap: 8 }}>
            <SkeletonLoader
              width={120}
              height={20}
              style={{ backgroundColor: gradientControlBg }}
            />
            <SkeletonLoader
              width={80}
              height={15}
              style={{ backgroundColor: gradientControlBg }}
            />
          </View>
        </View>
      </LinearGradient>
      <View style={{ padding: 20, gap: 15 }}>
        <SkeletonLoader width="100%" height={150} borderRadius={24} />
        <View style={{ flexDirection: "row", gap: 15 }}>
          <SkeletonLoader width="48%" height={100} borderRadius={20} />
          <SkeletonLoader width="48%" height={100} borderRadius={20} />
        </View>
        {/* Módulos: replica el cuadro del dashboard (chip + título + descripción). */}
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: "row", gap: 12 }}>
            {[0, 1].map((col) => (
              <View
                key={col}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  padding: 14,
                  gap: 10,
                }}
              >
                <SkeletonLoader width={46} height={46} borderRadius={14} />
                <SkeletonLoader width="72%" height={14} borderRadius={7} />
                <SkeletonLoader width="48%" height={12} borderRadius={6} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
