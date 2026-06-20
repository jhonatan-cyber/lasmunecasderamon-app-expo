import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { VentaDetail } from "./types";

interface VentaOrigenSectionProps {
    selectedVenta: VentaDetail;
    accentColor: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    isDark: boolean;
}

export const VentaOrigenSection: React.FC<VentaOrigenSectionProps> = ({
    selectedVenta,
    accentColor,
    borderColor,
    textPrimary,
    textSecondary,
    isDark,
}) => (
    <View style={[styles.container, { backgroundColor: isDark ? "#1a1a2e" : "#F8FAFC", borderColor }]}>
        <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: selectedVenta.pedido_id ? `${accentColor}20` : "#10B98120" }]}>
                <Ionicons
                    name={selectedVenta.pedido_id ? "receipt-outline" : "storefront-outline"}
                    size={20}
                    color={selectedVenta.pedido_id ? accentColor : "#10B981"}
                />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.origenType, { color: selectedVenta.pedido_id ? accentColor : "#10B981" }]}>
                    {selectedVenta.pedido_id ? "VENTA DESDE PEDIDO" : "VENTA DIRECTA EN BARRA"}
                </Text>
                {selectedVenta.pedido_id ? (
                    <View style={styles.personas}>
                        <Text style={[styles.personaLabel, { color: textSecondary }]}>
                            Pedido por:{" "}
                            <Text style={[styles.personaValue, { color: textPrimary }]}>
                                {selectedVenta.garzon_nombre || "—"}{selectedVenta.garzon_nick ? ` (@${selectedVenta.garzon_nick})` : ""}
                            </Text>
                        </Text>
                        <Text style={[styles.personaLabel, { color: textSecondary }]}>
                            Procesado por:{" "}
                            <Text style={[styles.personaValue, { color: textPrimary }]}>
                                {selectedVenta.cajero_nombre || "—"}{selectedVenta.cajero_nick ? ` (@${selectedVenta.cajero_nick})` : ""}
                            </Text>
                        </Text>
                    </View>
                ) : (
                    <Text style={[styles.personaLabel, { color: textSecondary }]}>
                        Vendido por:{" "}
                        <Text style={[styles.personaValue, { color: textPrimary }]}>
                            {selectedVenta.cajero_nombre || selectedVenta.vendedor_nombre || "—"}
                            {selectedVenta.cajero_nick ? ` (@${selectedVenta.cajero_nick})` : ""}
                        </Text>
                    </Text>
                )}
            </View>
        </View>

        {selectedVenta.habitacion_id && (
            <View style={[styles.habitacionRow, { borderTopColor: borderColor }]}>
                <Ionicons name="bed-outline" size={16} color={accentColor} />
                <Text style={[styles.personaLabel, { color: textSecondary, flex: 1 }]}>
                    Habitación:{" "}
                    <Text style={[styles.personaValue, { color: textPrimary }]}>
                        {selectedVenta.habitacion_nombre || selectedVenta.habitacion_numero || "—"}
                    </Text>
                </Text>
                {selectedVenta.tiempo ? (
                    <View style={[styles.tiempoBadge, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40` }]}>
                        <Ionicons name="time-outline" size={12} color={accentColor} />
                        <Text style={[styles.tiempoText, { color: accentColor }]}>{selectedVenta.tiempo} min</Text>
                    </View>
                ) : null}
            </View>
        )}
    </View>
);

const styles = StyleSheet.create({
    container: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 20 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    origenType: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5, marginBottom: 6 },
    personas: { gap: 3 },
    personaLabel: { fontSize: 13, fontWeight: "500" },
    personaValue: { fontWeight: "700" },
    habitacionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    tiempoBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    tiempoText: { fontSize: 12, fontWeight: "800" },
});
