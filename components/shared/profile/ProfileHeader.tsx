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
      <View pointerEvents="none" style={[styles.scrim, { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }]} />
      <View style={styles.headerTop}>
        <View style={{ flex: 1, alignItems: 'flex-start', gap: skeletonMode ? 8 : 2 }}>
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
                maxFontSizeMultiplier={1.4}
                style={[
                  styles.headerTitle,
                  { color: "#FFFFFF" },
                  isTablet && { fontSize: 28 },
                ]}
              >
                Mi Perfil
              </Text>
              <Text
                maxFontSizeMultiplier={1.4}
                style={[
                  styles.headerSubtitle,
                  { color: "rgba(255,255,255,0.92)" },
                  isTablet && { fontSize: 17 },
                ]}
              >
                {roleLabel || "Cuenta personal"}
              </Text>
            </>
          )}
        </View>
        {!skeletonMode && (
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver atrás"
          >
            <Ionicons
              name="arrow-back"
              size={isTablet ? 24 : 20}
              color="#FFFFFF"
            />
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}
