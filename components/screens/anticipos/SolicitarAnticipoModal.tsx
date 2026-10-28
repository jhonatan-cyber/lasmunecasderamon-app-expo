import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { styles } from "../AnticiposScreen.styles";
import { formatCurrency } from "./anticiposUtils";

interface SolicitarAnticipoModalProps {
  visible: boolean;
  isDark: boolean;
  bg: string;
  cardBg: string;
  borderColor: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  montoMaximo: number;
  montoAsistencia: number;
  montoComisiones: number;
  montoPropinas: number;
  tieneSolicitudPendiente: boolean;
  monto: string;
  motivo: string;
  sendingRequest: boolean;
  canRequestAdvance: boolean;
  onChangeMonto: (text: string) => void;
  onChangeMotivo: (text: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function SolicitarAnticipoModal({
  visible,
  isDark,
  bg,
  cardBg,
  borderColor,
  accentColor,
  textPrimary,
  textSecondary,
  montoMaximo,
  montoAsistencia,
  montoComisiones,
  montoPropinas,
  tieneSolicitudPendiente,
  monto,
  motivo,
  sendingRequest,
  canRequestAdvance,
  onChangeMonto,
  onChangeMotivo,
  onClose,
  onSubmit,
}: SolicitarAnticipoModalProps) {
  return (
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
            onChangeText={onChangeMonto}
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
            onChangeText={onChangeMotivo}
            editable={canRequestAdvance}
          />
          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: accentColor },
              (sendingRequest || !canRequestAdvance) && { opacity: 0.7 },
            ]}
            onPress={onSubmit}
            disabled={sendingRequest || !canRequestAdvance}
          >
            {sendingRequest ? (
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
}
