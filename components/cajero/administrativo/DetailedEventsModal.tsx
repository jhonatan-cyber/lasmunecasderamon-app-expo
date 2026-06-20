import React from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Event } from "@/hooks/useAdministrativoScreen";
import { EventItemCard } from "./EventItemCard";

type DetailedEventsModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedDatesCount: number;
  selectedEvents: Event[];
  bg: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  accentColor: string;
  onSelectEvent: (item: Event) => void;
  getEventLabel: (item: Event) => string;
  getStatusLabel: (item: Event) => string;
};

export function DetailedEventsModal({
  visible,
  onClose,
  selectedDatesCount,
  selectedEvents,
  bg,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  accentColor,
  onSelectEvent,
  getEventLabel,
  getStatusLabel,
}: DetailedEventsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlayBottom}>
        <View style={[styles.modalContent, { backgroundColor: bg }]}>
          <View style={styles.dragHandle} />

          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Eventos Detallados
              </Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                {selectedDatesCount}{" "}
                {selectedDatesCount === 1
                  ? "día seleccionado"
                  : "días seleccionados"}{" "}
                · {selectedEvents.length} eventos
              </Text>
            </View>
            <Pressable
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? "#374151" : "#F1F5F9" },
              ]}
              onPress={onClose}
              accessibilityLabel="Cerrar modal"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={textPrimary} />
            </Pressable>
          </View>

          <FlatList
            data={selectedEvents}
            keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
            renderItem={({ item }) => (
              <EventItemCard
                item={item}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                onPress={() => onSelectEvent(item)}
                getEventLabel={getEventLabel}
                getStatusLabel={getStatusLabel}
              />
            )}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.emptyEvents}>
                <Ionicons
                  name="calendar-outline"
                  size={48}
                  color={textSecondary}
                />
                <Text
                  style={[styles.emptyEventsText, { color: textSecondary }]}
                >
                  Sin eventos en los días seleccionados
                </Text>
              </View>
            }
          />

          <View
            style={[
              styles.modalFooter,
              {
                backgroundColor: bg,
                borderTopColor: isDark ? "#374151" : "#E5E7EB",
              },
            ]}
          >
            <Pressable
              style={[
                styles.closeFooterBtn,
                { backgroundColor: accentColor },
              ]}
              onPress={onClose}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.closeFooterBtnText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "80%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  modalHeader: {
    paddingHorizontal: 25,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#37415120",
  },
  modalTitle: { fontSize: 22, fontWeight: "900" },
  modalSubtitle: { fontSize: 14, marginTop: 4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyEvents: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyEventsText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  closeFooterBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFooterBtnText: { fontSize: 16, fontWeight: "800", color: "#FFF" },
});
