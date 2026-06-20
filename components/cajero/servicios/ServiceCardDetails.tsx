import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ServiceCardDetailsProps {
  anfitrionas?: string;
  clienteNombre?: string;
  waiterName?: string;
  textColor: string;
  textMutedColor: string;
}

export const ServiceCardDetails: React.FC<ServiceCardDetailsProps> = ({
  anfitrionas,
  clienteNombre,
  waiterName,
  textColor,
  textMutedColor,
}) => (
  <View style={styles.detailsList}>
    <View style={styles.detailItem}>
      <Ionicons name="people" size={14} color={textMutedColor} />
      <Text style={[styles.detailText, { color: textColor }]}>
        <Text style={styles.bold}>Anfitrionas: </Text>
        {anfitrionas || "No asignadas"}
      </Text>
    </View>
    <View style={styles.detailItem}>
      <Ionicons name="person" size={14} color={textMutedColor} />
      <Text style={[styles.detailText, { color: textColor }]}>
        <Text style={styles.bold}>Cliente: </Text>
        {(clienteNombre && clienteNombre !== 'Sin cliente') ? clienteNombre : "Sin cliente registrado"}
      </Text>
    </View>
    <View style={styles.detailItem}>
      <Ionicons name="create-outline" size={14} color={textMutedColor} />
      <Text style={[styles.detailText, { color: textColor }]}>
        <Text style={styles.bold}>Registrado por: </Text>
        {waiterName || "Admin"}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  detailsList: {
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    flex: 1,
  },
  bold: {
    fontWeight: '800',
  },
});
