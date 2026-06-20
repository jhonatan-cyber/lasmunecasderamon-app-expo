import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ServiceCardHeaderProps {
  roomName?: string;
  servicioCode?: string;
  createdAt?: string;
  statusColor: string;
  statusText: string;
  accentColor: string;
  textColor: string;
  textMutedColor: string;
  formatDateTime: (dateStr?: string) => string;
}

export const ServiceCardHeader: React.FC<ServiceCardHeaderProps> = ({
  roomName,
  servicioCode,
  createdAt,
  statusColor,
  statusText,
  accentColor,
  textColor,
  textMutedColor,
  formatDateTime,
}) => (
  <View style={styles.cardHeader}>
    <View style={styles.roomBadge}>
      <View style={[styles.iconBox, { backgroundColor: accentColor + "15" }]}>
        <Ionicons name="bed" size={18} color={accentColor} />
      </View>
      <View>
        <Text style={[styles.roomName, { color: textColor }]}>
          {roomName || "Servicio de barra"}
        </Text>
        <Text style={[styles.serviceCode, { color: textMutedColor }]}>
          Codigo : #{servicioCode || "S/N"}
        </Text>
        <Text style={[styles.serviceCode, { color: textMutedColor, fontSize: 10, marginTop: 2 }]}>
          {formatDateTime(createdAt)}
        </Text>
      </View>
    </View>
    <View style={[styles.statusBadge, { backgroundColor: statusColor + "10" }]}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <Text style={[styles.statusLabel, { color: statusColor }]}>{statusText}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  roomName: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  serviceCode: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "900",
  },
});
