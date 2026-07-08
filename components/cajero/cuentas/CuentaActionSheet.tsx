import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

import { useCuentasScreen } from "@/hooks/useCuentasScreen";

type Screen = ReturnType<typeof useCuentasScreen>;

type Props = {
  screen: Screen;
  styles: Record<string, any>;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

export function CuentaActionSheet({
  screen,
  styles,
  accentColor,
  cardBg,
  textPrimary,
  textSecondary,
  isDark,
}: Props) {
  const { actionSheetVisible, activeCuenta, timers } = screen;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={actionSheetVisible}
      onRequestClose={() => screen.setActionSheetVisible(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => screen.setActionSheetVisible(false)}>
        <View style={[styles.actionSheet, { backgroundColor: cardBg }]}>
          <View style={styles.actionSheetHeader}>
            <View style={styles.actionSheetHandle} />
            <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>Opciones de Cuenta</Text>
            <Text style={[styles.actionSheetSub, { color: textSecondary }]}>Código: {activeCuenta?.codigo}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
            onPress={() => activeCuenta && screen.handleVerDetalles(String(activeCuenta.id_cuenta))}
          >
            <View style={[styles.actionIconBox, { backgroundColor: `${accentColor}15` }]}>
              <Ionicons name="eye-outline" size={22} color={accentColor} />
            </View>
            <Text style={[styles.actionText, { color: textPrimary }]}>Ver Detalles / Recibo</Text>
          </Pressable>
          {Number(activeCuenta?.estado) === 1 && (
            <>
              {timers.find((timer) => timer.tipoTransaccion === "cuenta" && String(timer.servicioId) === String(activeCuenta?.id_cuenta)) && (
                <Pressable
                  style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                  onPress={() => activeCuenta && screen.handleFinalizarTemporizador(activeCuenta)}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                    <Ionicons name="stop-circle-outline" size={22} color="#F59E0B" />
                  </View>
                  <Text style={[styles.actionText, { color: "#F59E0B" }]}>Finalizar Temporizador</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={() => activeCuenta && screen.handleSolicitarAnulacion(activeCuenta)}
              >
                <View style={[styles.actionIconBox, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                  <Ionicons name="ban-outline" size={22} color="#EF4444" />
                </View>
                <Text style={[styles.actionText, { color: "#EF4444" }]}>Solicitar Anulación</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={() => activeCuenta && screen.handleCobrarCuenta(activeCuenta)}
              >
                <View style={[styles.actionIconBox, { backgroundColor: `${accentColor}15` }]}>
                  <Ionicons name="cash-outline" size={22} color={accentColor} />
                </View>
                <Text style={[styles.actionText, { color: accentColor }]}>Cobrar Cuenta</Text>
              </Pressable>
            </>
          )}
          {Number(activeCuenta?.estado) === 4 && (
            <Pressable
              style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
              onPress={() => activeCuenta && screen.handleCobrarCuenta(activeCuenta)}
            >
              <View style={[styles.actionIconBox, { backgroundColor: `${accentColor}15` }]}>
                <Ionicons name="cash-outline" size={22} color={accentColor} />
              </View>
              <Text style={[styles.actionText, { color: accentColor }]}>Cobrar saldo</Text>
            </Pressable>
          )}
          <Pressable
            style={[
              styles.actionCancelBtn,
              { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderWidth: 1, borderColor: accentColor },
            ]}
            onPress={() => screen.setActionSheetVisible(false)}
          >
            <Text style={[styles.actionCancelText, { color: textPrimary }]}>Cancelar</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
