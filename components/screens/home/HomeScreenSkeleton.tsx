import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
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
          style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
        />
        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <SkeletonLoader
            width={60}
            height={60}
            borderRadius={30}
            style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
          />
          <View style={{ gap: 8 }}>
            <SkeletonLoader
              width={120}
              height={20}
              style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
            />
            <SkeletonLoader
              width={80}
              height={15}
              style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
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
      </View>
    </View>
  );
}
