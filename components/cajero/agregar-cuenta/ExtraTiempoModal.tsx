import React from "react";
import { Modal, ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ExtraTiempoModalProps = {
  visible: boolean;
  onClose: () => void;
  extraTiempo: number;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  onSelectOption: (time: number) => void;
};

export function ExtraTiempoModal({
  visible,
  onClose,
  extraTiempo,
  cardBg,
  borderColor,
  textPrimary,
  onSelectOption,
}: ExtraTiempoModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContentWide, { backgroundColor: cardBg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              Tiempo Extra
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={26} color={textPrimary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Pressable
              style={[
                styles.timeOption,
                { borderColor: extraTiempo === 0 ? "#3B82F6" : borderColor },
              ]}
              onPress={() => onSelectOption(0)}
            >
              <Text
                style={[
                  styles.timeOptionText,
                  { color: extraTiempo === 0 ? "#3B82F6" : textPrimary },
                ]}
              >
                Sin tiempo extra
              </Text>
            </Pressable>
            {[5, 10, 15, 20, 25, 30, 45, 60].map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.timeOption,
                  { borderColor: extraTiempo === t ? "#3B82F6" : borderColor },
                ]}
                onPress={() => onSelectOption(t)}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    { color: extraTiempo === t ? "#3B82F6" : textPrimary },
                  ]}
                >
                  + {t} minutos
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContentWide: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    height: "auto",
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "900" },
  timeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  timeOptionText: { fontSize: 15, fontWeight: "700" },
});
