import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppModal as Modal } from "@/components/ui/AppModal";
import { FontSize, HitSlop, MIN_TOUCH_TARGET } from "@/constants/spacing";

export interface ServiceCardMenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface ServiceCardActionsProps {
  accentColor: string;
  accentTextColor: string;
  cardBg: string;
  textColor: string;
  textMutedColor: string;
  borderColor: string;
  menuItems: ServiceCardMenuItem[];
  onFinalizar: () => void;
}

/**
 * Un solo CTA primario (finalizar) y las acciones secundarias detrás de un
 * menú "⋯", para que la tarjeta no tenga dos botones compitiendo.
 */
export const ServiceCardActions: React.FC<ServiceCardActionsProps> = ({
  accentColor,
  accentTextColor,
  cardBg,
  textColor,
  textMutedColor,
  borderColor,
  menuItems,
  onFinalizar,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.actionsBox}>
      <Pressable
        style={({ pressed }) => [
          styles.finishBtn,
          { backgroundColor: accentColor, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={onFinalizar}
        accessibilityRole="button"
        accessibilityLabel="Finalizar servicio"
      >
        <Ionicons name="stop-circle-outline" size={18} color={accentTextColor} />
        <Text style={[styles.finishText, { color: accentTextColor }]}>Finalizar servicio</Text>
      </Pressable>

      {menuItems.length > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.moreBtn,
            { borderColor, backgroundColor: pressed ? `${textMutedColor}14` : "transparent" },
          ]}
          onPress={() => setMenuOpen(true)}
          hitSlop={HitSlop.sm}
          accessibilityRole="button"
          accessibilityLabel="Más acciones del servicio"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={textColor} />
        </Pressable>
      )}

      {menuOpen && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          {/* role=button aquí lo haría un <button> en web envolviendo los
              botones de la hoja (HTML inválido). "Cancelar" ya da el cierre. */}
          <Pressable
            style={styles.overlay}
            onPress={() => setMenuOpen(false)}
          >
            <Pressable
              style={[styles.sheet, { backgroundColor: cardBg, borderColor }]}
              onPress={() => { }}
            >
              <View style={[styles.handle, { backgroundColor: borderColor }]} />
              {menuItems.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setMenuOpen(false);
                    item.onPress();
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { borderBottomColor: borderColor, backgroundColor: pressed ? `${textMutedColor}14` : "transparent" },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <Ionicons name={item.icon} size={20} color={textColor} />
                  <Text style={[styles.menuItemText, { color: textColor }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={textMutedColor} />
                </Pressable>
              ))}
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setMenuOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar menú de acciones"
              >
                <Text style={[styles.cancelText, { color: textMutedColor }]}>Cancelar</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actionsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 15,
  },
  finishBtn: {
    flex: 1,
    height: MIN_TOUCH_TARGET,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  finishText: {
    fontWeight: "900",
    fontSize: FontSize.sm,
  },
  moreBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
