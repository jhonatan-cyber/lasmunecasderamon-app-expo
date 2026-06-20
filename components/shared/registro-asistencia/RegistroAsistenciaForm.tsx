import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface RegistroAsistenciaFormProps {
  codigo: string;
  onChangeCodigo: (text: string) => void;
  loading: boolean;
  onConfirmar: () => void;
  onScanQR: () => void;
  onSkip: () => void;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}

export const RegistroAsistenciaForm: React.FC<RegistroAsistenciaFormProps> = ({
  codigo,
  onChangeCodigo,
  loading,
  onConfirmar,
  onScanQR,
  onSkip,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
}) => (
  <>
    <View style={styles.inputSection}>
      <Text style={[styles.label, { color: textSecondary }]}>
        Código de Asistencia
      </Text>
      <View
        style={[styles.inputContainer, { backgroundColor: cardBg, borderColor }]}
      >
        <Ionicons name="key-outline" size={20} color={textSecondary} />
        <TextInput
          style={[styles.input, { color: textPrimary }]}
          placeholder="Ingresa el código"
          placeholderTextColor={textSecondary}
          value={codigo}
          onChangeText={onChangeCodigo}
          autoCapitalize="characters"
        />
      </View>
      <Pressable
        style={[styles.submitBtn, { backgroundColor: accentColor }]}
        onPress={onConfirmar}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.submitBtnText}>Confirmar</Text>
          </>
        )}
      </Pressable>
    </View>

    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
      <Text style={[styles.dividerText, { color: textSecondary }]}>O</Text>
      <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
    </View>

    <Pressable style={[styles.qrBtn, { borderColor }]} onPress={onScanQR}>
      <View style={[styles.qrIconCircle, { backgroundColor: accentColor }]}>
        <Ionicons name="qr-code-outline" size={24} color="white" />
      </View>
      <View style={styles.qrBtnText}>
        <Text style={[styles.qrBtnTitle, { color: textPrimary }]}>
          Escanear QR
        </Text>
        <Text style={[styles.qrBtnSubtitle, { color: textSecondary }]}>
          Apunta al código QR del cajero
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={textSecondary} />
    </Pressable>

    <Pressable style={[styles.skipBtn, { borderColor }]} onPress={onSkip}>
      <Text style={[styles.skipText, { color: textSecondary }]}>
        Continuar sin asistencia
      </Text>
    </Pressable>
  </>
);

const styles = StyleSheet.create({
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 9999,
    gap: 8,
  },
  submitBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: "600",
  },
  qrBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 9999,
    padding: 16,
  },
  qrIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  qrBtnText: {
    flex: 1,
    marginLeft: 14,
  },
  qrBtnTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  qrBtnSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  skipBtn: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
