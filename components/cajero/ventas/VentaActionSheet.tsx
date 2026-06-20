import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Venta } from "./types";

type VentaActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  activeVenta: Venta | null;
  onVerDetalles: () => void;
  onSolicitarAnulacion: () => void;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  dangerColor: string;
};

export function VentaActionSheet({
  visible,
  onClose,
  activeVenta,
  onVerDetalles,
  onSolicitarAnulacion,
  accentColor,
  cardBg,
  textPrimary,
  textSecondary,
  dangerColor,
}: VentaActionSheetProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View
          style={[
            styles.actionSheet,
            {
              backgroundColor: cardBg,
              borderColor: `${accentColor}40`,
              borderWidth: 1,
              borderBottomWidth: 0,
            },
          ]}
        >
          <View style={styles.actionSheetHeader}>
            <View
              style={[
                styles.actionSheetHandle,
                { backgroundColor: `${accentColor}60` },
              ]}
            />
            <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>
              Opciones de Venta
            </Text>
            <Text style={[styles.actionSheetSub, { color: textSecondary }]}>
              Código: {activeVenta?.codigo}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.actionItem,
              pressed && styles.actionItemPressed,
            ]}
            onPress={onVerDetalles}
          >
            <View
              style={[
                styles.actionIconBox,
                { backgroundColor: accentColor + "15" },
              ]}
            >
              <Ionicons name="eye-outline" size={24} color={accentColor} />
            </View>
            <Text style={[styles.actionText, { color: textPrimary }]}>
              Ver Detalles
            </Text>
          </Pressable>
          {activeVenta?.estado !== 0 && activeVenta?.estado !== 3 && (
            <Pressable
              style={({ pressed }) => [
                styles.actionItem,
                pressed && styles.actionItemPressed,
              ]}
              onPress={onSolicitarAnulacion}
            >
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: "#EF444415" },
                ]}
              >
                <Ionicons name="trash-outline" size={22} color={dangerColor} />
              </View>
              <Text style={[styles.actionText, { color: dangerColor }]}>
                Solicitar Anulación
              </Text>
            </Pressable>
          )}
          <Pressable
            style={[
              styles.actionCancelBtn,
              {
                backgroundColor: accentColor + "15",
                borderWidth: 1,
                borderColor: accentColor + "40",
              },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.actionCancelText, { color: accentColor }]}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  actionSheetHeader: { alignItems: "center", marginBottom: 20 },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 15,
  },
  actionSheetTitle: { fontSize: 20, fontWeight: "900" },
  actionSheetSub: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    gap: 16,
  },
  actionItemPressed: { backgroundColor: "rgba(0,0,0,0.03)" },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: { fontSize: 16, fontWeight: "700" },
  actionCancelBtn: {
    height: 56,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  actionCancelText: { fontSize: 16, fontWeight: "800" },
});
