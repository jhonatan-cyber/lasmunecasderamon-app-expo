import React from "react";
import { BorderRadius } from '@/constants/spacing';
import { tabBarBottomPadding } from '@/constants/layout';
import { FontFamily } from '@/constants/fonts';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import VirtualizedList from "@/components/shared/VirtualizedList";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Event } from "@/hooks/types/administrativoTypes";
import { EventItemCard } from "./EventItemCard";
import { useRenderCount } from "@/hooks/useRenderCount";
import { useAccentColor } from '@/hooks/useAccentColor';

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

export const DetailedEventsModal = React.memo(function DetailedEventsModal({
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
  const { surfaceMuted, accentText } = useAccentColor();
  useRenderCount('DetailedEventsModal', { visible, eventCount: selectedEvents.length });
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlayBottom}>
        <View style={[styles.modalContent, { backgroundColor: bg }]}>
          <View style={[styles.dragHandle, { backgroundColor: surfaceMuted }]} />

            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
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
                { backgroundColor: surfaceMuted },
              ]}
              onPress={onClose}
              accessibilityLabel="Cerrar modal"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={textPrimary} />
            </Pressable>
          </View>

          <VirtualizedList
            data={selectedEvents}
            keyExtractor={(item: Event, index: number) => `${item.type}-${item.id}-${index}`}
            renderItem={({ item }: { item: Event }) => (
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
            estimatedItemSize={80}
            contentContainerStyle={{ padding: 20, paddingBottom: tabBarBottomPadding }}
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
                borderTopColor: borderColor,
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
                color={accentText}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.closeFooterBtnText, { color: accentText }]}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
</Modal>
  );
});
DetailedEventsModal.displayName = 'DetailedEventsModal';

const styles = StyleSheet.create({
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "80%",
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
    overflow: "hidden",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
  },
  modalTitle: { fontSize: 22, fontFamily: FontFamily.black },
  modalSubtitle: { fontSize: 14, marginTop: 4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyEvents: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyEventsText: { fontSize: 14, fontFamily: FontFamily.semibold, textAlign: "center" },
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
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFooterBtnText: { fontSize: 16, fontFamily: FontFamily.extrabold },
});
