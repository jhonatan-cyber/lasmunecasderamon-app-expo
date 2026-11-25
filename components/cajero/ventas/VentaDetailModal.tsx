import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { parseDateSafe } from "@/utils/timeUtils";
import { statusColors, statusLabels } from "./constants";
import type { VentaDetail } from "./types";
import { VentaOrigenSection } from "./VentaOrigenSection";
import { VentaDistribucionSection } from "./VentaDistribucionSection";
import { VentaProductosList } from "./VentaProductosList";
import { BaucherFoto } from "@/components/shared/BaucherFoto";
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontFamily } from '@/constants/fonts';
import { paymentIconFor } from '@/components/ui/StatusBadge';
import { DetailSheet } from '@/components/ui/DetailSheet';

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
    const { accentOnSurface, surfaceMuted } = useAccentColor();
  return (
    <DetailSheet
      visible={visible}
      onClose={onClose}
      title="Detalle de Venta"
      code={selectedVenta ? `Código: ${selectedVenta.codigo}` : undefined}
      status={
        selectedVenta
          ? {
              label: statusLabels[selectedVenta.estado] || 'VENTA',
              color: statusColors[selectedVenta.estado] || accentColor,
            }
          : undefined
      }
      loading={loadingDetail}
      loadingLabel="Cargando detalle de la venta…"
      footerActions={[{ label: 'Cerrar Detalles', onPress: onClose }]}
      height="85%"
      accessibilityLabel="Detalle de venta"
    >
      {selectedVenta && (
        <>
                  <VentaOrigenSection
                    selectedVenta={selectedVenta}
                    accentColor={accentColor}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                  />

                  {}
                  <View style={{ marginBottom: 25, paddingHorizontal: 4 }}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View style={[styles.infoCard, { backgroundColor: surfaceMuted, borderColor }]}>
                        <Text style={[styles.infoLabel, { color: textSecondary }]}>Fecha y Hora</Text>
                        <Text style={[styles.infoValue, { color: textPrimary }]}>
                          {parseDateSafe(selectedVenta.fecha_crea).toLocaleString("es-CL", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      <View style={[styles.infoCard, { backgroundColor: surfaceMuted, borderColor }]}>
                        <Text style={[styles.infoLabel, { color: textSecondary }]}>Método Pago</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Ionicons
                            name={paymentIconFor(selectedVenta.metodo_pago)}
                            size={16}
                            color={accentOnSurface}
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
                    <View style={[styles.clienteCard, { backgroundColor: surfaceMuted, borderColor }]}>
                      <View style={[styles.avatarCircle, { backgroundColor: surfaceMuted }]}>
                        <Ionicons name="person-outline" size={18} color={textPrimary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.clienteName, { color: textPrimary }]} numberOfLines={1}>
                          {selectedVenta.cliente_nombre || "Sin Cliente"}
                        </Text>
                        <Text style={{ fontSize: 10, color: textSecondary }} numberOfLines={1}>
                          {selectedVenta.habitacion_nombre || "General"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedVenta.baucher_foto && (
                    <View style={{ marginBottom: 25 }}>
                      <Text style={[styles.sectionLabel, { color: textSecondary }]}>Comprobante</Text>
                      <BaucherFoto
                        endpoint={`/sales/${selectedVenta.id}/baucher`}
                        descripcion={`Venta ${selectedVenta.codigo}`}
                      />
                    </View>
                  )}

                  {}
                  <VentaDistribucionSection
                    selectedVenta={selectedVenta}
                    accentColor={accentColor}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
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
                  <View style={[styles.summaryCard, { backgroundColor: surfaceMuted, borderColor }]}>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal</Text>
                      <Text style={[styles.summaryValue, { color: textPrimary }]}>
                        ${(selectedVenta.total - (selectedVenta.propina || 0)).toLocaleString("es-CL")}
                      </Text>
                    </View>
                    {selectedVenta.propina > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Propina</Text>
                        <Text style={[styles.summaryValue, { color: accentOnSurface }]}>
                          +${Number(selectedVenta.propina).toLocaleString("es-CL")}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />
                    <View style={styles.summaryTotalRow}>
                      <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL</Text>
                      <Text style={[styles.totalValue, { color: accentOnSurface }]}>
                        ${Number(selectedVenta.total).toLocaleString("es-CL")}
                      </Text>
                    </View>
                  </View>
        </>
      )}
    </DetailSheet>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  detailModal: { borderTopLeftRadius: BorderRadius.card, borderTopRightRadius: BorderRadius.card, padding: 24, borderWidth: 1, borderBottomWidth: 0, height: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitleText: { fontSize: 24, fontFamily: FontFamily.black, letterSpacing: -0.5 },
  modalSubText: { fontSize: 12, fontFamily: FontFamily.semibold, flexShrink: 1, minWidth: 0 },
  closeBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  statusBadgeDetail: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusTextDetail: { fontSize: 11, fontFamily: FontFamily.black },
  infoCard: { flex: 1, padding: 16, borderRadius: BorderRadius.card, borderWidth: 1 },
  infoLabel: { fontSize: 10, fontFamily: FontFamily.black, textTransform: "uppercase", marginBottom: 6 },
  infoValue: { fontSize: 14, fontFamily: FontFamily.extrabold },
  sectionLabel: { fontSize: 11, fontFamily: FontFamily.black, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  clienteCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: BorderRadius.card, borderWidth: 1 },
  avatarCircle: { width: 32, height: 32, borderRadius: BorderRadius.full, justifyContent: "center", alignItems: "center" },
  clienteName: { fontSize: 14, fontFamily: FontFamily.extrabold, flexShrink: 1 },
  summaryCard: { marginTop: 20, padding: 20, borderRadius: BorderRadius.card, borderWidth: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontFamily: FontFamily.bold },
  summaryValue: { fontFamily: FontFamily.extrabold },
  summaryDivider: { height: 1, marginVertical: 10 },
  summaryTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 16, fontFamily: FontFamily.black },
  totalValue: { fontSize: 24, fontFamily: FontFamily.black },
  modalCloseBtn: { height: 56, borderRadius: BorderRadius.full, justifyContent: "center", alignItems: "center", marginTop: 10, marginBottom: 20 },
  modalCloseBtnText: { fontSize: 16, fontFamily: FontFamily.extrabold },
});
