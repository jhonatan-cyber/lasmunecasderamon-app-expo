import React from "react";
import { BorderRadius } from '@/constants/spacing';
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { BASE_URL } from "@/api/client";
import type { ComisionDetalle, PropinaDetalle, VentaDetail } from "./types";
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';

interface VentaDistribucionSectionProps {
    selectedVenta: VentaDetail;
    accentColor: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
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
}) => {
    const { accentOnSurface, surfaceMuted } = useAccentColor();
    const hasComisiones = (selectedVenta.comisiones_detalle?.length ?? 0) > 0;
    const hasPropinas = (selectedVenta.propinas_detalle?.length ?? 0) > 0;

    if (!hasComisiones && !hasPropinas) return null;

    return (
        <View style={{ marginBottom: 25, gap: 12 }}>
            {hasComisiones && (
                <View style={[styles.card, { backgroundColor: surfaceMuted, borderColor }]}>
                    <View style={styles.header}>
                        <Text style={[styles.label, { color: textSecondary }]}>Distribución de Comisiones</Text>
                        {selectedVenta.total_comision > 0 && (
                            <Text style={[styles.totalComision, { color: accentOnSurface }]}>
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
                <View style={[styles.card, { backgroundColor: surfaceMuted, borderColor }]}>
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
                            monoColor={accentOnSurface}
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
    label: { fontSize: 11, fontFamily: FontFamily.black, textTransform: "uppercase", letterSpacing: 1 },
    totalComision: { fontSize: 14, fontFamily: FontFamily.black },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
    persona: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: { width: 28, height: 28, borderRadius: BorderRadius.full },
    avatarPlaceholder: { width: 28, height: 28, borderRadius: BorderRadius.full, justifyContent: "center", alignItems: "center" },
    avatarText: { fontSize: 10, fontFamily: FontFamily.black },
    nick: { fontSize: 14, fontFamily: FontFamily.extrabold },
    monto: { fontSize: 15, fontFamily: FontFamily.black },
});
