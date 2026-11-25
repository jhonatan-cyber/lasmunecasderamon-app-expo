import React, { useMemo } from "react";
import { BorderRadius } from '@/constants/spacing';
import { StyleSheet, Text, View } from "react-native";
import type { VentaDetail, VentaDetalle } from "./types";
import { ProductLineRow } from '@/components/shared/ProductLineRow';

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
        const productoKey = `${cur.producto_id ?? cur.producto_nombre}-${cur.presentacion_id ?? ""}`;
        const key = `${productoKey}-${hNick}`;
        const idx = acc.findIndex((i) => {
            const ihNick = i.hostess_nick || fallbackNick || "Sin Anfitriona";
            const itemProductoKey = `${i.producto_id ?? i.producto_nombre}-${i.presentacion_id ?? ""}`;
            return `${itemProductoKey}-${ihNick}` === key;
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
                <ProductLineRow
                    key={idx}
                    badge={`CANT: ${det.cantidad}`}
                    unitPrice={`$${Number(det.precio).toLocaleString("es-CL")} c/u`}
                    photo={det.producto_foto ?? undefined}
                    name={det.producto_etiqueta || [det.categoria_nombre, det.producto_nombre, det.presentacion_nombre].filter(Boolean).join(" - ") || det.producto_nombre || "Producto"}
                    lineTotal={`$${Number(det.sub_total).toLocaleString("es-CL")}`}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    accentColor={accentColor}
                    isDark={isDark}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionLabel: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
    card: { borderRadius: BorderRadius.card, padding: 16, borderWidth: 1, marginBottom: 12 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    cantBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    cantText: { fontSize: 11, fontWeight: "900" },
    precioUnit: { fontSize: 14, fontWeight: "800" },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    productImage: { width: 40, height: 40, borderRadius: BorderRadius.full },
    productImagePlaceholder: { width: 40, height: 40, borderRadius: BorderRadius.full, justifyContent: "center", alignItems: "center" },
    productName: { fontSize: 16, fontWeight: "800", flex: 1, minWidth: 0 },
    totalRow: { flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)", paddingTop: 12 },
    productTotal: { fontSize: 18, fontWeight: "900" },
});
