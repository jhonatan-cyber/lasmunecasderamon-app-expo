import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";
import { SkeletonBox } from "./SkeletonBox";

interface ProfileHeaderProps {
  skeletonMode?: boolean;
  roleLabel?: string;
  isTablet: boolean;
  isDark: boolean;
  gradientColors: string[];
  topInset: number;
  onBack: () => void;
}

export function ProfileHeader({
  skeletonMode = false,
  roleLabel,
  isTablet,
  isDark,
  gradientColors,
  topInset,
  onBack,
}: ProfileHeaderProps) {
  return (
    <LinearGradient
      colors={gradientColors as unknown as readonly [string, string, ...string[]]}
      style={[
        styles.header,
        {
          paddingTop: topInset + (isTablet ? 20 : 10),
          paddingBottom: 25,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        },
      ]}
    >
      <View style={styles.headerTop}>
        <View style={{ flex: 1, gap: skeletonMode ? 8 : 2 }}>
          {skeletonMode ? (
            <>
              <SkeletonBox
                width={140}
                height={20}
                borderRadius={8}
                style={{
                  backgroundColor: isDark
                    ? "rgba(17, 24, 39, 0.15)"
                    : "rgba(255, 255, 255, 0.25)",
                }}
              />
              <SkeletonBox
                width={90}
                height={13}
                borderRadius={6}
                style={{
                  backgroundColor: isDark
                    ? "rgba(17, 24, 39, 0.1)"
                    : "rgba(255, 255, 255, 0.18)",
                }}
              />
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? "#111827" : "#FFFFFF" },
                  isTablet && { fontSize: 28 },
                ]}
              >
                Mi Perfil
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  {
                    color: isDark
                      ? "rgba(0,0,0,0.6)"
                      : "rgba(255,255,255,0.8)",
                  },
                  isTablet && { fontSize: 17 },
                ]}
              >
                {roleLabel || "Cuenta personal"}
              </Text>
            </>
          )}
        </View>
        {!skeletonMode && (
          <Pressable onPress={onBack} style={styles.backBtnRight}>
            <Ionicons
              name="arrow-back"
              size={isTablet ? 26 : 22}
              color="#FFFFFF"
            />
            <Text style={styles.backTextHeader}>Atrás</Text>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}
