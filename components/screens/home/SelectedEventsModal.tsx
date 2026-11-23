import Ionicons from "@expo/vector-icons/Ionicons";
import { BorderRadius } from '@/constants/spacing';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { formatCurrency, formatDate } from "@/utils/format";
import { getEventLabel } from "./eventLabels";

interface SelectedEventsModalProps {
  visible: boolean;
  events: any[];
  bg: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary?: string;
  accentColor: string;
  onClose: () => void;
  onSelect: (event: any) => void;
}

const TYPE_ICONS: Record<string, string> = {
  asistencia: "calendar",
  anticipo: "wallet",
  propina: "heart",
  comision: "star",
  servicio: "ribbon",
  venta: "cart",
  hora_extra: "time",
  gratificacion: "gift",
};

export function SelectedEventsModal({
  visible,
  events,
  bg,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  accentColor,
  onClose,
  onSelect,
}: SelectedEventsModalProps) {
  const secondary = textSecondary ?? textPrimary;
  const summary = `${events.length} evento${events.length === 1 ? "" : "s"} en los días seleccionados`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} />
          </View>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: textPrimary }]}>
                Eventos
              </Text>
              <Text
                style={[styles.subtitle, { color: secondary }]}
                numberOfLines={1}
              >
                {summary}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar eventos"
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: cardBg,
                  borderColor,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="close" size={22} color={textPrimary} />
            </Pressable>
          </View>
          <FlatList<any>
            data={events}
            keyExtractor={(item: any, index: number) => `${item?.id ?? index}-${index}`}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={32} color={secondary} />
                <Text style={[styles.emptyText, { color: secondary }]}>
                  No hay eventos en los días seleccionados.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isAnticipo = item?.type === "anticipo";
              const color = isAnticipo ? accentColor : accentColor;
              const icon = TYPE_ICONS[item?.type] ?? "ellipse";
              const eventDate = item?.date ? formatDate(item.date) : null;

              return (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [
                    styles.eventItem,
                    {
                      backgroundColor: cardBg,
                      borderColor,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={[styles.eventIcon, { backgroundColor: `${color}18` }]}>
                    <Ionicons
                      name={icon as keyof typeof Ionicons.glyphMap}
                      size={17}
                      color={color}
                    />
                  </View>
                  <View style={styles.eventInfo}>
                    <Text
                      style={[styles.eventLabel, { color: textPrimary }]}
                      numberOfLines={1}
                    >
                      {getEventLabel(item)}
                    </Text>
                    {eventDate && (
                      <Text style={[styles.eventMeta, { color: secondary }]}>
                        {eventDate}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.eventAmount, { color }]}>
                    {formatCurrency(item.amount)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={secondary} />
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "80%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: 10,
  },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  eventMeta: {
    fontSize: 11,
    fontWeight: "500",
  },
  eventAmount: {
    fontSize: 15,
    fontWeight: "900",
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
