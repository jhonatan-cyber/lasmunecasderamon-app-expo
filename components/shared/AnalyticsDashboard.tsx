import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { apiClientSafe } from "@/api/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { LazyDonutChart } from "@/components/ui/LazyDonutChart";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedView } from '@/components/ui/AnimatedView';
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "@/utils/format";

const { width } = Dimensions.get("window");

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
}) => {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <AnimatedView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500 }}
      style={styles.statCardContainer}
    >
      <LinearGradient
        colors={isDark ? ["#1E293B", "#0F172A"] : ["#FFFFFF", "#F8FAFC"]}
        style={[
          styles.statCard,
          { borderColor: isDark ? "#334155" : "#E2E8F0", borderWidth: 1 },
        ]}
      >
        <View style={styles.statCardHeader}>
          <View
            style={[styles.iconContainer, { backgroundColor: color + "15" }]}
          >
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
          </View>
          {subtitle ? (
            <View style={styles.trendBadge}>
              <Text
                style={[styles.statSubtitle, { color: colors.textSecondary }]}
              >
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.statContent}>
          <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
            {title}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {value}
          </Text>
        </View>
      </LinearGradient>
    </AnimatedView>
  );
};

interface MiniChartProps {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, color, height = 120 }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <View style={[styles.miniChartContainer, { height }]}>
      {data.map((item, index) => (
        <View key={index} style={styles.barWrapper}>
          <AnimatedView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 1000, delay: index * 100 }}
            style={[
              styles.barContainer,
              { height: `${(item.value / maxValue) * 100}%` },
            ]}
          >
            <LinearGradient
              colors={[color, color + "80"]}
              style={styles.barGradient}
            />
          </AnimatedView>
          <Text
            style={[styles.barLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

export const AnalyticsDashboard: React.FC = () => {
  const { colors, theme } = useTheme();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => apiClientSafe("/dashboard/stats", { method: "GET" }),
    staleTime: 30000,
  });

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-chart"],
    queryFn: async () => apiClientSafe("/dashboard/sales-chart", { method: "GET" }),
    staleTime: 60000,
  });

  const stats = (statsData as any)?.data || {};
  const salesChart = (salesData as any)?.data || { weekly: [], daily: [] };

  const statusItems = [
    {
      label: "Pendientes",
      color: "#F59E0B",
      value: stats.servicesByStatus?.pendientes || 0,
    },
    {
      label: "En Proceso",
      color: "#3B82F6",
      value: stats.servicesByStatus?.enProceso || 0,
    },
    {
      label: "Completados",
      color: "#10B981",
      value: stats.servicesByStatus?.completados || 0,
    },
    {
      label: "Cancelados",
      color: "#EF4444",
      value: stats.servicesByStatus?.cancelados || 0,
    },
  ];

  const totalStatuses = statusItems.reduce((sum, item) => sum + item.value, 0);
  const completedPercent = Math.round(
    (statusItems[2].value / Math.max(totalStatuses, 1)) * 100,
  );

  if (statsLoading || salesLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerSkeleton}>
          <Skeleton width={150} height={24} style={{ borderRadius: 8 }} />
          <Skeleton
            width={100}
            height={16}
            style={{ borderRadius: 4, marginTop: 8 }}
          />
        </View>
        <View style={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              width={(width - 48) / 2}
              height={100}
              style={{ borderRadius: 12 }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Resumen Analytics
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Actualizado: {new Date().toLocaleDateString("es-PE")}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Ventas Hoy"
          value={formatCurrency(stats.salesToday || 0)}
          subtitle={`+${stats.salesCountToday || 0} hoy`}
          icon="cash-outline"
          color="#10B981"
        />
        <StatCard
          title="Servicios"
          value={stats.activeServices || 0}
          subtitle={`${stats.completedServicesToday || 0} hechos`}
          icon="construct-outline"
          color="#3B82F6"
        />
        <StatCard
          title="Usuarios"
          value={stats.activeUsers || 0}
          subtitle="En línea"
          icon="people-outline"
          color="#8B5CF6"
        />
        <StatCard
          title="Propinas"
          value={formatCurrency(stats.tipsToday || 0)}
          subtitle="Extra hoy"
          icon="heart-outline"
          color="#F59E0B"
        />
      </View>

      {salesChart.weekly?.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Ventas Semanales
          </Text>
          <MiniChart
            data={salesChart.weekly.map((item: any) => ({
              label: item.day?.substring(0, 3) || "",
              value: item.total || 0,
            }))}
            color="#3B82F6"
          />
        </View>
      )}

      {stats.servicesByStatus && (
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Servicios por Estado
          </Text>
          <View style={styles.chartRow}>
            <LazyDonutChart
              percent={completedPercent}
              color="#10B981"
              size={140}
              label="Completados"
              isDark={theme === "dark"}
            />
            <View style={styles.statusLegend}>
              {statusItems.map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: item.color }]}
                  />
                  <Text
                    style={[styles.legendText, { color: colors.textSecondary }]}
                  >
                    {item.label}: {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {stats.topProducts && stats.topProducts.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Productos Mas Vendidos
          </Text>
          {stats.topProducts.slice(0, 5).map((product: any, index: number) => (
            <View key={index} style={styles.topProductItem}>
              <Text
                style={[styles.productRank, { color: colors.textSecondary }]}
              >
                #{index + 1}
              </Text>
              <Text style={[styles.productName, { color: colors.text }]}>
                {product.name}
              </Text>
              <Text
                style={[styles.productQty, { color: colors.textSecondary }]}
              >
                {product.quantity}unid.
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          Informacion en Tiempo Real
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Los datos se actualizan cada 30 segundos. Desliza hacia abajo para
          actualizar.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  headerSkeleton: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  statCardContainer: {
    width: "47%",
  },
  statCard: {
    padding: 16,
    borderRadius: 20,
    height: 130,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  statContent: {
    marginTop: 8,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  statSubtitle: {
    fontSize: 10,
    fontWeight: "700",
  },
  chartCard: {
    margin: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  miniChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 20,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  barContainer: {
    width: "80%",
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barGradient: {
    flex: 1,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 8,
  },
  statusLegend: {
    gap: 12,
    flex: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
    fontWeight: "600",
  },
  topProductItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  productRank: {
    width: 32,
    fontSize: 14,
    fontWeight: "800",
    opacity: 0.5,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  productQty: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 24,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
});
