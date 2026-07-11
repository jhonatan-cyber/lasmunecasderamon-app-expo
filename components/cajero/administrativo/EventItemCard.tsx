import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Event } from "@/hooks/useAdministrativoScreen";
import { useRenderCount } from "@/hooks/useRenderCount";

type EventItemCardProps = {
  item: Event;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  onPress: () => void;
  getEventLabel: (item: Event) => string;
  getStatusLabel: (item: Event) => string;
};

export function EventItemCard({
  item,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  onPress,
  getEventLabel,
  getStatusLabel,
}: EventItemCardProps) {
  useRenderCount('EventItemCard', { eventId: item.id, eventType: item.type });
  const isAnticipo = item.type === "anticipo";
  const iconName =
    item.type === "venta"
      ? "fast-food"
      : item.type === "propina"
        ? "wallet"
        : item.type === "comision"
          ? "star"
          : item.type === "asistencia"
            ? "calendar"
            : "cash";
  const iconColor = isAnticipo ? "#EF4444" : "#10B981";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.eventItem,
        {
          backgroundColor: cardBg,
          borderColor,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: `${iconColor}20` },
        ]}
      >
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={18}
          color={iconColor}
        />
      </View>
      <View style={styles.eventInfo}>
        <Text style={[styles.eventTitle, { color: textPrimary }]}>
          {getEventLabel(item)}{" "}
          {item.codigo && item.codigo !== "TIPS"
            ? `- ${item.codigo}`
            : ""}
        </Text>
        <Text
          style={[styles.eventTime, { color: textSecondary }]}
        >
          {new Date(item.date).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={[
            styles.eventPrice,
            { color: isAnticipo ? "#EF4444" : "#10B981" },
          ]}
        >
          {isAnticipo ? "-" : "+"}${item.amount.toLocaleString()}
        </Text>
        <Text
          style={[
            styles.statusMiniText,
            { color: textSecondary },
          ]}
        >
          {getStatusLabel(item)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  eventInfo: { flex: 1, marginLeft: 15 },
  eventTitle: { fontSize: 15, fontWeight: "700" },
  eventTime: { fontSize: 12, marginTop: 2 },
  eventPrice: { fontSize: 16, fontWeight: "800" },
  statusMiniText: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
});
