import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const statusColors: Record<number, string> = {
  0: "#10B981",
  1: "#fa2828ff",
  2: "#F59E0B",
  3: "#6B7280",
  4: "#FB923C",
};

const statusLabels: Record<number, string> = {
  0: "Cobrado",
  1: "Pendiente",
  2: "Solicitud Anul.",
  3: "Anulado",
  4: "Anul. Parcial",
};

interface CuentaCardHeaderProps {
  statusValue: number;
  habitacionNombre?: string;
  codigo: string;
  fechaCrea?: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  formatDate: (date?: string) => string;
}

export const CuentaCardHeader: React.FC<CuentaCardHeaderProps> = ({
  statusValue,
  habitacionNombre,
  codigo,
  fechaCrea,
  accentColor,
  textPrimary,
  textSecondary,
  formatDate,
}) => {
  const statusColor = statusColors[statusValue] || "#6B7280";
  const statusText = statusLabels[statusValue] || "Desconocido";

  return (
    <View style={styles.cardHeader}>
      <View style={styles.headerInfo}>
        <View style={[styles.iconBox, { backgroundColor: accentColor + "15" }]}>
          <Ionicons name="receipt" size={18} color={accentColor} />
        </View>
        <View>
          <Text style={[styles.title, { color: textPrimary }]}>
            {habitacionNombre || "Barra / General"}
          </Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Codigo : #{codigo}
          </Text>
          <Text style={[styles.date, { color: textSecondary }]}>
            {formatDate(fechaCrea)}
          </Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + "10" }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  date: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },
});
