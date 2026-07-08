import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { parseDateSafe } from "@/utils/timeUtils";
import { DetailSkeleton } from "./VentasSkeletonComponent";
import { statusColors, statusLabels, payMethodIcons } from "./constants";
import type { VentaDetail } from "./types";
import { VentaOrigenSection } from "./VentaOrigenSection";
import { VentaDistribucionSection } from "./VentaDistribucionSection";
import { VentaProductosList } from "./VentaProductosList";

type VentaDetailModalProps = {
  visible: boolean;
  onClose: () => void;
  loadingDetail: boolean;
  selectedVenta: VentaDetail | null;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

export function VentaDetailModal({
  visible,
  onClose,
  loadingDetail,
  selectedVenta,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
}: VentaDetailModalProps) {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor }]}>
          {loadingDetail ? (
            <DetailSkeleton borderColor={borderColor} />
          ) : (
            selectedVenta && (
              <View style={{ flex: 1 }}>
                {}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle de Venta</Text>
                    <Text style={[styles.modalSubText, { color: textSecondary }]}>Código: {selectedVenta.codigo}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={[
                        styles.statusBadgeDetail,
                        {
                          backgroundColor: (statusColors[selectedVenta.estado] || accentColor) + "15",
                          borderColor: (statusColors[selectedVenta.estado] || accentColor) + "30",
                        },
                      ]}
                    >
                      <Text style={[styles.statusTextDetail, { color: statusColors[selectedVenta.estado] || accentColor }]}>
                        {(statusLabels[selectedVenta.estado] || "VENTA").toUpperCase()}
                      </Text>
                    </View>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                      <Ionicons name="close" size={24} color={textSecondary} />
                    </Pressable>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                  {}
                  <VentaOrigenSection
                    selectedVenta={selectedVenta}
                    accentColor={accentColor}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    isDark={isDark}
                  />

                  {}
                  <View style={{ marginBottom: 25, paddingHorizontal: 4 }}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View style={[styles.infoCard, { backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5", borderColor }]}>
                        <Text style={[styles.infoLabel, { color: textSecondary }]}>Fecha y Hora</Text>
                        <Text style={[styles.infoValue, { color: textPrimary }]}>
                          {parseDateSafe(selectedVenta.fecha_crea).toLocaleString("es-CL", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      <View style={[styles.infoCard, { backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5", borderColor }]}>
                        <Text style={[styles.infoLabel, { color: textSecondary }]}>Método Pago</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons
                            name={(payMethodIcons[selectedVenta.metodo_pago] || "wallet") as keyof typeof Ionicons.glyphMap}
                            size={16}
                            color={accentColor}
                          />
                          <Text style={[styles.infoValue, { color: textPrimary }]}>
                            {String(selectedVenta.metodo_pago || "EFECTIVO").toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {}
                  <View style={{ marginBottom: 25 }}>
                    <Text style={[styles.sectionLabel, { color: textSecondary }]}>Cliente</Text>
                    <View style={[styles.clienteCard, { backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5", borderColor }]}>
                      <View style={[styles.avatarCircle, { backgroundColor: isDark ? "#333" : "#DDD" }]}>
                        <Ionicons name="person-outline" size={18} color={textPrimary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.clienteName, { color: textPrimary }]} numberOfLines={1}>
                          {selectedVenta.cliente_nombre || "Sin Cliente"}
                        </Text>
                        <Text style={{ fontSize: 10, color: textSecondary }}>
                          {selectedVenta.habitacion_nombre || "General"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {}
                  <VentaDistribucionSection
                    selectedVenta={selectedVenta}
                    accentColor={accentColor}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    isDark={isDark}
                  />

                  {}
                  <VentaProductosList
                    selectedVenta={selectedVenta}
                    accentColor={accentColor}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    isDark={isDark}
                  />

                  {}
                  <View style={[styles.summaryCard, { backgroundColor: isDark ? "#111" : "#F9F9F9", borderColor }]}>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal</Text>
                      <Text style={[styles.summaryValue, { color: textPrimary }]}>
                        ${(selectedVenta.total - (selectedVenta.propina || 0)).toLocaleString("es-CL")}
                      </Text>
                    </View>
                    {selectedVenta.propina > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Propina</Text>
                        <Text style={[styles.summaryValue, { color: "#10B981" }]}>
                          +${Number(selectedVenta.propina).toLocaleString("es-CL")}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />
                    <View style={styles.summaryTotalRow}>
                      <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL</Text>
                      <Text style={[styles.totalValue, { color: accentColor }]}>
                        ${Number(selectedVenta.total).toLocaleString("es-CL")}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <Pressable style={[styles.modalCloseBtn, { backgroundColor: accentColor }]} onPress={onClose}>
                  <Text style={styles.modalCloseBtnText}>Cerrar Detalles</Text>
                </Pressable>
              </View>
            )
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  detailModal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, borderWidth: 1, borderBottomWidth: 0, height: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitleText: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  modalSubText: { fontSize: 12, fontWeight: "600" },
  closeBtn: { width: 40, height: 40, borderRadius: 9999, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  statusBadgeDetail: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusTextDetail: { fontSize: 11, fontWeight: "900" },
  infoCard: { flex: 1, padding: 15, borderRadius: 18, borderWidth: 1 },
  infoLabel: { fontSize: 10, fontWeight: "900", textTransform: "uppercase", marginBottom: 6 },
  infoValue: { fontSize: 14, fontWeight: "800" },
  sectionLabel: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  clienteCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  clienteName: { fontSize: 14, fontWeight: "800" },
  summaryCard: { marginTop: 20, padding: 20, borderRadius: 24, borderWidth: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontWeight: "700" },
  summaryValue: { fontWeight: "800" },
  summaryDivider: { height: 1, marginVertical: 10 },
  summaryTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 16, fontWeight: "900" },
  totalValue: { fontSize: 24, fontWeight: "900" },
  modalCloseBtn: { height: 56, borderRadius: 9999, justifyContent: "center", alignItems: "center", marginTop: 10, marginBottom: 20 },
  modalCloseBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
