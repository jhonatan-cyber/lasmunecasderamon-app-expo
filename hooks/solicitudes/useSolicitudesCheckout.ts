import { useCallback, useState } from "react";
import { apiClientSafe } from "@/api/client";
import { eventBus } from "@/utils/eventBus";
import { blockOffline } from "@/utils/offlineGuard";
import type { Cliente } from "@lasmunecasderamon/types";
import type { MetodoPago } from "@/types/api";
import type {
  PedidoItem,
  SolicitudItem,
} from "@/hooks/types/solicitudesTypes";
import {
  buildAccountPayload,
  buildSalesSubmitPayload,
  type PedidoDetalle,
} from "@/hooks/utils/solicitudesPayload";

type ShowToast = (
  title: string,
  message: string,
  type?: "success" | "error",
) => void;

interface UseSolicitudesCheckoutParams {
  cajaAbierta: boolean;
  propinaPct: number;
  fetchSolicitudes: (isManual?: boolean) => Promise<void>;
  removeSolicitudLocally: (
    id: string,
    tipo: "pedido" | "solicitud" | "anticipo",
  ) => void;
  showToast: ShowToast;
}

/**
 * Cobro de pedidos y traspaso a cuenta. Mantiene su propio estado en un solo
 * lugar para que la pantalla de solicitudes no cargue con el detalle de pago.
 */
