import { useCallback, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { apiClientSafe } from "@/api/client";
import { cuentasService } from '@/services';

interface DetallePago {
  producto_id: string;
  cantidad: number;
  precio: number;
  sub_total: number;
}

interface SalesSubmitPayload {
  id_pedido: string;
  cliente_id: string | number | null;
  metodo_pago: string;
  metodo_pago_adicional?: string;
  monto_prepago: number;
  duracion_habitacion: number;
  detalles: DetallePago[];
  sub_total: number;
  total: number;
  ganancia_tipo: string;
  ganancia_monto: number;
  comision_por_cliente: boolean;
  recompensa_binario: boolean;
  recompensa_activos: boolean;
  recompensa_activos_monto: number;
  ganancia_anfitriona: number;
  ganancia_garzon: number;
  ganancia_local: number;
  ganancia_empresa: number;
  total_comision: number;
  tiempo: number;
  usuarios: never[];
  propina?: number;
}

interface UseCheckoutSolicitudParams {
  selectedPedido: any;
  pedidoDetails: any[];
  selectedClient: any;
  agregarPropina: boolean;
  selectedMinutesPedido: number;
  metodoPago: string;
  metodoPagoAdicional: string;
  cajaAbierta: boolean;
  showToast: (title: string, message: string, type?: "success" | "error") => void;
  closeCheckout: () => void;
  removeSolicitudLocally: (id: string, tipo: "pedido" | "solicitud" | "anticipo") => void;
  fetchSolicitudes: (isManual?: boolean) => Promise<void>;
}

export function useCheckoutSolicitud({
  selectedPedido,
  pedidoDetails,
  selectedClient,
  agregarPropina,
  selectedMinutesPedido,
  metodoPago,
  metodoPagoAdicional,
  cajaAbierta,
  showToast,
  closeCheckout,
  removeSolicitudLocally,
  fetchSolicitudes,
}: UseCheckoutSolicitudParams) {
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  const handleCheckoutSubmit = useCallback(async () => {
    if (!selectedPedido) return;
    setSubmittingCheckout(true);

    const propinaOriginal = Number(selectedPedido.propina || pedidoDetails?.[0]?.propina || 0);
    const subtotalBase = Number(
      selectedPedido.subtotal ?? Math.max(0, Number(selectedPedido.total || 0) - propinaOriginal),
    );
    const propinaFinal = propinaOriginal > 0 ? propinaOriginal : (agregarPropina ? subtotalBase * 0.10 : 0);
    const totalConPropina = subtotalBase + propinaFinal;
    const saldoPrepago = selectedClient ? Number(selectedClient.saldo || 0) : 0;

    let montoPrepago = 0;
    if (metodoPago === "prepago" && selectedClient && saldoPrepago > 0) {
      montoPrepago = Math.min(totalConPropina, saldoPrepago);
    }

    const clienteId = selectedPedido.cliente_id || pedidoDetails?.[0]?.cliente_id || selectedClient?.id || null;

    const payload: SalesSubmitPayload = {
      id_pedido: selectedPedido.id_pedido,
      cliente_id: clienteId,
      metodo_pago: metodoPago,
      metodo_pago_adicional: metodoPagoAdicional || undefined,
      monto_prepago: montoPrepago,
      duracion_habitacion: selectedMinutesPedido,
      detalles: pedidoDetails.map((d: any) => ({
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        precio: d.precio,
        sub_total: d.subtotal_detalle || (d.cantidad * d.precio),
      })),
      sub_total: subtotalBase,
      total: totalConPropina,
      ganancia_tipo: "fijo",
      ganancia_monto: 0,
      comision_por_cliente: false,
      recompensa_binario: false,
      recompensa_activos: false,
      recompensa_activos_monto: 0,
      ganancia_anfitriona: 0,
      ganancia_garzon: 0,
      ganancia_local: 0,
      ganancia_empresa: 0,
      total_comision: 0,
      tiempo: selectedMinutesPedido,
      usuarios: [],
    };

    if (propinaFinal > 0) {
      payload.propina = propinaFinal;
    }

    try {
      const res = await apiClientSafe("/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        showToast("Éxito", "Pedido cobrado y cerrado.", "success");
        removeSolicitudLocally(selectedPedido.id_pedido, "pedido");
        closeCheckout();
        DeviceEventEmitter.emit("refresh_requests");
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
  }, [agregarPropina, closeCheckout, fetchSolicitudes, metodoPago, metodoPagoAdicional, pedidoDetails, removeSolicitudLocally, selectedClient, selectedMinutesPedido, selectedPedido, showToast]);

  const handleAddToCuenta = useCallback(async () => {
    if (!selectedPedido || !selectedClient) return;
    if (!cajaAbierta) {
      showToast("Caja Cerrada", "No puedes crear cuentas sin una caja abierta.", "error");
      return;
    }

    setSubmittingCheckout(true);
    try {
      const clienteId = selectedPedido.cliente_id || pedidoDetails?.[0]?.cliente_id || selectedClient?.id || null;
      const habitacionId = pedidoDetails?.[0]?.habitacion_id || null;
      const detalles = pedidoDetails.map((d: any) => ({
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        precio: d.precio,
        sub_total: (d.cantidad * d.precio),
      }));

      const subTotal = detalles.reduce((sum: number, d: any) => sum + d.sub_total, 0);
      const total = subTotal;

      const payload = {
        codigo: `CUENTA-${Date.now()}`,
        cliente_id: clienteId,
        habitacion_id: habitacionId,
        tiempo: selectedMinutesPedido || 30,
        metodo_pago: "efectivo",
        sub_total: subTotal,
        total,
        total_comision: 0,
        detalles,
      };

      const res = await cuentasService.create(payload);

      if (res.success) {
        showToast("Éxito", `Pedido registrado en cuenta de ${selectedClient.name} ${selectedClient.lastName}`, "success");
        removeSolicitudLocally(selectedPedido.id_pedido, "pedido");
        closeCheckout();
        DeviceEventEmitter.emit("refresh_requests");
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
  }, [cajaAbierta, closeCheckout, fetchSolicitudes, pedidoDetails, removeSolicitudLocally, selectedClient, selectedMinutesPedido, selectedPedido, showToast]);

  return { handleCheckoutSubmit, handleAddToCuenta, submittingCheckout, setSubmittingCheckout };
}
