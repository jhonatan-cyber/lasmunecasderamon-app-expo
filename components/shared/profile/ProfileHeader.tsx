import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SkeletonBox } from "./ProfileSkeletonBox";

interface Props {
  gradientColors: string[];
  insetsTop: number;
  isTablet: boolean;
  isDark: boolean;
  roleLabel?: string;
  skeletonMode?: boolean;
}

export function ProfileHeader({ gradientColors, insetsTop, isTablet, isDark, roleLabel, skeletonMode }: Props) {
  const router = useRouter();

  return (
    <LinearGradient
      colors={gradientColors as unknown as readonly [string, string, ...string[]]}
      style={[
        styles.header,
        { paddingTop: insetsTop + (isTablet ? 20 : 10), paddingBottom: 25, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
      ]}
    >
      <View style={styles.headerTop}>
        <View style={{ flex: 1, gap: skeletonMode ? 8 : 2 }}>
          {skeletonMode ? (
            <>
              <SkeletonBox width={140} height={20} borderRadius={8} style={{ backgroundColor: isDark ? "rgba(17, 24, 39, 0.15)" : "rgba(255, 255, 255, 0.25)" }} />
              <SkeletonBox width={90} height={13} borderRadius={6} style={{ backgroundColor: isDark ? "rgba(17, 24, 39, 0.1)" : "rgba(255, 255, 255, 0.18)" }} />
            </>
          ) : (
            <>
              <Text style={[styles.headerTitle, { color: isDark ? "#111827" : "#FFFFFF" }, isTablet && { fontSize: 28 }]}>
                Mi Perfil
              </Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)" }, isTablet && { fontSize: 17 }]}>
                {roleLabel || "Cuenta personal"}
              </Text>
            </>
          )}
        </View>
        {!skeletonMode && (
          <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
            <Ionicons name="arrow-back" size={isTablet ? 26 : 22} color="#FFFFFF" />
            <Text style={styles.backTextHeader}>Atrás</Text>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtnRight: { flexDirection: "row", alignItems: "center", height: 38, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, gap: 6 },
  backTextHeader: { color: "#FFFFFF", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  headerTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: "600", opacity: 0.8 },
});
