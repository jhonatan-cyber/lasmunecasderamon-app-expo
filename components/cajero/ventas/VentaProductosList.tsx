import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/api/client";
import type { VentaDetail, VentaDetalle } from "./types";

interface VentaProductosListProps {
    selectedVenta: VentaDetail;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    isDark: boolean;
}

function groupDetalles(dets: VentaDetalle[], fallbackNick: string): VentaDetalle[] {
    return dets.reduce((acc: VentaDetalle[], cur: VentaDetalle) => {
        const hNick = cur.hostess_nick || fallbackNick || "Sin Anfitriona";
        const key = `${cur.producto_nombre}-${hNick}`;
        const idx = acc.findIndex((i) => {
            const ihNick = i.hostess_nick || fallbackNick || "Sin Anfitriona";
            return `${i.producto_nombre}-${ihNick}` === key;
        });
        if (idx > -1) {
            acc[idx].cantidad += Number(cur.cantidad) || 0;
            acc[idx].sub_total += Number(cur.sub_total) || 0;
            acc[idx].comision += Number(cur.comision || 0);
        } else acc.push({ ...cur });
        return acc;
    }, []);
}

export const VentaProductosList: React.FC<VentaProductosListProps> = ({
    selectedVenta,
    accentColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    isDark,
}) => {
    const grouped = useMemo(
        () => groupDetalles(selectedVenta.detalles || [], selectedVenta.usuarios_nicks || ""),
        [selectedVenta.detalles, selectedVenta.usuarios_nicks],
    );

    return (
        <View style={{ marginTop: 5, paddingHorizontal: 4 }}>
            <Text style={[styles.sectionLabel, { color: textSecondary, marginBottom: 15 }]}>Listado de Productos</Text>
            {grouped.map((det, idx) => (
                <View key={idx} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cantBadge, { backgroundColor: `${accentColor}10` }]}>
                            <Text style={[styles.cantText, { color: accentColor }]}>CANT: {det.cantidad}</Text>
                        </View>
                        <Text style={[styles.precioUnit, { color: textSecondary }]}>
                            ${Number(det.precio).toLocaleString("es-CL")} c/u
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        {det.producto_foto ? (
                            <Image
                                source={{ uri: `${BASE_URL}/api/images/products/${det.producto_foto}` }}
                                style={styles.productImage}
                            />
                        ) : (
                            <View style={[styles.productImagePlaceholder, { backgroundColor: isDark ? "#333" : "#EEE" }]}>
                                <Ionicons name="cube-outline" size={20} color={textSecondary} />
                            </View>
                        )}
                        <Text style={[styles.productName, { color: textPrimary }]}>{det.producto_nombre}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={[styles.productTotal, { color: textPrimary }]}>
                            ${Number(det.sub_total).toLocaleString("es-CL")}
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionLabel: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
    card: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 12 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    cantBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    cantText: { fontSize: 11, fontWeight: "900" },
    precioUnit: { fontSize: 14, fontWeight: "800" },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    productImage: { width: 40, height: 40, borderRadius: 10 },
    productImagePlaceholder: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    productName: { fontSize: 16, fontWeight: "800", flex: 1 },
    totalRow: { flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)", paddingTop: 12 },
    productTotal: { fontSize: 18, fontWeight: "900" },
});
