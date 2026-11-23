import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { styles } from "../AnticiposScreen.styles";
import { formatCurrency } from "./anticiposUtils";
import { useAccentColor } from '@/hooks/useAccentColor';

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
  efectivoEnCaja: number;
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
  efectivoEnCaja,
  monto,
  motivo,
  sendingRequest,
  canRequestAdvance,
  onChangeMonto,
  onChangeMotivo,
  onClose,
  onSubmit,
}: SolicitarAnticipoModalProps) {
    const { accentOnSurface, surfaceMuted } = useAccentColor();
  return (
    <Modal
      avoidKeyboard={false}
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar solicitud de anticipo" />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: bg, maxHeight: "92%" },
          ]}
        >
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              Solicitar Anticipo
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Cerrar solicitud de anticipo">
              <Ionicons name="close" size={22} color={textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
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
                      backgroundColor: surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pendingBadgeText,
                      { color: accentOnSurface },
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
                { color: tieneSolicitudPendiente ? accentOnSurface : accentColor },
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
          <View
            style={[
              styles.cajaCard,
              { backgroundColor: cardBg, borderColor },
            ]}
          >
            <View style={styles.cajaHeader}>
              <Ionicons name="wallet-outline" size={18} color={textSecondary} />
              <Text style={[styles.cajaLabel, { color: textSecondary }]}>
                EFECTIVO EN CAJA
              </Text>
            </View>
            <Text style={[styles.cajaMonto, { color: accentOnSurface }]}>
              ${formatCurrency(efectivoEnCaja)}
            </Text>
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
            accessibilityRole="button"
            accessibilityLabel="Enviar solicitud de anticipo"
          >
            {sendingRequest ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {!canRequestAdvance
                  ? "Sin monto disponible"
                  : "Enviar Solicitud"}
              </Text>
            )}
          </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
