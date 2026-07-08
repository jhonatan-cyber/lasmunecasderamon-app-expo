import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

type SolicitudesSkeletonProps = {
  bg: string;
  cardBg: string;
  borderColor: string;
  gradientColors: string[];
  insets: { top: number };
  isTablet: boolean;
};

export function SolicitudesSkeleton({
  bg,
  cardBg,
  borderColor,
  gradientColors,
  insets,
  isTablet,
}: SolicitudesSkeletonProps) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient
        colors={gradientColors as unknown as readonly [string, string, ...string[]]}
        style={{
          paddingTop: insets.top + (isTablet ? 20 : 10),
          height: 160,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <Skeleton width={150} height={30} />
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
        <Skeleton width="60%" height={24} />
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{
            flex: 1,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            marginBottom: 16,
            backgroundColor: cardBg,
            borderColor,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <Skeleton width={120} height={20} />
              <Skeleton width={80} height={20} borderRadius={10} />
            </View>
            <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 15 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Skeleton style={{ flex: 1 }} height={44} borderRadius={12} />
              <Skeleton style={{ flex: 1 }} height={44} borderRadius={12} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
