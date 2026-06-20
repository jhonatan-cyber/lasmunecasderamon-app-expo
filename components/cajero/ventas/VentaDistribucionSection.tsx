import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { BASE_URL } from "@/api/client";
import type { ComisionDetalle, PropinaDetalle, VentaDetail } from "./types";

interface VentaDistribucionSectionProps {
    selectedVenta: VentaDetail;
    accentColor: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    isDark: boolean;
}

interface PersonaRowProps {
    foto?: string | null;
    nick: string;
    monto: number;
    accentColor: string;
    textPrimary: string;
    isLast: boolean;
    monoColor?: string;
}

const PersonaRow: React.FC<PersonaRowProps> = ({ foto, nick, monto, accentColor, textPrimary, isLast, monoColor }) => {
    const color = monoColor ?? accentColor;
    return (
        <View style={[styles.row, !isLast && styles.rowBorder]}>
            <View style={styles.persona}>
                {foto ? (
                    <Image source={{ uri: `${BASE_URL}/img/users/${foto}` }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: `${color}15` }]}>
                        <Text style={[styles.avatarText, { color }]}>{nick?.[0]?.toUpperCase()}</Text>
                    </View>
                )}
                <Text style={[styles.nick, { color: textPrimary }]}>@{nick}</Text>
            </View>
            <Text style={[styles.monto, { color }]}>${Number(monto).toLocaleString("es-CL")}</Text>
        </View>
    );
};

export const VentaDistribucionSection: React.FC<VentaDistribucionSectionProps> = ({
    selectedVenta,
    accentColor,
    borderColor,
    textPrimary,
    textSecondary,
    isDark,
}) => {
    const hasComisiones = (selectedVenta.comisiones_detalle?.length ?? 0) > 0;
    const hasPropinas = (selectedVenta.propinas_detalle?.length ?? 0) > 0;

    if (!hasComisiones && !hasPropinas) return null;

    return (
        <View style={{ marginBottom: 25, gap: 12 }}>
            {hasComisiones && (
                <View style={[styles.card, { backgroundColor: isDark ? "#1A1A1A" : "#FFF", borderColor }]}>
                    <View style={styles.header}>
                        <Text style={[styles.label, { color: textSecondary }]}>Distribución de Comisiones</Text>
                        {selectedVenta.total_comision > 0 && (
                            <Text style={[styles.totalComision, { color: accentColor }]}>
                                ${Number(selectedVenta.total_comision).toLocaleString("es-CL")} total
                            </Text>
                        )}
                    </View>
                    {selectedVenta.comisiones_detalle.map((c: ComisionDetalle, idx: number) => (
                        <PersonaRow
                            key={idx}
                            foto={c.foto}
                            nick={c.nick}
                            monto={c.monto}
                            accentColor={accentColor}
                            textPrimary={textPrimary}
                            isLast={idx === selectedVenta.comisiones_detalle.length - 1}
                        />
                    ))}
                </View>
            )}
            {hasPropinas && (
                <View style={[styles.card, { backgroundColor: isDark ? "#1A1A1A" : "#FFF", borderColor }]}>
                    <Text style={[styles.label, { color: textSecondary, marginBottom: 15 }]}>Distribución de Propinas</Text>
                    {selectedVenta.propinas_detalle.map((p: PropinaDetalle, idx: number) => (
                        <PersonaRow
                            key={idx}
                            foto={p.foto}
                            nick={p.nick}
                            monto={p.monto}
                            accentColor={accentColor}
                            textPrimary={textPrimary}
                            isLast={idx === selectedVenta.propinas_detalle.length - 1}
                            monoColor="#10B981"
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: { padding: 18, borderRadius: 24, borderWidth: 1 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
    label: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
    totalComision: { fontSize: 14, fontWeight: "900" },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
    persona: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: { width: 28, height: 28, borderRadius: 14 },
    avatarPlaceholder: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    avatarText: { fontSize: 10, fontWeight: "900" },
    nick: { fontSize: 14, fontWeight: "800" },
    monto: { fontSize: 15, fontWeight: "900" },
});
