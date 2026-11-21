import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";
import { SkeletonBox } from "./SkeletonBox";
import { neonGlow, resolveAccentSurface } from "@/utils/color";
import { useAppearanceStore } from "@/store/appearanceStore";

interface ProfileHeaderProps {
  skeletonMode?: boolean;
  roleLabel?: string;
  isTablet: boolean;
  isDark: boolean;
  accentColor: string;
  textPrimary: string;
  topInset: number;
  onBack: () => void;
}

export function ProfileHeader({
  skeletonMode = false,
  roleLabel,
  isTablet,
  isDark,
  accentColor,
  topInset,
  onBack,
}: ProfileHeaderProps) {
  // El header se dibuja sobre el color plano del acento: el texto se mide
  // contra ese color (blanco en los acentos profundos, casi negro en los neón).
  const plan = resolveAccentSurface(accentColor);
  const finalHeaderText = plan.text;
  const { scheme, toggleScheme } = useAppearanceStore();
  const isHeaderLight = plan.isLightAccent;
  const subtitleColor = plan.muted;
  const controlBg = isHeaderLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.20)";
  const skeletonColor = isHeaderLight ? "rgba(17,24,39,0.12)" : "rgba(255,255,255,0.25)";
  const skeletonColorSoft = isHeaderLight ? "rgba(17,24,39,0.08)" : "rgba(255,255,255,0.18)";

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: accentColor,
          boxShadow: neonGlow(accentColor, isDark ? "strong" : "soft"),
          paddingTop: topInset + (isTablet ? 20 : 10),
          paddingBottom: 25,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        },
      ]}
    >
      <View style={styles.headerTop}>
        <View style={{ flex: 1, alignItems: 'flex-start', gap: skeletonMode ? 8 : 2 }}>
          {skeletonMode ? (
            <>
              <SkeletonBox
                width={140}
                height={20}
                borderRadius={8}
                style={{ backgroundColor: skeletonColor }}
              />
              <SkeletonBox
                width={90}
                height={13}
                borderRadius={6}
                style={{ backgroundColor: skeletonColorSoft }}
              />
            </>
          ) : (
            <>
              <Text
                maxFontSizeMultiplier={1.4}
                style={[
                  styles.headerTitle,
                  { color: finalHeaderText },
                  isTablet && { fontSize: 28 },
                ]}
              >
                Mi Perfil
              </Text>
              <Text
                maxFontSizeMultiplier={1.4}
                style={[
                  styles.headerSubtitle,
                  { color: subtitleColor },
                  isTablet && { fontSize: 17 },
                ]}
              >
                {roleLabel || "Cuenta personal"}
              </Text>
            </>
          )}
        </View>
        {!skeletonMode && (
          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleScheme}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              style={[styles.backBtn, { backgroundColor: controlBg }]}
              accessibilityRole="button"
              accessibilityLabel="Cambiar tema"
            >
              <Ionicons
                name={scheme === "dark" ? "sunny-outline" : "moon-outline"}
                size={isTablet ? 24 : 20}
                color={finalHeaderText}
              />
            </Pressable>
            <Pressable
              onPress={onBack}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              style={[styles.backBtn, { backgroundColor: controlBg }]}
              accessibilityRole="button"
              accessibilityLabel="Volver atrás"
            >
              <Ionicons
                name="arrow-back"
                size={isTablet ? 24 : 20}
                color={finalHeaderText}
              />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
