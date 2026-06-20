import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type InfoBannerProps = {
  cuentaCodigo: string;
  clienteNombre: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

export function InfoBanner({
  cuentaCodigo,
  clienteNombre,
  accentColor,
  textPrimary,
  textSecondary,
  isDark,
}: InfoBannerProps) {
  return (
    <View
      style={[
        styles.infoBanner,
        {
          backgroundColor: isDark ? `${accentColor}10` : "#F0F9FF",
          borderColor: `${accentColor}30`,
        },
      ]}
    >
      <View
        style={[
          styles.catIconBox,
          {
            backgroundColor: `${accentColor}20`,
            marginRight: 15,
            width: 44,
            height: 44,
            borderRadius: 14,
          },
        ]}
      >
        <Ionicons name="information-circle" size={24} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: textPrimary }]}>
          Agregando a la cuenta {cuentaCodigo}
        </Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Cliente:{" "}
          <Text style={[styles.bold, { color: textPrimary }]}>
            {clienteNombre || "Sin cliente"}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  catIconBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  bold: {
    fontWeight: "700",
  },
});
