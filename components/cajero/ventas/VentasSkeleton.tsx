import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";



export function DetailSkeleton({ borderColor }: { borderColor: string }) {
  return (
    <View style={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }}>
        <View>
          <Skeleton width={180} height={28} style={{ marginBottom: 10 }} />
          <Skeleton width={120} height={18} />
        </View>
        <Skeleton width={44} height={44} borderRadius={22} />
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        <Skeleton style={{ flex: 1 }} height={65} borderRadius={18} />
        <Skeleton style={{ flex: 1 }} height={65} borderRadius={18} />
      </View>

      <Skeleton width={140} height={20} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 25 }}>
        <Skeleton width={90} height={32} borderRadius={16} />
        <Skeleton width={90} height={32} borderRadius={16} />
      </View>

      <Skeleton width="100%" height={180} borderRadius={24} style={{ marginBottom: 25 }} />

      <View style={{ gap: 15 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={100} height={18} />
          <Skeleton width={80} height={18} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={120} height={26} />
          <Skeleton width={140} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}



type VentasCardSkeletonProps = {
  isTablet: boolean;
  cardBg: string;
  borderColor: string;
};

export function VentaCardSkeleton({ isTablet, cardBg, borderColor }: VentasCardSkeletonProps) {
  return (
    <View
      style={{
        width: isTablet ? '48.5%' : '100%',
        padding: 16,
        borderRadius: 24,
        marginBottom: 14,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        <Skeleton width={120} height={20} />
        <Skeleton width={80} height={20} borderRadius={12} />
      </View>
      <View style={{ gap: 8, marginBottom: 15 }}>
        <Skeleton width='90%' height={14} />
        <Skeleton width='70%' height={14} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ gap: 4 }}>
          <Skeleton width={60} height={12} />
          <Skeleton width={100} height={24} />
        </View>
        <Skeleton width={100} height={40} borderRadius={12} />
      </View>
    </View>
  );
}



type VentasSkeletonProps = {
  bg: string;
  cardBg: string;
  borderColor: string;
  gradientColors: string[];
  insets: { top: number };
  isTablet: boolean;
};

export function VentasSkeleton({ bg, cardBg, borderColor, gradientColors, insets, isTablet }: VentasSkeletonProps) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient
        colors={gradientColors as unknown as readonly [string, string, ...string[]]}
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
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <Skeleton width={150} height={30} />
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
        <Skeleton width='60%' height={24} />
      </LinearGradient>
      <View style={{ padding: isTablet ? 12 : 16 }}>
        <Skeleton height={isTablet ? 180 : 140} borderRadius={24} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
          <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                width: isTablet ? '48.5%' : '100%',
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
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <Skeleton width={100} height={20} />
                <Skeleton width={80} height={20} borderRadius={10} />
              </View>
              <Skeleton width='100%' height={60} borderRadius={12} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
