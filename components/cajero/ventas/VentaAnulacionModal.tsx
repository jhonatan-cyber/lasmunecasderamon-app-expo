import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Venta } from "./types";

type VentaAnulacionModalProps = {
  visible: boolean;
  onClose: () => void;
  activeVenta: Venta | null;
  motivoAnulacion: string;
  montoAnulacion: string;
  anulandoVenta: boolean;
  onMotivoChange: (text: string) => void;
  onMontoChange: (text: string) => void;
  onAnular: () => void;
  formatMontoInput: (value: string) => string;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  dangerColor: string;
};

export function VentaAnulacionModal({
  visible,
  onClose,
  activeVenta,
  motivoAnulacion,
  montoAnulacion,
  anulandoVenta,
  onMotivoChange,
  onMontoChange,
  onAnular,
  formatMontoInput,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  dangerColor,
}: VentaAnulacionModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.anulacionModalCard,
            {
              backgroundColor: cardBg,
              borderColor: `${accentColor}35`,
            },
          ]}
        >
          <View style={styles.anulacionHeader}>
            <View
              style={[
                styles.anulacionIconBox,
                { backgroundColor: "#EF444415" },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={24}
                color={dangerColor}
              />
            </View>
            <Text style={[styles.anulacionTitle, { color: textPrimary }]}>
              Solicitar Anulación
            </Text>
            <Text style={[styles.anulacionSubtitle, { color: textSecondary }]}>
              Completa el monto y el motivo para enviar la solicitud al
              administrador.
            </Text>
          </View>

          <View
            style={[
              styles.anulacionInfoCard,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <Text style={[styles.anulacionInfoText, { color: textSecondary }]}>
              Código:{" "}
              <Text style={{ color: textPrimary, fontWeight: "800" }}>
                {activeVenta?.codigo || "-"}
              </Text>
            </Text>
            <Text style={[styles.anulacionInfoText, { color: textSecondary }]}>
              Cliente:{" "}
              <Text style={{ color: textPrimary, fontWeight: "800" }}>
                {activeVenta?.cliente_nombre || "Sin cliente"}
              </Text>
            </Text>
            <Text style={[styles.anulacionInfoText, { color: textSecondary }]}>
              Total referencia:{" "}
              <Text style={{ color: accentColor, fontWeight: "900" }}>
                ${Number(activeVenta?.total || 0).toLocaleString("es-CL")}
              </Text>
            </Text>
          </View>

          <View style={styles.anulacionField}>
            <Text style={[styles.anulacionLabel, { color: textPrimary }]}>
              Monto solicitado *
            </Text>
            <TextInput
              value={montoAnulacion}
              onChangeText={(value) =>
                onMontoChange(formatMontoInput(value))
              }
              placeholder="Ingresa el monto"
              placeholderTextColor={textSecondary}
              keyboardType="numeric"
              editable={!anulandoVenta}                style={[
                styles.anulacionInput,
                {
                  color: textPrimary,
                  borderColor,
                  backgroundColor: isDark ? "#0F0F0F" : "#FFFFFF",
                },
              ]}
            />
          </View>

          <View style={styles.anulacionField}>
            <Text style={[styles.anulacionLabel, { color: textPrimary }]}>
              Motivo de la anulación *
            </Text>
            <TextInput
              value={motivoAnulacion}
              onChangeText={onMotivoChange}
              placeholder="Describe el motivo de la anulación"
              placeholderTextColor={textSecondary}
              editable={!anulandoVenta}
              multiline
              textAlignVertical="top"                style={[
                styles.anulacionTextarea,
                {
                  color: textPrimary,
                  borderColor,
                  backgroundColor: isDark ? "#0F0F0F" : "#FFFFFF",
                },
              ]}
            />
          </View>

          <View style={styles.anulacionActions}>
            <Pressable
              onPress={onClose}
              disabled={anulandoVenta}
              style={[
                styles.anulacionSecondaryBtn,
                {
                  borderColor: `${accentColor}55`,
                  backgroundColor: accentColor + "10",
                },
              ]}
            >
              <Text
                style={[
                  styles.anulacionSecondaryText,
                  { color: accentColor },
                ]}
              >
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={onAnular}
              disabled={anulandoVenta}
              style={[
                styles.anulacionPrimaryBtn,
                {
                  backgroundColor: accentColor,
                  opacity: anulandoVenta ? 0.7 : 1,
                },
              ]}
            >
              <Text style={styles.anulacionPrimaryText}>
                {anulandoVenta ? "Enviando..." : "Enviar Solicitud"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  anulacionModalCard: {
    width: "92%",
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 16,
  },
  anulacionHeader: {
    alignItems: "center",
    gap: 8,
  },
  anulacionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  anulacionTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  anulacionSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  anulacionInfoCard: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  anulacionInfoText: {
    fontSize: 14,
    fontWeight: "600",
  },
  anulacionField: {
    gap: 8,
  },
  anulacionLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  anulacionInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
  },
  anulacionTextarea: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "600",
  },
  anulacionActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  anulacionSecondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  anulacionSecondaryText: {
    fontSize: 15,
    fontWeight: "800",
  },
  anulacionPrimaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  anulacionPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
