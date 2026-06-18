import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

type CuentasSkeletonProps = {
  bg: string;
  cardBg: string;
  borderColor: string;
  gradientColors: string[];
  insets: { top: number };
  isTablet: boolean;
};

export function CuentasSkeleton({
  bg,
  cardBg,
  borderColor,
  gradientColors,
  insets,
  isTablet,
}: CuentasSkeletonProps) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient
        colors={gradientColors as any}
        style={{
          paddingTop: insets.top + (isTablet ? 20 : 10),
          paddingBottom: 25,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <Skeleton width={150} height={30} />
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
        <Skeleton width="60%" height={24} />
      </LinearGradient>
      <View style={{ padding: isTablet ? 12 : 16 }}>
        <Skeleton height={120} borderRadius={24} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
          <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                width: isTablet ? "48.5%" : "100%",
                padding: 16,
                borderRadius: 20,
                marginBottom: 14,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <Skeleton width={100} height={20} />
                <Skeleton width={80} height={20} borderRadius={10} />
              </View>
              <Skeleton width="100%" height={60} borderRadius={12} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
