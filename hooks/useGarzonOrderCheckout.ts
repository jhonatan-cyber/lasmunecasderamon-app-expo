import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useConfigValue } from "@/hooks/useConfigValue";
import { useBaucherPhoto } from "@/hooks/useBaucherPhoto";
import { showToast } from "@/utils/toast-lazy";
import { getOutbox } from "@/services/outbox";
import logger from "@/utils/logger";
import { generateCode } from "@/components/cajero/nuevo-servicio/helpers";
import type { MetodoPagoPedido } from "@/types/cart";

export function useGarzonOrderCheckout() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const metodoPago = useCartStore((state) => state.metodoPago);
  const setMetodoPagoInStore = useCartStore((state) => state.setMetodoPago);
  const baucherFotoInStore = useCartStore((state) => state.baucherFoto);
  const setBaucherFoto = useCartStore((state) => state.setBaucherFoto);
  const setTipPercentage = useCartStore((state) => state.setTipPercentage);
  const setTopeAcompanamiento = useCartStore((state) => state.setTopeAcompanamiento);
  const propinaPct = Number(
    useConfigValue("facturacion", "propina_venta", "10"),
  );
  const topeAcompanamiento = Number(
    useConfigValue("comisiones", "tope_precio_acompañamiento", "0"),
  );
  const [baucherPromptVisible, setBaucherPromptVisible] = useState(false);
  const baucherPromptShown = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const submitInFlight = useRef(false);
  const { baucherFoto, takeBaucherPhoto } = useBaucherPhoto("Pedido", {
    baucherFoto: baucherFotoInStore,
    setBaucherFoto,
  });

  useEffect(() => {
    setTipPercentage(propinaPct);
  }, [propinaPct, setTipPercentage]);

  useEffect(() => {
    setTopeAcompanamiento(topeAcompanamiento);
  }, [setTopeAcompanamiento, topeAcompanamiento]);

  const setMetodoPago = useCallback(
    (metodo: MetodoPagoPedido) => {
      setMetodoPagoInStore(metodo);
      if (
        metodo === "transferencia" &&
        !baucherFoto &&
        !baucherPromptShown.current
      ) {
        baucherPromptShown.current = true;
        setBaucherPromptVisible(true);
      }
    },
    [baucherFoto, setMetodoPagoInStore],
  );

  const submitOrder = async () => {
    if (submitInFlight.current) return;
    const state = useCartStore.getState();
    if (state.cart.length === 0 || !user) return;

    for (const item of state.cart) {
      const hasCommission = (item.product.commission || 0) > 0;
      if (hasCommission && item.selectedHostesses.length === 0) {
        showToast({
          type: "error",
          text1: "Falta Anfitriona",
          text2: `Debes asignar al menos una anfitriona a "${item.product.name}"`,
        });
        return;
      }
    }

    if (state.metodoPago === "transferencia" && !state.baucherFoto) {
      setBaucherPromptVisible(true);
      return;
    }

    submitInFlight.current = true;
    setSubmitting(true);
    try {
      const codigo = generateCode();
      const buildResult = useCartStore.getState().buildOrderPayload({
        meseroId: user.id,
        codigo,
        clienteId: state.selectedClientId,
        metodoPago: state.metodoPago,
        baucherFoto:
          state.metodoPago === "transferencia" ? state.baucherFoto : null,
        device_date: new Date().toISOString(),
      });

      if (!buildResult.success) {
        const problemaDeBaucher = buildResult.errors.some((error) =>
          error.includes("baucher_foto"),
        );
        showToast({
          type: "error",
          text1: problemaDeBaucher ? "La foto del baucher no sirve" : "Datos inválidos",
          text2: problemaDeBaucher
            ? "Supera el tamaño permitido. Vuelve a tomarla y el pedido se envía sin problema."
            : buildResult.errors.join("; "),
        });
        if (problemaDeBaucher && state.metodoPago === "transferencia") {
          void takeBaucherPhoto();
        }
        setSubmitting(false);
        return;
      }

      logger.debug("[DEBUG] Enviando pedido", { orderData: buildResult.data });

      const intent = await getOutbox().enqueueAndSend({
        type: "order.create",
        payload: buildResult.data,
        label: `Pedido ${codigo} · ${state.cart.reduce((acc, item) => acc + item.quantity, 0)} ítem(s)`,
      });

      if (intent.status === "aplicada") {
        showToast({
          type: "success",
          text1: "Pedido Enviado",
          text2: "El pedido ha sido registrado correctamente",
        });
      } else if (intent.status === "fallida") {
        throw new Error(intent.lastError || "El servidor rechazó el pedido");
      } else {
        showToast({
          type: "info",
          text1: "Pedido guardado en el dispositivo",
          text2: "Se enviará automáticamente cuando vuelva la conexión",
          visibilityTime: 4000,
        });
      }

      useCartStore.getState().clearCart();
      baucherPromptShown.current = false;
      setBaucherPromptVisible(false);
      router.back();
    } catch (err: any) {
      showToast({
        type: "error",
        text1: "Error",
        text2: err.message || "Error de conexión",
      });
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  return {
    metodoPago,
    setMetodoPago,
    baucherFoto,
    takeBaucherPhoto,
    baucherPromptVisible,
    setBaucherPromptVisible,
    propinaPct,
    submitting,
    submitOrder,
  };
}