import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface CuentaCardDetailsProps {
  clienteNombre?: string;
  productCount: number;
  creadorNombre?: string;
  textPrimary: string;
  textSecondary: string;
}

export const CuentaCardDetails: React.FC<CuentaCardDetailsProps> = ({
  clienteNombre,
  productCount,
  creadorNombre,
  textPrimary,
  textSecondary,
}) => (
  <View style={styles.detailsList}>
    <View style={styles.detailRow}>
      <Ionicons name="person" size={14} color={textSecondary} />
      <Text style={[styles.detailTextVal, { color: textPrimary }]}>
        <Text style={{ fontWeight: "800" }}>Cliente: </Text>
        {clienteNombre || "Sin registrar"}
      </Text>
    </View>
    <View style={styles.detailRow}>
      <Ionicons name="cube" size={14} color={textSecondary} />
      <Text style={[styles.detailTextVal, { color: textPrimary }]}>
        <Text style={{ fontWeight: "800" }}>Productos: </Text>
        {productCount} item{productCount !== 1 ? "s" : ""}
      </Text>
    </View>
    {creadorNombre && (
      <View style={styles.detailRow}>
        <Ionicons name="create-outline" size={14} color={textSecondary} />
        <Text style={[styles.detailTextVal, { color: textPrimary }]}>
          <Text style={{ fontWeight: "800" }}>Registrado por: </Text>
          {creadorNombre}
        </Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  detailsList: {
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailTextVal: {
    fontSize: 12,
    flex: 1,
  },
});
