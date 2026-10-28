import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { LazyDonutChart } from "@/components/ui/LazyDonutChart";
import { formatCurrency } from "@/utils/format";
import { styles } from "../HomeScreen.styles";

interface AnfitrionaAnalyticsSectionProps {
  totalEarnings: number;
  accentColor: string;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  onOpenAnalytics: () => void;
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
}: AnfitrionaAnalyticsSectionProps) {
  return (
    <>
      <View style={styles.analyticsRow}>
        <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>
            Meta Semanal
          </Text>
          <LazyDonutChart
            size={60}
            percent={Math.min(
              100,
              Math.round((totalEarnings / 50000) * 100),
            )}
            color={accentColor}
            isDark={isDark}
          />
          <Text style={{ color: textSecondary, fontSize: 11 }}>
            {formatCurrency(totalEarnings)} / {formatCurrency(50000)}
          </Text>
        </View>
        <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>
            Crecimiento
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "900",
              color: accentColor,
            }}
          >
            +12%
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onOpenAnalytics}
        style={({ pressed }) => [
          styles.analyticsLink,
          {
            backgroundColor: cardBg,
            borderColor,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.analyticsLinkIcon,
            { backgroundColor: `${accentColor}1F` },
          ]}
        >
          <Ionicons name="stats-chart" size={18} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: textPrimary,
              fontSize: 14,
              fontWeight: "800",
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
    </>
  );
}
