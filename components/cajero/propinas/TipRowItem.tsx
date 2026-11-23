import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { Propina } from "@/hooks/usePropinasScreen";
import { rotateColor } from "@/utils/colors";
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';

interface TipRowItemProps {
  item: Propina;
  index: number;
  onPress: (item: Propina) => void;
  formatDate: (dateStr: string) => string;
  formatTime: (dateStr: string) => string;

  isDark: boolean;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export const TipRowItem: React.FC<TipRowItemProps> = ({
  item,
  index,
  onPress,
  formatDate,
  formatTime,
  isDark,
  accentColor,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
}) => {
    const { accentOnSurface, surfaceMuted, accentColor: themeAccent } = useAccentColor();
  const isPendiente = item.estado === 1;
  const idNum =
    typeof item.id_detalle_propina === "string"
      ? item.id_detalle_propina.split("-").pop()?.substring(0, 2)
      : item.id_detalle_propina;
  const itemAccent = rotateColor(
    accentColor,
    ((Number(idNum) || index) % 10) * 36,
  );

  // Glow neón en modo oscuro con el color rotado por propina
  const cardNeonGlow = isDark ? {
    shadowColor: itemAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderColor: itemAccent,
    borderWidth: 1.5,
  } : {};

  return (
    <AnimatedView
      from={{ opacity: 0, translateY: 30 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "spring", delay: Math.min(index, 4) * 30 }}
    >
      <Pressable onPress={() => onPress(item)} accessibilityRole="button" accessibilityLabel={`Ver detalle de propina ${item.codigo_venta || ''}`}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }, cardNeonGlow]}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.indexBadge,
                { backgroundColor: surfaceMuted },
              ]}
            >
              <Text style={[styles.indexText, { color: textPrimary }]}>
                {index + 1}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {item.codigo_venta ? (
                <View
                  style={[
                    styles.ventaBadge,
                    { backgroundColor: surfaceMuted },
                  ]}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={12}
                    color={accentOnSurface}
                  />
                  <Text
                    style={[
                      styles.ventaText,
                      { color: accentOnSurface },
                    ]}
                  >
                    Código: {item.codigo_venta}
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: surfaceMuted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: isPendiente ? accentOnSurface : themeAccent,
                    },
                  ]}
                >
                  {isPendiente ? "Por cobrar" : "Cobrada"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.dateRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={textSecondary}
              />
              <Text style={[styles.dateText, { color: textPrimary }]}>
                {formatDate(item.fecha_crea)}
              </Text>
              <Text style={[styles.timeText, { color: textSecondary }]}>
                {formatTime(item.fecha_crea)}
              </Text>
            </View>

            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: textSecondary }]}>
                Mi parte
              </Text>
              <Text
                style={[
                  styles.amountValue,
                  { color: isPendiente ? itemAccent : accentColor },
                ]}
              >
                ${(item.monto || 0).toLocaleString()}
              </Text>
            </View>

            {item.propina_fecha_crea && item.estado === 0 ? (
              <View style={styles.paymentRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={accentOnSurface}
                />
                <Text style={[styles.paymentText, { color: textSecondary }]}>
                  Pagada: {formatDate(item.propina_fecha_crea)}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                marginTop: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: accentOnSurface, fontSize: 11, fontFamily: FontFamily.bold }}
              >
                Ver detalles de venta
              </Text>
              <Ionicons name="chevron-forward" size={12} color={accentOnSurface} />
            </View>
          </View>
        </View>
      </Pressable>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: BorderRadius.card, padding: 16, marginTop: 10, borderWidth: 1, overflow: 'hidden' },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: { fontSize: 14, fontFamily: FontFamily.bold },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: 12, fontFamily: FontFamily.semibold },
  ventaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  ventaText: { fontSize: 11, fontFamily: FontFamily.semibold },
  cardBody: {},
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  dateText: { fontSize: 14 },
  timeText: { fontSize: 13, marginLeft: 6 },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 14, fontFamily: FontFamily.semibold },
  amountValue: { fontSize: 20, fontFamily: FontFamily.extrabold },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  paymentText: { fontSize: 12 },
});
