import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { statusColors, statusLabels } from "./constants";
import { FontFamily, TabularNumbers } from "@/constants/fonts";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  StatusBadge,
  paymentIconFor,
} from "@/components/ui/StatusBadge";
import { haptic } from "@/utils/haptics";
import { useAccentColor } from '@/hooks/useAccentColor';

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
  const { accentOnSurface } = useAccentColor();
  const statusColor = statusColors[estado] || textSecondary;

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
          <Text style={[styles.finishBtnText, { color: "#FFF" }]}>Finalizar</Text>
        </Pressable>
      )}

      <StatusBadge
        label={metodoPago?.toUpperCase() || "N/A"}
        color={textSecondary}
        icon={paymentIconFor(metodoPago)}
        iconColor={textSecondary}
        textColor={textSecondary}
        uppercase
        bare
      />

      <StatusBadge
        label={statusLabels[estado] || "Desconocido"}
        color={statusColor}
        dot
        textColor={textPrimary}
        uppercase
        style={{ marginTop: 4, paddingHorizontal: 10, paddingVertical: 4 }}
      />

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
              <Text style={[styles.cardPropinaGreen, { color: accentOnSurface }]}>
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
  cardTotalBig: { fontSize: 22, fontFamily: FontFamily.extrabold, ...TabularNumbers },
  subInfoRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  cardSubCount: { fontSize: 12, fontFamily: FontFamily.medium },
  cardPropinaGreen: { fontSize: 12, fontFamily: FontFamily.semibold, ...TabularNumbers },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: 8,
  },
  finishBtnText: { fontSize: 11, fontFamily: FontFamily.bold },
});
