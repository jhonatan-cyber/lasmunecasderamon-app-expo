import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ServiceCardActionsProps {
  showEdit: boolean;
  warningColor: string;
  dangerColor: string;
  onEditar: () => void;
  onFinalizar: () => void;
}

export const ServiceCardActions: React.FC<ServiceCardActionsProps> = ({
  showEdit,
  warningColor,
  dangerColor,
  onEditar,
  onFinalizar,
}) => (
  <View style={styles.actionsBox}>
    {showEdit ? (
      <Pressable
        style={[styles.editActionBtn, { backgroundColor: warningColor }]}
        onPress={onEditar}
        accessibilityLabel="Editar servicio"
        accessibilityRole="button"
      >
        <Ionicons name="create" size={16} color="#FFF" />
        <Text style={styles.btnText}>EDITAR</Text>
      </Pressable>
    ) : null}
    <Pressable
      style={[styles.finishActionBtn, { backgroundColor: dangerColor }]}
      onPress={onFinalizar}
      accessibilityLabel="Finalizar servicio"
      accessibilityRole="button"
    >
      <Ionicons name="stop" size={16} color="#FFF" />
      <Text style={styles.btnText}>FINALIZAR</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  actionsBox: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  editActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  finishActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
  },
});
