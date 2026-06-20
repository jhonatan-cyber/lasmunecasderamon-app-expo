import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface CuentaCardActionsProps {
  isPending: boolean;
  isPartialPending: boolean;
  hasTimer: boolean;
  accentColor: string;
  themeColors: {
    danger: string;
    warning: string;
  };
  isDark: boolean;
  onCobrar: () => void;
  onFinalizarTemporizador: () => void;
  onSolicitarAnulacion: () => void;
  onAgregar: () => void;
}

export const CuentaCardActions: React.FC<CuentaCardActionsProps> = ({
  isPending,
  isPartialPending,
  hasTimer,
  accentColor,
  themeColors,
  isDark,
  onCobrar,
  onFinalizarTemporizador,
  onSolicitarAnulacion,
  onAgregar,
}) => {
  if (isPending) {
    return (
      <View style={styles.actionsBox}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {hasTimer && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonOutline,
                {
                  backgroundColor: isDark
                    ? `${themeColors.warning}24`
                    : "#FFF7ED",
                  borderColor: `${themeColors.warning}55`,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={onFinalizarTemporizador}
            >
              <Ionicons
                name="stop-circle-outline"
                size={16}
                color={themeColors.warning}
              />
              <Text
                style={{ color: "#F59E0B", fontWeight: "900", fontSize: 12 }}
              >
                FINALIZAR
              </Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.actionButtonOutline,
              {
                backgroundColor: isDark
                  ? `${themeColors.danger}24`
                  : "#FEF2F2",
                borderColor: `${themeColors.danger}55`,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={onSolicitarAnulacion}
          >
            <Ionicons
              name="ban-outline"
              size={16}
              color={themeColors.danger}
            />
            <Text style={{ color: "#EF4444", fontWeight: "900", fontSize: 12 }}>
              ANULAR
            </Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButtonOutline,
              {
                backgroundColor: `${accentColor}10`,
                borderColor: `${accentColor}30`,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={onAgregar}
          >
            <Ionicons name="add" size={16} color={accentColor} />
            <Text
              style={{
                color: accentColor,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              AGREGAR
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButtonSolid,
              {
                backgroundColor: accentColor,
                shadowColor: accentColor,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={onCobrar}
          >
            <Ionicons name="cash-outline" size={16} color="#FFF" />
            <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 13 }}>
              COBRAR
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isPartialPending) {
    return (
      <View style={styles.actionsBox}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButtonSolid,
              {
                backgroundColor: accentColor,
                shadowColor: accentColor,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={onCobrar}
          >
            <Ionicons name="cash-outline" size={16} color="#FFF" />
            <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 13 }}>
              COBRAR SALDO
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  actionsBox: {
    gap: 10,
    marginTop: 15,
  },
  actionButtonOutline: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
  },
  actionButtonSolid: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    elevation: 2,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
