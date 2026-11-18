import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";
import { SkeletonBox } from "./SkeletonBox";
import { accentTextColor } from "@/utils/color";
import { useAppearanceStore } from "@/store/appearanceStore";

interface ProfileHeaderProps {
  skeletonMode?: boolean;
  roleLabel?: string;
  isTablet: boolean;
  isDark: boolean;
  gradientColors: string[];
  accentColor: string;
  textPrimary: string;
  topInset: number;
  onBack: () => void;
}

export function ProfileHeader({
  skeletonMode = false,
  roleLabel,
  isTablet,
  gradientColors,
  topInset,
  onBack,
}: ProfileHeaderProps) {
  // El header se dibuja sobre el degradado del acento: blanco en toda la paleta
  // salvo Negro y Pizarra, que calculan su color por contraste.
  const finalHeaderText = accentTextColor(gradientColors[0] ?? '#FFFFFF');
  const { scheme, toggleScheme } = useAppearanceStore();
  const isHeaderLight = finalHeaderText !== "#FFFFFF";
  const subtitleColor = isHeaderLight ? "rgba(17,24,39,0.75)" : "rgba(255,255,255,0.92)";
  const scrimColor = isHeaderLight ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.20)";
  const controlBg = isHeaderLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.20)";
  const skeletonColor = isHeaderLight ? "rgba(17,24,39,0.12)" : "rgba(255,255,255,0.25)";
  const skeletonColorSoft = isHeaderLight ? "rgba(17,24,39,0.08)" : "rgba(255,255,255,0.18)";

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
      <View pointerEvents="none" style={[styles.scrim, { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: scrimColor }]} />
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
    </LinearGradient>
  );
}
