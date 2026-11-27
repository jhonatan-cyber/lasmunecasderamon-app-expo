import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ActionGrid, type ActionGridItem } from "@/components/ui/ActionGrid";
import { BorderRadius } from "@/constants/spacing";
import { formatCurrency } from "@/utils/format";
import { calculateWeeklyGrowth } from "@/utils/weeklyIncome";
import type { WeeklyIncomePoint } from "@/types/api";
import { styles } from "../HomeScreen.styles";
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FontFamily } from '@/constants/fonts';

interface AnfitrionaAnalyticsSectionProps {
  totalEarnings: number;
  weeklyIncome: WeeklyIncomePoint[];
  accentColor: string;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  onOpenResumen: () => void;
}

export function AnfitrionaAnalyticsSection({
  totalEarnings,
  weeklyIncome,
  accentColor,
  isDark,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  onOpenResumen,
}: AnfitrionaAnalyticsSectionProps) {
    const { accentOnSurface, accentColor: themeAccentColor } = useAccentColor();
  const reducedMotion = useReducedMotion();
  const weeklyGrowth = calculateWeeklyGrowth(weeklyIncome);
  const growthLabel = weeklyGrowth === null
    ? '—'
    : `${weeklyGrowth > 0 ? '+' : ''}${weeklyGrowth.toFixed(1)}%`;
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

  if (reducedMotion) {
    // Sin animación cuando el usuario prefiere movimiento reducido.
    card1Scale.value = 1;
    card1Opacity.value = 1;
    card2Scale.value = 1;
    card2Opacity.value = 1;
  } else {
    card1Scale.value = withDelay(0, withSpring(1, { damping: 12, stiffness: 100 }));
    card1Opacity.value = withDelay(0, withTiming(1, { duration: 300 }));
    card2Scale.value = withDelay(80, withSpring(1, { damping: 12, stiffness: 100 }));
    card2Opacity.value = withDelay(80, withTiming(1, { duration: 300 }));
  }

  const card1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: card1Scale.value }],
    opacity: card1Opacity.value,
  }));
  const card2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: card2Scale.value }],
    opacity: card2Opacity.value,
  }));

  return (
    <>
      <View style={styles.analyticsRow}>
        <Animated.View style={[card1AnimatedStyle]}>
          <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor, borderRadius: BorderRadius.card }, neonGlow]}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>Ingresos semanales</Text>
            <Text
              style={{
                fontSize: 20,
                fontFamily: FontFamily.black,
                color: accentOnSurface,
              }}
            >
              {formatCurrency(totalEarnings)}
            </Text>
            <Text style={{ color: textSecondary, fontSize: 11 }}>
              Acumulado esta semana
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
              {growthLabel}
            </Text>
            <Text style={{ color: textSecondary, fontSize: 11 }}>
              {weeklyGrowth === null ? 'Sin datos de la semana anterior' : 'vs. semana anterior'}
            </Text>
          </View>
        </Animated.View>
      </View>

      <ActionGrid actions={actions} variant="row" />
    </>
  );
}
