import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ActionGrid, type ActionGridItem } from "@/components/ui/ActionGrid";
import { LazyDonutChart } from "@/components/ui/LazyDonutChart";
import { BorderRadius } from "@/constants/spacing";
import { formatCurrency } from "@/utils/format";
import { styles } from "../HomeScreen.styles";
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FontFamily } from '@/constants/fonts';

interface AnfitrionaAnalyticsSectionProps {
  totalEarnings: number;
  accentColor: string;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  onOpenAnalytics: () => void;
  onOpenResumen: () => void;
}

export function AnfitrionaAnalyticsSection({
  totalEarnings,
  accentColor,
  isDark,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  onOpenAnalytics,
  onOpenResumen,
}: AnfitrionaAnalyticsSectionProps) {
    const { accentOnSurface, accentColor: themeAccentColor } = useAccentColor();
  const reducedMotion = useReducedMotion();
  const actions: ActionGridItem[] = [
    {
      title: "RESUMEN",
      description: "Total a cobrar y calendario",
      icon: "stats-chart",
      color: themeAccentColor,
      onPress: onOpenResumen,
    },
  ];

  // Efecto neón en modo oscuro para las cards de analytics.
  const neonGlow = isDark
    ? {
        borderColor: accentColor,
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
      }
    : {};

  // Animación de entrada escalonada para las cards de analytics
  const card1Scale = useSharedValue(0);
  const card1Opacity = useSharedValue(0);
  const card2Scale = useSharedValue(0);
  const card2Opacity = useSharedValue(0);
  const linkOpacity = useSharedValue(0);

  if (reducedMotion) {
    // Sin animación cuando el usuario prefiere movimiento reducido.
    card1Scale.value = 1;
    card1Opacity.value = 1;
    card2Scale.value = 1;
    card2Opacity.value = 1;
    linkOpacity.value = 1;
  } else {
    card1Scale.value = withDelay(0, withSpring(1, { damping: 12, stiffness: 100 }));
    card1Opacity.value = withDelay(0, withTiming(1, { duration: 300 }));
    card2Scale.value = withDelay(80, withSpring(1, { damping: 12, stiffness: 100 }));
    card2Opacity.value = withDelay(80, withTiming(1, { duration: 300 }));
    linkOpacity.value = withDelay(160, withTiming(1, { duration: 300 }));
  }

  const card1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: card1Scale.value }],
    opacity: card1Opacity.value,
  }));
  const card2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: card2Scale.value }],
    opacity: card2Opacity.value,
  }));
  const linkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: linkOpacity.value,
  }));

  return (
    <>
      <View style={styles.analyticsRow}>
        <Animated.View style={[card1AnimatedStyle]}>
          <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor, borderRadius: BorderRadius.card }, neonGlow]}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>
              Meta Semanal
            </Text>
            <LazyDonutChart
              size={60}
              percent={Math.min(
                100,
                Math.round((totalEarnings / 50000) * 100),
              )}
              color={accentOnSurface}
              isDark={isDark}
            />
            <Text style={{ color: textSecondary, fontSize: 11 }}>
              {formatCurrency(totalEarnings)} / {formatCurrency(50000)}
            </Text>
          </View>
        </Animated.View>
        <Animated.View style={[card2AnimatedStyle]}>
          <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor, borderRadius: BorderRadius.card }, neonGlow]}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>
              Crecimiento
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontFamily: FontFamily.black,
                color: accentOnSurface,
              }}
            >
              +12%
            </Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[linkAnimatedStyle]}>
        <Pressable
          onPress={onOpenAnalytics}
          style={({ pressed }) => [
            styles.analyticsLink,
            {
              backgroundColor: cardBg,
              borderColor: isDark ? accentColor : borderColor,
              borderRadius: BorderRadius.card,
              opacity: pressed ? 0.8 : 1,
              ...(isDark ? {
                shadowColor: accentColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 4,
              } : {}),
            },
          ]}
        >
        <View
          style={[
            styles.analyticsLinkIcon,
            { backgroundColor: `${accentColor}1F` },
          ]}
        >
          <Ionicons name="stats-chart" size={18} color={accentOnSurface} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: textPrimary,
              fontSize: 14,
              fontFamily: FontFamily.extrabold,
            }}
          >
            Analíticas
          </Text>
          <Text style={{ color: textSecondary, fontSize: 11 }}>
            Métricas y tendencias
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={textSecondary} />
      </Pressable>
      </Animated.View>

      <ActionGrid actions={actions} variant="row" />
    </>
  );
}