export function useSolicitudesCheckout({
  cajaAbierta,
  propinaPct,
  fetchSolicitudes,
  removeSolicitudLocally,
  showToast,
}: UseSolicitudesCheckoutParams) {
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<SolicitudItem | null>(
    null,
  );
  const [pedidoDetails, setPedidoDetails] = useState<PedidoDetalle[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("");
  const [metodoPagoAdicional, setMetodoPagoAdicional] = useState<MetodoPago>("");
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [agregarPropina, setAgregarPropina] = useState(false);
  const [selectedMinutesPedido, setSelectedMinutesPedido] = useState<number>(30);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  const closeCheckout = useCallback(() => {
    setCheckoutModalVisible(false);
    setSelectedPedido(null);
    setPedidoDetails([]);
    setSelectedClient(null);
    setMetodoPago("");
    setMetodoPagoAdicional("");
    setAgregarPropina(false);
    setSelectedMinutesPedido(30);
  }, []);

  /** Abre el cobro de un pedido y precarga detalles, cliente y propina. */
  const openPedidoCheckout = useCallback(
    async (itemInfo: SolicitudItem, id: string) => {
      setSelectedPedido(itemInfo);
      setMetodoPago("");
      setMetodoPagoAdicional("");
      setAgregarPropina(false);
      setCheckoutModalVisible(true);
      setLoadingDetails(true);
      setSelectedMinutesPedido(30);

      try {
        const res = await apiClientSafe<PedidoDetalle[]>(
          `/orders/detail?id=${id}`,
        );
        if (res.success) {
          setPedidoDetails(res.data);
          const cId =
            res.data?.[0]?.cliente_id ||
            itemInfo.id_cliente ||
            itemInfo.cliente_id;
          if (cId) {
            const cRes = await apiClientSafe<Cliente>(
              `/clients?id=${cId}`,
            ).catch(() => ({ success: false, data: undefined }));
            if (cRes.success && cRes.data) {
              setSelectedClient(cRes.data);
              if (Number(cRes.data.saldo || 0) > 0) setMetodoPago("prepago");
            }
          } else {
            setSelectedClient(null);
          }
          if (res.data.length > 0 && (res.data[0].propina ?? 0) > 0)
            setAgregarPropina(true);
        } else {
          showToast("Error", "No se pudieron cargar los detalles", "error");
          closeCheckout();
        }
      } catch {
        showToast("Error", "No se pudieron cargar los detalles", "error");
        closeCheckout();
      } finally {
        setLoadingDetails(false);
      }
    },
    [closeCheckout, showToast],
  );

  const handleCheckoutSubmit = useCallback(async () => {
    if (!selectedPedido) return;
    // El checkout del pedido crea la venta en el servidor.
    if (!blockOffline("solicitud")) return;
    setSubmittingCheckout(true);

    const pedidoItem = selectedPedido as PedidoItem;
    const payload = buildSalesSubmitPayload({
      pedido: pedidoItem,
      detalles: pedidoDetails,
      cliente: selectedClient,
      metodoPago,
      metodoPagoAdicional,
      propinaPct,
      agregarPropina,
      duracionMinutos: selectedMinutesPedido,
    });

    try {
      const res = await apiClientSafe("/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        showToast("Éxito", "Pedido cobrado y cerrado.", "success");
        removeSolicitudLocally(pedidoItem.id_pedido ?? "", "pedido");
        closeCheckout();
        eventBus.emit("refresh_requests");
      } else {
        showToast("Error", res.message || "Error al procesar", "error");
        fetchSolicitudes();
      }
    } catch (err: any) {
      showToast("Error", err.message || "Error base de datos", "error");
      fetchSolicitudes();
    } finally {
      setSubmittingCheckout(false);
    }
  }, [
    agregarPropina,
    closeCheckout,
    fetchSolicitudes,
    metodoPago,
    metodoPagoAdicional,
    pedidoDetails,
    removeSolicitudLocally,
    selectedClient,
    selectedMinutesPedido,
    selectedPedido,
    showToast,
    propinaPct,
  ]);

  const handleAddToCuenta = useCallback(async () => {
    if (!selectedPedido || !selectedClient) return;
    if (!cajaAbierta) {
      showToast(
        "Caja Cerrada",
        "No puedes crear cuentas sin una caja abierta.",
        "error",
      );
      return;
    }

    // Crear la cuenta escribe en caja: necesita el servidor.
    if (!blockOffline("cuenta")) return;

    setSubmittingCheckout(true);
    try {
      const payload = buildAccountPayload({
        codigo: `CUENTA-${Date.now()}`,
        pedido: selectedPedido as PedidoItem,
        detalles: pedidoDetails,
        cliente: selectedClient,
        duracionMinutos: selectedMinutesPedido,
      });

      const res = await apiClientSafe("/accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        showToast(
          "Éxito",
          `Pedido registrado en cuenta de ${selectedClient.name} ${selectedClient.lastName}`,
          "success",
        );
        removeSolicitudLocally(
          (selectedPedido as PedidoItem).id_pedido ?? "",
          "pedido",
        );
        closeCheckout();
        eventBus.emit("refresh_requests");
      } else {
        showToast("Error", res.message || "Error al crear la cuenta", "error");
        fetchSolicitudes();
      }
    } catch (err: any) {
      showToast("Error", err.message || "Error al procesar", "error");
      fetchSolicitudes();
    } finally {
      setSubmittingCheckout(false);
    }
  }, [
    cajaAbierta,
    closeCheckout,
    fetchSolicitudes,
    pedidoDetails,
    removeSolicitudLocally,
    selectedClient,
    selectedMinutesPedido,
    selectedPedido,
    showToast,
  ]);

  return {
    checkoutModalVisible,
    selectedPedido,
    pedidoDetails,
    loadingDetails,
    metodoPago,
    metodoPagoAdicional,
    selectedClient,
    agregarPropina,
    selectedMinutesPedido,
    submittingCheckout,
    setCheckoutModalVisible,
    setSelectedPedido,
    setPedidoDetails,
    setLoadingDetails,
    setMetodoPago,
    setMetodoPagoAdicional,
    setSelectedClient,
    setAgregarPropina,
    setSelectedMinutesPedido,
    setSubmittingCheckout,
    openPedidoCheckout,
    handleCheckoutSubmit,
    handleAddToCuenta,
    closeCheckout,
  };
}
