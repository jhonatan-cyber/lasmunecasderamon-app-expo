import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useCuentasScreen } from "@/hooks/useCuentasScreen";
import { formatAmountInput } from "@/utils/money";

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

export function CuentaAnulacionModal({
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
    anulacionModalVisible,
    anulacionCuenta,
    anulacionMotivo,
    anulacionMonto,
    anulacionSubmitting,
  } = screen;

  const closeModal = () => {
    if (anulacionSubmitting) return;
    screen.setAnulacionModalVisible(false);
    screen.setAnulacionCuenta(null);
    screen.setAnulacionMotivo("");
    screen.setAnulacionMonto("");
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={anulacionModalVisible}
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor, height: "auto", maxHeight: "80%" }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitleText, { color: textPrimary }]}>Solicitar anulacion</Text>
              <Text style={[styles.modalSubText, { color: textSecondary }]}>Cuenta {anulacionCuenta?.codigo}</Text>
            </View>
            <Pressable onPress={closeModal} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={[styles.infoBannerCobro, { backgroundColor: isDark ? "#111827" : "#F9FAFB", borderColor }]}>
              <View style={styles.summaryRowCobro}>
                <Text style={[styles.summaryLabelCobro, { color: textSecondary }]}>Cliente</Text>
                <Text style={[styles.summaryValCobro, { color: textPrimary, fontSize: 16 }]}>
                  {anulacionCuenta?.cliente_nombre || "Sin registrar"}
                </Text>
              </View>
              <View style={[styles.summaryRowCobro, { marginTop: 10 }]}>
                <Text style={[styles.summaryLabelCobro, { color: textSecondary }]}>Monto total de la cuenta</Text>
                <Text style={[styles.summaryValCobro, { color: accentColor }]}>
                  ${Number(anulacionCuenta?.total || 0).toLocaleString("es-CL")}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 18, gap: 10 }}>
              <Text style={{ color: textPrimary, fontWeight: "800", fontSize: 14 }}>Monto a solicitar</Text>
              <TextInput
                value={anulacionMonto}
                onChangeText={(value) => screen.setAnulacionMonto(formatAmountInput(value))}
                placeholder="Ingresa el monto"
                placeholderTextColor={textSecondary}
                keyboardType="number-pad"
                editable={!anulacionSubmitting}
                style={{
                  height: 52,
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  borderWidth: 1,
                  borderColor,
                  backgroundColor: isDark ? "#111111" : "#FFFFFF",
                  color: textPrimary,
                  fontSize: 15,
                  fontWeight: "700",
                }}
              />
              <Text style={{ color: textSecondary, fontSize: 12 }}>
                Total de referencia: ${Number(anulacionCuenta?.total || 0).toLocaleString("es-CL")}
              </Text>
            </View>

            <View style={{ marginTop: 18, gap: 10 }}>
              <Text style={{ color: textPrimary, fontWeight: "800", fontSize: 14 }}>Motivo de anulacion</Text>
              <TextInput
                value={anulacionMotivo}
                onChangeText={screen.setAnulacionMotivo}
                placeholder="Escribe el motivo de la solicitud"
                placeholderTextColor={textSecondary}
                multiline
                textAlignVertical="top"
                editable={!anulacionSubmitting}
                style={{
                  minHeight: 120,
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor,
                  backgroundColor: isDark ? "#111111" : "#FFFFFF",
                  color: textPrimary,
                  fontSize: 15,
                }}
              />
            </View>
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <Pressable
              onPress={closeModal}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "transparent",
                borderWidth: 1.5,
                borderColor: accentColor,
              }}
            >
              <Text style={{ color: textPrimary, fontWeight: "800" }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={screen.handleEnviarSolicitudAnulacion}
              disabled={anulacionSubmitting}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: accentColor,
                opacity: anulacionSubmitting ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>
                {anulacionSubmitting ? "Enviando..." : "Enviar solicitud"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
