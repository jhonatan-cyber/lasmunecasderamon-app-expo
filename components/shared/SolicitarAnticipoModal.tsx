import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface SolicitarAnticipoModalProps {
  visible: boolean;
  onClose: () => void;
  monto: string;
  onMontoChange: (text: string) => void;
  motivo: string;
  onMotivoChange: (text: string) => void;
  loading: boolean;
  onSolicitar: () => void;
  montoMaximo: number;
  tieneSolicitudPendiente: boolean;
  montoAsistencia: number;
  montoComisiones: number;
  montoPropinas: number;
  canRequestAdvance: boolean;
  formatCurrency: (amount: any) => string;
  accentColor: string;
  isDark: boolean;
  bg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export const SolicitarAnticipoModal: React.FC<SolicitarAnticipoModalProps> = ({
  visible,
  onClose,
  monto,
  onMontoChange,
  motivo,
  onMotivoChange,
  loading,
  onSolicitar,
  montoMaximo,
  tieneSolicitudPendiente,
  montoAsistencia,
  montoComisiones,
  montoPropinas,
  canRequestAdvance,
  formatCurrency,
  accentColor,
  isDark,
  bg,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalContent, { backgroundColor: bg }]}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textPrimary }]}>
            Solicitar Anticipo
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={textSecondary} />
          </Pressable>
        </View>
        <View
          style={[
            styles.disponibleCard,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <View style={styles.disponibleHeader}>
            <Text style={[styles.disponibleLabel, { color: textSecondary }]}>
              TOTAL POR COBRAR
            </Text>
            {tieneSolicitudPendiente && (
              <View
                style={[
                  styles.pendingBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(245,158,11,0.2)"
                      : "#FEF3C7",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pendingBadgeText,
                    { color: isDark ? "#FBBF24" : "#B45309" },
                  ]}
                >
                  Pendiente
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.disponibleMonto,
              { color: tieneSolicitudPendiente ? "#F59E0B" : accentColor },
            ]}
          >
            ${formatCurrency(montoMaximo)}
          </Text>
          <View style={styles.desgloseRow}>
            {[
              { label: "Asistencia", value: montoAsistencia },
              { label: "Comisiones", value: montoComisiones },
              { label: "Propinas", value: montoPropinas },
            ].map(({ label, value }) => (
              <View key={label} style={styles.desgloseItem}>
                <Text style={[styles.desgloseLabel, { color: textSecondary }]}>
                  {label}
                </Text>
                <Text style={[styles.desgloseValue, { color: textPrimary }]}>
                  ${formatCurrency(value)}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: cardBg, color: textPrimary, borderColor },
            !canRequestAdvance && styles.inputDisabled,
          ]}
          placeholder={`Monto (máx. $${formatCurrency(montoMaximo)})`}
          placeholderTextColor={textSecondary}
          keyboardType="numeric"
          value={monto}
          onChangeText={onMontoChange}
          editable={canRequestAdvance}
        />
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: cardBg, color: textPrimary, borderColor },
            !canRequestAdvance && styles.inputDisabled,
          ]}
          placeholder="Motivo (opcional)"
          placeholderTextColor={textSecondary}
          multiline
          numberOfLines={3}
          value={motivo}
          onChangeText={onMotivoChange}
          editable={canRequestAdvance}
        />
        <Pressable
          style={[
            styles.submitButton,
            { backgroundColor: accentColor },
            (loading || !canRequestAdvance) && { opacity: 0.7 },
          ]}
          onPress={onSolicitar}
          disabled={loading || !canRequestAdvance}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {!canRequestAdvance
                ? "Sin monto disponible"
                : "Enviar Solicitud"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  disponibleCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  disponibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  disponibleLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  disponibleMonto: {
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 16,
  },
  desgloseRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  desgloseItem: {
    alignItems: "center",
  },
  desgloseLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
  },
  desgloseValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  inputDisabled: {
    opacity: 0.45,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
