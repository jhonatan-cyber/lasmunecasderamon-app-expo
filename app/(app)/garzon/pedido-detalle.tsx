import { ShotMixerSelector } from "@/components/shared/ShotMixerSelector";
import { FontFamily } from '@/constants/fonts';
import { useCartStore } from "@/store/cartStore";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PremiumHeader } from "@/components/ui/PremiumHeader";

export default function PedidoDetalleScreen() {
  const { accentColor, bg, cardBg, borderColor, textPrimary, accentOnSurface } =
    useAccentColor();
  const router = useRouter();
  const cart = useCartStore((state) => state.cart);
  const getTotal = useCartStore((state) => state.getTotal);
  const updateItemMixer = useCartStore((state) => state.updateItemMixer);
  const updateItemBottleMixers = useCartStore((state) => state.updateItemBottleMixers);
  const cartTotal = getTotal();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PremiumHeader
        title="Detalle del pedido"
        subtitle={`${cart.reduce((sum, item) => sum + item.quantity, 0)} unidades`}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {cart.map((item) => (
          <View
            key={item.product.id}
            style={[styles.itemRow, { borderBottomColor: borderColor }]}
          >
            <OrderLineInfo item={item} />
            <ShotMixerSelector
              compact
              bottle={item.product.tipo_venta !== "shot"}
              items={[
                {
                  ...item.product,
                  nombre: item.product.name,
                  cantidad: item.quantity,
                },
              ]}
              onChange={(_, mixer) =>
                updateItemMixer(item.product.id, mixer)
              }
              onChangeBottle={(_, sabores) =>
                updateItemBottleMixers(item.product.id, sabores)
              }
            />
            {item.product.commission > 0 && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
                style={{ paddingVertical: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar anfitriona para ${item.product.name}`}
              >
                <Text style={{ color: accentOnSurface }}>
                  Seleccionar anfitriona
                </Text>
              </Pressable>
            )}
          </View>
        ))}
        <Text style={[styles.totalText, { color: textPrimary }]}>
          Total: ${cartTotal.toLocaleString("es-CL")}
        </Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 50 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backTextContainer}
          accessibilityRole="button"
          accessibilityLabel="Volver al pedido"
        >
          <Text style={[styles.backText, { color: accentColor }]}>Volver al pedido</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  itemRow: {
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  totalText: {
    fontSize: 20,
    fontFamily: FontFamily.extrabold,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  backTextContainer: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    textAlign: "center",
  },
});
