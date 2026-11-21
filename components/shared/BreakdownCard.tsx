import { Ionicons } from "@expo/vector-icons";
import { useAccentColor } from "@/hooks/useAccentColor";
import { formatCurrency } from "@/utils/format";
import { useCallback, useMemo, useState } from "react";
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BorderRadius } from "@/constants/spacing";

type UserRole = "anfitriona" | "garzon" | "barman" | "cajero";

interface BreakdownData {
  montoAsistencia: number;
  montoComisiones: number;
  montoPropinas: number;
  montoHorasExtras: number;
  montoGratificaciones: number;
  montoAnticipos: number;
  totalAsistencias: number;
  serviciosCompletados: number;
}

interface BreakdownCardProps {
  breakdown?: BreakdownData;
  role: UserRole;
}

export const BreakdownCard = ({ breakdown, role }: BreakdownCardProps) => {
  const { textSecondary, textPrimary, accentColor, surfaceMuted, isDark, accentUi, cardBg, borderColor } = useAccentColor();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((prev) => !prev);
  }, []);

  const breakdownItems = useMemo(() => {
    if (!breakdown) return [];
    const items: {
      label: string;
      sublabel: string;
      amount: number;
      icon: "calendar" | "star" | "happy" | "time" | "wallet" | "gift";
      colorIndex: number;
    }[] = [];

    // Asistencias - todos los roles
    items.push({
      label: "Asistencias",
      sublabel: `${breakdown.totalAsistencias} días`,
      amount: breakdown.montoAsistencia,
      icon: "calendar",
      colorIndex: 0,
    });

    // Propinas - todos los roles
    items.push({
      label: "Propinas",
      sublabel: "Total acumulado",
      amount: breakdown.montoPropinas,
      icon: "happy",
      colorIndex: 1,
    });

    // Horas extras - todos los roles
    items.push({
      label: "Horas extras",
      sublabel: "Monto total",
      amount: breakdown.montoHorasExtras,
      icon: "time",
      colorIndex: 2,
    });

    // Gratificaciones - todos los roles
    items.push({
      label: "Gratificaciones",
      sublabel: "Total acumulado",
      amount: breakdown.montoGratificaciones,
      icon: "gift",
      colorIndex: 3,
    });

    // Anticipos - todos los roles
    items.push({
      label: "Anticipos",
      sublabel: "Total descontado",
      amount: breakdown.montoAnticipos,
      icon: "wallet",
      colorIndex: 4,
    });

    // Servicios/Comisiones - solo para anfitriona
    if (role === "anfitriona") {
      items.push({
        label: "Servicios",
        sublabel: `${breakdown.serviciosCompletados} completados`,
        amount: breakdown.montoComisiones,
        icon: "star",
        colorIndex: 5,
      });
    }

    return items;
  }, [breakdown, role]);

  if (breakdownItems.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.7}
        onPress={toggleCollapsed}
        accessibilityRole="button"
        accessibilityLabel={collapsed ? "Expandir desglose" : "Contraer desglose"}
      >
        <Ionicons name="pie-chart" size={16} color={accentColor} />
        <Text style={[styles.title, { color: textSecondary }]}>
          Desglose de ingresos
        </Text>
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={18}
          color={accentColor}
        />
      </TouchableOpacity>
      {!collapsed && (
        <View style={styles.grid}>
        {breakdownItems.map((item) => {
          const color = colorVariantsFor(item.colorIndex, accentColor, accentUi, isDark);
          const itemNeonGlow = isDark ? {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
          } : {};
          return (
            <View
              key={item.label}
              style={[
                styles.item,
                {
                  backgroundColor: bgVariantsFor(item.colorIndex, accentColor, surfaceMuted, isDark),
                  borderColor,
                  ...itemNeonGlow,
                },
              ]}
            >
              <View style={styles.itemHeader}>
                <View style={[styles.iconBadge, { backgroundColor: `${color}1F` }]}>
                  <Ionicons name={item.icon} size={14} color={color} />
                </View>
                <Text
                  style={[styles.itemLabel, { color: textSecondary }]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
              <Text
                style={[styles.itemAmount, { color: textPrimary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(item.amount)}
              </Text>
              <Text
                style={[styles.itemSublabel, { color: textSecondary }]}
                numberOfLines={1}
              >
                {item.sublabel}
              </Text>
            </View>
          );
        })}
        </View>
      )}
    </View>
  );
};

function colorVariantsFor(index: number, accentColor: string, accentUi: string, isDark: boolean): string {
  if (isDark) {
    const variants = [accentColor, `${accentColor}CC`, `${accentColor}99`, `${accentColor}66`, `${accentColor}44`, `${accentColor}33`];
    return variants[index] || accentColor;
  }
  const variants = [accentColor, accentUi, `${accentColor}BB`, `${accentColor}88`, `${accentColor}66`, `${accentColor}44`];
  return variants[index] || accentColor;
}

function bgVariantsFor(index: number, accentColor: string, surfaceMuted: string, isDark: boolean): string {
  if (isDark) {
    const variants = [`${accentColor}15`, `${accentColor}10`, `${accentColor}0D`, `${accentColor}0A`, `${accentColor}08`, `${accentColor}06`];
    return variants[index] || `${accentColor}15`;
  }
  const variants = [surfaceMuted, `${accentColor}08`, `${accentColor}05`, `${accentColor}03`, `${accentColor}02`, `${accentColor}01`];
  return variants[index] || surfaceMuted;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  item: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  itemAmount: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  itemSublabel: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.8,
  },
});
