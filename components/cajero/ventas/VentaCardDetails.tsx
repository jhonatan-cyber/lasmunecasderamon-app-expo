import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface VentaCardDetailsProps {
  clienteNombre?: string;
  habitacionNombre?: string;
  productCount: number;
  anfitrionasNicks?: string;
  fechaCrea: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  formatDateTime: (dateStr: string) => string;
  renderTimer?: React.ReactNode;
}

export const VentaCardDetails: React.FC<VentaCardDetailsProps> = ({
  clienteNombre,
  habitacionNombre,
  productCount,
  anfitrionasNicks,
  fechaCrea,
  accentColor,
  textPrimary,
  textSecondary,
  formatDateTime,
  renderTimer,
}) => (
  <View style={styles.cardDetailsList}>
    <View style={styles.detailItemRow}>
      <Ionicons name="person-outline" size={14} color={textSecondary} style={styles.rowIcon} />
      <Text style={[styles.detailValue, { color: textPrimary }]}>
        {clienteNombre || "Sin cliente registrado"}
      </Text>
    </View>

    <View style={styles.detailItemRow}>
      <Ionicons name="business-outline" size={14} color={textSecondary} style={styles.rowIcon} />
      <Text style={[styles.detailValue, { color: textPrimary }]}>
        {habitacionNombre || "Barra / General"}
      </Text>
    </View>

    <View style={styles.detailItemRow}>
      <Ionicons name="cube-outline" size={14} color={textSecondary} style={styles.rowIcon} />
      <Text style={[styles.detailValue, { color: textPrimary }]}>
        {productCount} {productCount === 1 ? "producto" : "productos"}
      </Text>
    </View>

    <View style={styles.detailItemRow}>
      <Ionicons name="people-outline" size={14} color={textSecondary} style={styles.rowIcon} />
      {anfitrionasNicks ? (
        <View style={[styles.hostessPill, { backgroundColor: `${accentColor}15` }]}>
          <Text style={[styles.hostessText, { color: accentColor }]} numberOfLines={1}>
            {anfitrionasNicks}
          </Text>
        </View>
      ) : (
        <Text style={[styles.detailValue, { color: textSecondary, fontStyle: "italic" }]}>
          Venta en barra
        </Text>
      )}
    </View>

    <View style={styles.detailItemRow}>
      <Ionicons name="time-outline" size={14} color={textSecondary} style={styles.rowIcon} />
      <Text style={[styles.detailValue, { color: textSecondary, fontSize: 12 }]}>
        {formatDateTime(fechaCrea)}
      </Text>
    </View>

    {renderTimer}
  </View>
);

const styles = StyleSheet.create({
  cardDetailsList: { gap: 6 },
  detailItemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowIcon: { width: 16, textAlign: "center" },
  detailValue: { fontSize: 14, fontWeight: "600" },
  hostessPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 1,
  },
  hostessText: { fontSize: 13, fontWeight: "800" },
});
