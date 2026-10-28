import { ScrollView, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";
import { ProfileHeader } from "./ProfileHeader";
import { SkeletonBox } from "./SkeletonBox";

interface ProfileLoadingStateProps {
  bg: string;
  isDark: boolean;
  roleLabel?: string;
  isTablet: boolean;
  gradientColors: string[];
  topInset: number;
  onBack: () => void;
}

export function ProfileLoadingState({
  bg,
  isDark,
  roleLabel,
  isTablet,
  gradientColors,
  topInset,
  onBack,
}: ProfileLoadingStateProps) {
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ProfileHeader
        skeletonMode
        roleLabel={roleLabel}
        isTablet={isTablet}
        isDark={isDark}
        gradientColors={gradientColors}
        topInset={topInset}
        onBack={onBack}
      />
      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={false}
        contentContainerStyle={{ padding: 24 }}
      >
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
        <SkeletonBox
          width="100%"
          height={1}
          borderRadius={1}
          style={{ marginVertical: 24 }}
        />
        <View style={{ marginBottom: 20, gap: 8 }}>
          <SkeletonBox width={180} height={13} borderRadius={6} />
          <SkeletonBox width="100%" height={56} borderRadius={18} />
        </View>
        <SkeletonBox
          width="100%"
          height={60}
          borderRadius={20}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </View>
  );
}
