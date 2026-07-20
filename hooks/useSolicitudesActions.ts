import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { eventBus } from "@/utils/eventBus";
import * as Haptics from "expo-haptics";
import { showToast as showToastLazy } from '@/utils/toast-lazy';
import { apiClientSafe } from "@/api/client";
import { MetodoPago } from "@/types/api";
import type { Cliente } from '@lasmunecasderamon/types';
import type { PedidoItem, SolicitudItem, PendingAutoOpen } from "@/hooks/types/solicitudesTypes";
import logger from "@/utils/logger";

interface PedidoDetalle {
  producto_id: string;
  cantidad: number;
  precio: number;
  subtotal_detalle?: number;
  cliente_id?: string | number | null;
  habitacion_id?: string | number | null;
  propina?: number;
}

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

interface UseSolicitudesActionsParams {
  solicitudes: SolicitudItem[];
  cajaAbierta: boolean;
  fetchSolicitudes: (isManual?: boolean) => Promise<void>;
  removeSolicitudLocally: (id: string, tipo: "pedido" | "solicitud" | "anticipo") => void;
  pendingAutoOpen: PendingAutoOpen;
  setPendingAutoOpen: (value: PendingAutoOpen) => void;
  openId?: string | string[];
  queryType?: string | string[];
}

export const useSolicitudesActions = ({
  solicitudes,
  cajaAbierta,
  fetchSolicitudes,
  removeSolicitudLocally,
  pendingAutoOpen,
  setPendingAutoOpen,
  openId,
  queryType,
}: UseSolicitudesActionsParams) => {
  const router = useRouter();
  const [processedOpenId, setProcessedOpenId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<SolicitudItem | null>(null);
  const [pedidoDetails, setPedidoDetails] = useState<PedidoDetalle[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("");
  const [metodoPagoAdicional, setMetodoPagoAdicional] = useState<MetodoPago>("");
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [agregarPropina, setAgregarPropina] = useState(false);
  const [selectedMinutesPedido, setSelectedMinutesPedido] = useState<number>(30);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
  }>({ visible: false, title: "", message: "", type: "info" });
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<SolicitudItem | null>(null);
  const showToast = useCallback((title: string, message: string, type: "success" | "error" = "error") => {
    if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    showToastLazy({
      type,
      text1: title,
      text2: message,
      visibilityTime: 4000,
    });
  }, []);

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

  const handleAprobar = useCallback(async (id: string, tipo: "pedido" | "solicitud" | "anticipo", itemInfo?: SolicitudItem) => {
    logger.debug("[handleAprobar] id:", { arg0: id, arg1: "tipo:", arg2: tipo, arg3: "itemInfo:", arg4: itemInfo });
    if (!cajaAbierta) {
      showToast("Caja Cerrada", "No puedes aprobar servicios ni pedidos porque no hay una caja abierta.", "error");
      return;
    }

    if (tipo === "pedido" && itemInfo) {
      setSelectedPedido(itemInfo);
      setMetodoPago("");
      setMetodoPagoAdicional("");
      setAgregarPropina(false);
      setCheckoutModalVisible(true);
      setLoadingDetails(true);
      setSelectedMinutesPedido(30);

      try {
        const res = await apiClientSafe<PedidoDetalle[]>(`/orders/detail?id=${id}`);
        if (res.success) {
          setPedidoDetails(res.data);
          const cId = res.data?.[0]?.cliente_id || itemInfo.id_cliente || itemInfo.cliente_id;
          if (cId) {
            const cRes = await apiClientSafe<Cliente>(`/clients?id=${cId}`).catch(() => ({ success: false, data: undefined }));
            if (cRes.success && cRes.data) {
              setSelectedClient(cRes.data);
              if (Number(cRes.data.saldo || 0) > 0) setMetodoPago("prepago");
            }
          } else {
            setSelectedClient(null);
          }
          if (res.data.length > 0 && (res.data[0].propina ?? 0) > 0) setAgregarPropina(true);
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
      return;
    }

    if (tipo === "anticipo" && itemInfo) {
      const anticipoEstado = Number(itemInfo.estado);
      const requiereAprobacion = anticipoEstado === 2;
      setAlertConfig({
        visible: true,
        title: requiereAprobacion ? "Aprobar y Pagar Anticipo" : "Pagar Anticipo",
        message: `¿Confirmas que has entregado el efectivo de $${(itemInfo.monto ?? 0).toLocaleString()} a ${itemInfo.usuario ?? ''}?`,
        type: "success",
        onConfirm: async () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          try {
            if (requiereAprobacion) {
              const approveRes = await apiClientSafe(`/anticipos/${id}`, {
                method: "PUT",
                body: JSON.stringify({ estado: 1 }),
              });

              if (!approveRes.success) {
                showToast("Error", approveRes.message || "No se pudo aprobar el anticipo.", "error");
                fetchSolicitudes();
                return;
              }
            }

            const res = await apiClientSafe(`/anticipos/${id}`, {
              method: "PUT",
              body: JSON.stringify({ estado: 0 }),
            });
            if (res.success) {
              removeSolicitudLocally(id, "anticipo");
              showToast("Éxito", "Anticipo entregado y descontado de caja.", "success");
              eventBus.emit("refresh_requests");
              eventBus.emit("refresh_anticipos");
            } else {
              showToast("Error", res.message || "Error al procesar.", "error");
              fetchSolicitudes();
            }
          } catch (err: any) {
            showToast("Error", err.message || "Error del servidor", "error");
            fetchSolicitudes();
          }
        },
      });
      return;
    }

    if (tipo === "solicitud") {
      const executeAprobacion = async () => {
        removeSolicitudLocally(id, "solicitud");
        try {
          const res = await apiClientSafe(`/solicitudes-servicios/${id}/aprobar`, {
            method: "PATCH",
            body: JSON.stringify({
              metodo_pago: metodoPago || itemInfo?.metodo_pago || "efectivo",
              metodo_pago_adicional: metodoPagoAdicional || undefined,
            }),
          });

          if (res.success) {
            showToast("Éxito", "Servicio aprobado correctamente.", "success");
            eventBus.emit("refresh_requests");
            setMetodoPago("");
            setMetodoPagoAdicional("");
            setServiceModalVisible(false);
          } else {
            showToast("Error", res.message || "No se pudo aprobar.", "error");
            fetchSolicitudes();
          }
        } catch (err: any) {
          showToast("Error", err.message || "Error del servidor", "error");
          fetchSolicitudes();
        }
      };

      if (serviceModalVisible) {
        executeAprobacion();
      } else {
        setAlertConfig({
          visible: true,
          title: "Aprobar Servicio",
          message: `¿Confirmas la aprobación del servicio en la ${itemInfo?.habitacion_nombre || "habitación"}?`,
          type: "success",
          onConfirm: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            executeAprobacion();
          },
        });
      }
    }
  }, [cajaAbierta, closeCheckout, fetchSolicitudes, metodoPago, metodoPagoAdicional, removeSolicitudLocally, serviceModalVisible, showToast]);

  const handleRechazar = useCallback((id: string, tipo: "pedido" | "solicitud" | "anticipo") => {
    setAlertConfig({
      visible: true,
      title: "Rechazar",
      message: `¿Seguro que deseas rechazar este ${tipo === "solicitud" ? "servicio" : "pedido"}?`,
      type: "danger",
      onConfirm: async () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        removeSolicitudLocally(id, tipo === "solicitud" ? "solicitud" : "pedido");
        try {
          const endpoint = tipo === "solicitud" ? `/solicitudes-servicios/${id}/rechazar` : `/orders/${id}`;
          const res = await apiClientSafe(endpoint, {
            method: tipo === "solicitud" ? "PATCH" : "PUT",
            body: JSON.stringify(tipo === "solicitud" ? { motivo_rechazo: "Caja" } : { estado: 2 }),
          });
          if (res.success) {
            showToast("Éxito", "Solicitud eliminada.", "success");
            eventBus.emit("refresh_requests");
          } else {
            showToast("Error", "No se pudo rechazar.", "error");
            fetchSolicitudes();
          }
        } catch (err: any) {
          showToast("Error", err.message || "Error del servidor", "error");
          fetchSolicitudes();
        }
      },
    });
  }, [fetchSolicitudes, removeSolicitudLocally, showToast]);

  const handleCheckoutSubmit = useCallback(async () => {
    if (!selectedPedido) return;
    setSubmittingCheckout(true);

    const pedidoItem = selectedPedido as PedidoItem;
    const propinaOriginal = Number(pedidoItem.propina || pedidoDetails?.[0]?.propina || 0);
    const subtotalBase = Number(
      pedidoItem.subtotal ?? Math.max(0, Number(pedidoItem.total || 0) - propinaOriginal),
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
      id_pedido: (selectedPedido as PedidoItem).id_pedido ?? '',
      cliente_id: clienteId ?? null,
      metodo_pago: metodoPago,
      metodo_pago_adicional: metodoPagoAdicional || undefined,
      monto_prepago: montoPrepago,
      duracion_habitacion: selectedMinutesPedido,
      detalles: pedidoDetails.map((d) => ({
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
        removeSolicitudLocally(pedidoItem.id_pedido ?? '', "pedido");
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

      const res = await apiClientSafe("/cuentas", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        showToast("Éxito", `Pedido registrado en cuenta de ${selectedClient.name} ${selectedClient.lastName}`, "success");
        removeSolicitudLocally((selectedPedido as PedidoItem).id_pedido ?? '', "pedido");
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
  }, [cajaAbierta, closeCheckout, fetchSolicitudes, pedidoDetails, removeSolicitudLocally, selectedClient, selectedMinutesPedido, selectedPedido, showToast]);

  useEffect(() => {
    setPendingAutoOpen(null);
    const tid = setInterval(() => setNowTick(t => t + 1), 1000);
    return () => clearInterval(tid);
  }, [setPendingAutoOpen]);

  useEffect(() => {
    if (openId && queryType && solicitudes.length > 0) {
      const id = openId as string;
      if (id === processedOpenId) return;

      const found = solicitudes.find(s =>
        (queryType === "new_order" && s.tipoItem === "pedido" && s.id_pedido === id) ||
        (queryType === "new_service_request" && s.tipoItem === "solicitud" && s.id_solicitud === id),
      );

      if (found) {
        const t = setTimeout(() => {
          setProcessedOpenId(id);
          router.setParams({ openId: undefined, type: undefined });
          if (queryType === "new_order") {
            handleAprobar(id, "pedido", found);
          } else {
            setSelectedService(found);
            setServiceModalVisible(true);
          }
        }, 0);
        return () => clearTimeout(t);
      }
    }
  }, [handleAprobar, openId, processedOpenId, queryType, router, solicitudes]);

  useEffect(() => {
    if (!pendingAutoOpen || !pendingAutoOpen.id || pendingAutoOpen.id === "undefined" || pendingAutoOpen.id === undefined || !solicitudes.length) {
      return;
    }

    const { id, type } = pendingAutoOpen;
    const found = solicitudes.find(s =>
      (type === "pedido" && s.tipoItem === "pedido" && s.id_pedido === id) ||
      (type === "solicitud" && s.tipoItem === "solicitud" && s.id_solicitud === id),
    );

    if (found) {
      const t = setTimeout(() => {
        setPendingAutoOpen(null);
        if (type === "pedido") {
          handleAprobar(id, "pedido", found);
        } else {
          setSelectedService(found);
          setServiceModalVisible(true);
        }
      }, 0);
      return () => clearTimeout(t);
    }

    setPendingAutoOpen(null);
  }, [handleAprobar, pendingAutoOpen, solicitudes, setPendingAutoOpen]);

  useEffect(() => {
    if (!serviceModalVisible || !selectedService) return;
    const cId = selectedService.cliente_id || selectedService.id_cliente;
    if (!cId) {
      const t = setTimeout(() => setSelectedClient(null), 0);
      return () => clearTimeout(t);
    }

    const ac = new AbortController();
    const t = setTimeout(() => {
      setLoadingClient(true);
      apiClientSafe<Cliente>(`/clients?id=${cId}`, { signal: ac.signal })
        .then((res) => {
          if (res.success) setSelectedClient(res.data);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          setSelectedClient(null);
        })
        .finally(() => setLoadingClient(false));
    }, 0);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [selectedService, serviceModalVisible]);

  return {
    processedOpenId,
    nowTick,
    checkoutModalVisible,
    selectedPedido,
    pedidoDetails,
    loadingDetails,
    loadingClient,
    metodoPago,
    metodoPagoAdicional,
    selectedClient,
    agregarPropina,
    selectedMinutesPedido,
    submittingCheckout,
    alertConfig,
    serviceModalVisible,
    selectedService,
    setCheckoutModalVisible,
    setSelectedPedido,
    setPedidoDetails,
    setLoadingDetails,
    setLoadingClient,
    setMetodoPago,
    setMetodoPagoAdicional,
    setSelectedClient,
    setAgregarPropina,
    setSelectedMinutesPedido,
    setSubmittingCheckout,
    setAlertConfig,
    setServiceModalVisible,
    setSelectedService,
    setProcessedOpenId,
    setNowTick,
    handleAprobar,
    handleRechazar,
    handleCheckoutSubmit,
    handleAddToCuenta,
    closeCheckout,
  };
};
