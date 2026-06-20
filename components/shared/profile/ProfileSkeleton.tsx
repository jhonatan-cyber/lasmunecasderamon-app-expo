import { ScrollView, View } from "react-native";
import { SkeletonBox } from "./ProfileSkeletonBox";
import { ProfileHeader } from "./ProfileHeader";

interface Props {
  gradientColors: string[];
  insetsTop: number;
  isTablet: boolean;
  isDark: boolean;
  bg: string;
}

export function ProfileSkeleton({ gradientColors, insetsTop, isTablet, isDark, bg }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ProfileHeader gradientColors={gradientColors} insetsTop={insetsTop} isTablet={isTablet} isDark={isDark} skeletonMode />
      <ScrollView style={{ flex: 1 }} scrollEnabled={false} contentContainerStyle={{ padding: 24 }}>
        <View style={{ alignItems: "center", paddingVertical: 32, gap: 14 }}>
          <SkeletonBox width={140} height={140} borderRadius={70} />
          <SkeletonBox width={160} height={22} borderRadius={8} />
          <SkeletonBox width={80} height={28} borderRadius={20} />
        </View>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ marginBottom: 20, gap: 8 }}>
            <SkeletonBox width={120} height={13} borderRadius={6} />
            <SkeletonBox width="100%" height={56} borderRadius={18} />
          </View>
        ))}
        <SkeletonBox width="100%" height={1} borderRadius={1} style={{ marginVertical: 24 }} />
        <View style={{ marginBottom: 20, gap: 8 }}>
          <SkeletonBox width={180} height={13} borderRadius={6} />
          <SkeletonBox width="100%" height={56} borderRadius={18} />
        </View>
        <SkeletonBox width="100%" height={60} borderRadius={20} style={{ marginTop: 10 }} />
      </ScrollView>
    </View>
  );
}
