import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { PaymentMethodSelect } from "@/components/cajero/forms/PaymentMethodSelect";
import { TipCheckbox } from "@/components/cajero/forms/TipCheckbox";
import { useCuentasScreen } from "@/hooks/useCuentasScreen";

type Screen = ReturnType<typeof useCuentasScreen>;

type Props = {
  screen: Screen;
  styles: Record<string, any>;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

export function CuentaCobroModal({
  screen,
  styles,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
}: Props) {
  const {
    selectedCuenta,
    cobroModalVisible,
    cobroMetodoPago,
    cobroEnableTip,
    cobroSubmitting,
    cobroClienteNombreCompleto,
    cobroClienteSaldo,
    showPrepagoCobro,
    cobroTotals,
    impuestoPropinaPct,
  } = screen;

  const selectedPaymentMethod = cobroMetodoPago || "efectivo";

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={cobroModalVisible}
      onRequestClose={() => screen.setCobroModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor, height: "auto", maxHeight: "80%" }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitleText, { color: textPrimary }]}>Cobrar Cuenta</Text>
              <Text style={[styles.modalSubText, { color: textSecondary }]}>
                Resumen de pago para {selectedCuenta?.codigo}
              </Text>
              <Text style={[styles.modalSubText, { color: textPrimary, marginTop: 4, fontWeight: "800" }]}>
                Cliente: {cobroClienteNombreCompleto}
              </Text>
            </View>
            <Pressable onPress={() => screen.setCobroModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={[styles.infoBannerCobro, { backgroundColor: isDark ? "#111827" : "#F9FAFB", borderColor }]}>
              <View style={styles.summaryRowCobro}>
                <Text style={[styles.summaryLabelCobro, { color: textSecondary }]}>Subtotal Cuenta</Text>
                <Text style={[styles.summaryValCobro, { color: textPrimary }]}>
                  ${cobroTotals.subtotal.toLocaleString()}
                </Text>
              </View>

              <TipCheckbox enabled={cobroEnableTip} onToggle={screen.setCobroEnableTip} tipAmount={cobroTotals.tip} />

              {cobroMetodoPago === 'tarjeta' && cobroTotals.cargoTarjeta > 0 && (
                <View style={styles.summaryRowCobro}>
                  <Text style={[styles.summaryLabelCobro, { color: textSecondary }]}>
                    Cargo tarjeta ({impuestoPropinaPct}%)
                  </Text>
                  <Text style={[styles.summaryValCobro, { color: accentColor }]}>
                    +${cobroTotals.cargoTarjeta.toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={[styles.dividerCobro, { backgroundColor: borderColor }]} />

              <View style={styles.summaryRowCobro}>
                <Text style={[styles.totalLabelCobro, { color: textPrimary }]}>TOTAL A COBRAR</Text>
                <Text style={[styles.totalValCobro, { color: accentColor }]}>
                  ${cobroTotals.total.toLocaleString()}
                </Text>
              </View>
            </View>

            {showPrepagoCobro && (
              <View style={{ marginBottom: 15, padding: 12, backgroundColor: `${accentColor}10`, borderRadius: 12, borderWidth: 1, borderColor: `${accentColor}30` }}>
                <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                  Saldo Prepago Cliente
                </Text>
                <Text style={{ color: textPrimary, fontSize: 20, fontWeight: "900", marginTop: 2 }}>
                  ${cobroClienteSaldo.toLocaleString("es-CL")}
                </Text>
              </View>
            )}

            <PaymentMethodSelect
              selectedMethod={selectedPaymentMethod}
              showPrepago={showPrepagoCobro}
              onSelect={screen.setCobroMetodoPago}
            />

            <Pressable
              style={[styles.cobrarSubmitBtn, { backgroundColor: accentColor }, cobroSubmitting && { opacity: 0.7 }]}
              onPress={screen.handleConfirmarCobro}
              disabled={cobroSubmitting}
            >
              <Text style={styles.cobrarSubmitText}>{cobroSubmitting ? "Procesando..." : "Confirmar cobro"}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.cobrarCancelBtn,
                { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderWidth: 1, borderColor: accentColor },
              ]}
              onPress={() => screen.setCobroModalVisible(false)}
              disabled={cobroSubmitting}
            >
              <Text style={[styles.cobrarCancelBtnText, { color: textPrimary }]}>Cerrar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
