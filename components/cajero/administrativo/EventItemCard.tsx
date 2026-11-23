import React from "react";
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Event } from "@/hooks/types/administrativoTypes";
import { useRenderCount } from "@/hooks/useRenderCount";
import { useAccentColor } from '@/hooks/useAccentColor';

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
  const { accentColor, accentOnSurface } = useAccentColor();
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
  const iconColor = isAnticipo ? accentColor : accentOnSurface;

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
            { color: isAnticipo ? accentColor : accentOnSurface },
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
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  eventInfo: { flex: 1, marginLeft: 15 },
  eventTitle: { fontSize: 15, fontFamily: FontFamily.bold },
  eventTime: { fontSize: 12, marginTop: 2 },
  eventPrice: { fontSize: 16, fontFamily: FontFamily.extrabold },
  statusMiniText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    marginTop: 4,
  },
});
