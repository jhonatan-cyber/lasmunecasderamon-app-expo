import Ionicons from '@expo/vector-icons/Ionicons';
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { statusColors, statusLabels, payMethodIcons } from "./constants";
import { FontFamily, TabularNumbers } from "@/constants/fonts";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { haptic } from "@/utils/haptics";

const formatTotal = (value: number) =>
  `$${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

interface VentaCardRightProps {
  estado: number;
  metodoPago?: string;
  total: number;
  propina: number;
  productCount: number;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark?: boolean;
  onFinalizar?: () => void;
}

export const VentaCardRight: React.FC<VentaCardRightProps> = ({
  estado,
  metodoPago,
  total,
  propina,
  productCount,
  accentColor,
  textPrimary,
  textSecondary,
  onFinalizar,
}) => {
  const statusColor = statusColors[estado] || "#6B7280";

  return (
    <View style={styles.cardRightContent}>
      {estado === 2 && onFinalizar && (
        <Pressable
          style={({ pressed }) => [
            styles.finishBtn,
            { backgroundColor: accentColor },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            haptic.confirm();
            onFinalizar();
          }}
        >
          <Ionicons name="stop-circle" size={16} color="#FFF" />
          <Text style={styles.finishBtnText}>Finalizar</Text>
        </Pressable>
      )}

      <View style={styles.methodBadgeContainer}>
        <Ionicons
          name={(payMethodIcons[metodoPago || ""] || "wallet-outline") as keyof typeof Ionicons.glyphMap}
          size={14}
          color={textSecondary}
        />
        <Text style={[styles.methodText, { color: textSecondary }]}>
          {metodoPago?.toUpperCase() || "N/A"}
        </Text>
      </View>

      <View style={[styles.methodBadgeContainer, { marginTop: 4 }]}>
        <View style={[styles.statusBadgeSmall, { backgroundColor: `${statusColor}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          {/* El color del estado queda en el punto; el texto usa el color primario. */}
          <Text style={[styles.statusTextSmall, { color: textPrimary }]}>
            {statusLabels[estado] || "Desconocido"}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <AnimatedNumber
          value={total}
          format={formatTotal}
          style={[styles.cardTotalBig, { color: textPrimary }]}
        />
        <View style={styles.subInfoRow}>
          <Text style={[styles.cardSubCount, { color: textSecondary }]}>
            {productCount} items
          </Text>
          {propina > 0 && (
            <>
              <Text style={{ color: textSecondary, marginHorizontal: 4 }}>
                {'\u00B7'}
              </Text>
              <Text style={styles.cardPropinaGreen}>
                +${propina.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardRightContent: {
    flex: 0.8,
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0,0,0,0.03)",
    paddingLeft: 12,
  },
  methodBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  methodText: { fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: 0.8 },
  cardTotalBig: { fontSize: 22, fontFamily: FontFamily.extrabold, ...TabularNumbers },
  subInfoRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  cardSubCount: { fontSize: 12, fontFamily: FontFamily.medium },
  cardPropinaGreen: { fontSize: 12, fontFamily: FontFamily.semibold, color: "#10B981", ...TabularNumbers },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    marginBottom: 8,
  },
  finishBtnText: { color: "#FFF", fontSize: 11, fontFamily: FontFamily.bold },
  statusBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusTextSmall: { fontSize: 11, fontFamily: FontFamily.bold, textTransform: "uppercase" },
});
