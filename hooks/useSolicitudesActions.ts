import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { eventBus } from "@/utils/eventBus";
import * as Haptics from "expo-haptics";
import { showToast as showToastLazy } from "@/utils/toast-lazy";
import { apiClientSafe } from "@/api/client";
import { useConfigValue } from "@/hooks/useConfigValue";
import type {
  AlertConfig,
  PendingAutoOpen,
  SolicitudItem,
} from "@/hooks/types/solicitudesTypes";
import { blockOffline } from "@/utils/offlineGuard";
import { useAuthStore } from "@/store/authStore";
import { isCajeroRole } from "@/utils/userRole";
import { useSolicitudesCheckout } from "@/hooks/solicitudes/useSolicitudesCheckout";
import { useSolicitudesServiceModal } from "@/hooks/solicitudes/useSolicitudesServiceModal";

interface UseSolicitudesActionsParams {
  solicitudes: SolicitudItem[];
  cajaAbierta: boolean;
  fetchSolicitudes: (isManual?: boolean) => Promise<void>;
  removeSolicitudLocally: (
    id: string,
    tipo: "pedido" | "solicitud" | "anticipo",
  ) => void;
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
  const user = useAuthStore((state) => state.user);
  const propinaPct = Number(
    useConfigValue("facturacion", "propina_venta", "10"),
  );
  const [processedOpenId, setProcessedOpenId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showToast = useCallback(
    (title: string, message: string, type: "success" | "error" = "error") => {
      if (type === "success")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      showToastLazy({
        type,
        text1: title,
        text2: message,
        visibilityTime: 4000,
      });
    },
    [],
  );

  const checkout = useSolicitudesCheckout({
    cajaAbierta,
    propinaPct,
    fetchSolicitudes,
    removeSolicitudLocally,
    showToast,
  });
  const {
    metodoPago,
    metodoPagoAdicional,
    setMetodoPago,
    setMetodoPagoAdicional,
    setSelectedClient,
    closeCheckout,
    openPedidoCheckout,
  } = checkout;

  const serviceModal = useSolicitudesServiceModal({ setSelectedClient });
  const { serviceModalVisible, setServiceModalVisible, setSelectedService } =
    serviceModal;

  const handleAprobar = useCallback(
    async (
      id: string,
      tipo: "pedido" | "solicitud" | "anticipo",
      itemInfo?: SolicitudItem,
      productoIncluido?: string,
    ) => {
      if (!cajaAbierta) {
        showToast(
          "Caja Cerrada",
          "No puedes aprobar servicios ni pedidos porque no hay una caja abierta.",
          "error",
        );
        return;
      }

      // Aprobar factura y mueve dinero: es decisión del servidor.
      if (!blockOffline("solicitud")) return;

      if (tipo === "pedido" && itemInfo) {
        await openPedidoCheckout(itemInfo, id);
        return;
      }

      if (tipo === "anticipo" && itemInfo) {
        if (!isCajeroRole(user) || Number(itemInfo.estado) !== 1) {
          showToast(
            "No disponible",
            "Solo el cajero puede entregar anticipos previamente aprobados por el administrador.",
            "error",
          );
          return;
        }
        setAlertConfig({
          visible: true,
          title: "Entregar anticipo aprobado",
          message: `¿Confirmas que has entregado el efectivo de $${(itemInfo.monto ?? 0).toLocaleString()} a ${itemInfo.usuario ?? ""}?`,
          type: "success",
          onConfirm: async () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            try {
              const res = await apiClientSafe(`/advances/${id}`, {
                method: "PUT",
                body: JSON.stringify({ estado: 0 }),
              });
              if (res.success) {
                removeSolicitudLocally(id, "anticipo");
                showToast(
                  "Éxito",
                  "Anticipo entregado y descontado de caja.",
                  "success",
                );
                eventBus.emit("refresh_requests");
                eventBus.emit("refresh_anticipos");
              } else {
                showToast(
                  "Error",
                  res.message || "Error al procesar.",
                  "error",
                );
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
            const res = await apiClientSafe(
              `/service-requests/${id}/approve`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  metodo_pago:
                    metodoPago || itemInfo?.metodo_pago || "efectivo",
                  metodo_pago_adicional: metodoPagoAdicional || undefined,
                  producto_incluido_presentacion_id:
                    productoIncluido ||
                    (itemInfo as any)?.producto_incluido_presentacion_id ||
                    undefined,
                }),
              },
            );

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
              setAlertConfig((prev) => ({ ...prev, visible: false }));
              executeAprobacion();
            },
          });
        }
      }
    },
    [
      cajaAbierta,
      user,
      openPedidoCheckout,
      fetchSolicitudes,
      metodoPago,
      metodoPagoAdicional,
      removeSolicitudLocally,
      serviceModalVisible,
      setMetodoPago,
      setMetodoPagoAdicional,
      setServiceModalVisible,
      showToast,
    ],
  );

  const handleRechazar = useCallback(
    (id: string, tipo: "pedido" | "solicitud" | "anticipo") => {
      if (!blockOffline("solicitud")) return;
      setAlertConfig({
        visible: true,
        title: "Rechazar",
        message: `¿Seguro que deseas rechazar este ${tipo === "solicitud" ? "servicio" : "pedido"}?`,
        type: "danger",
        onConfirm: async () => {
          setAlertConfig((prev) => ({ ...prev, visible: false }));
          removeSolicitudLocally(
            id,
            tipo === "solicitud" ? "solicitud" : "pedido",
          );
          try {
            const endpoint =
              tipo === "solicitud"
                ? `/service-requests/${id}/reject`
                : `/orders/${id}`;
            const res = await apiClientSafe(endpoint, {
              method: tipo === "solicitud" ? "PATCH" : "PUT",
              body: JSON.stringify(
                tipo === "solicitud"
                  ? { motivo_rechazo: "Caja" }
                  : { estado: 2 },
              ),
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
    },
    [fetchSolicitudes, removeSolicitudLocally, showToast],
  );

  useEffect(() => {
    setPendingAutoOpen(null);
  }, [setPendingAutoOpen]);

  // El tiempo de espera se muestra en minutos; actualizar cada segundo forzaba
  // renders de toda la lista sin cambiar lo que ve el usuario.
  useFocusEffect(
    useCallback(() => {
      let interval: ReturnType<typeof setInterval> | undefined;
      const stopTicker = () => {
        if (interval !== undefined) {
          clearInterval(interval);
          interval = undefined;
        }
      };
      const startTicker = () => {
        stopTicker();
        interval = setInterval(() => setNowTick((tick) => tick + 1), 60_000);
      };

      if (AppState.currentState === "active") startTicker();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          setNowTick((tick) => tick + 1);
          startTicker();
        } else {
          stopTicker();
        }
      });

      return () => {
        stopTicker();
        subscription.remove();
      };
    }, []),
  );

  useEffect(() => {
    if (openId && queryType && solicitudes.length > 0) {
      const id = openId as string;
      if (id === processedOpenId) return;

      const found = solicitudes.find(
        (s) =>
          (queryType === "new_order" &&
            s.tipoItem === "pedido" &&
            s.id_pedido === id) ||
          (queryType === "new_service_request" &&
            s.tipoItem === "solicitud" &&
            s.id_solicitud === id),
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
  }, [
    handleAprobar,
    openId,
    processedOpenId,
    queryType,
    router,
    setSelectedService,
    setServiceModalVisible,
    solicitudes,
  ]);

  useEffect(() => {
    if (
      !pendingAutoOpen ||
      !pendingAutoOpen.id ||
      pendingAutoOpen.id === "undefined" ||
      pendingAutoOpen.id === undefined ||
      !solicitudes.length
    ) {
      return;
    }

    const { id, type } = pendingAutoOpen;
    const found = solicitudes.find(
      (s) =>
        (type === "pedido" && s.tipoItem === "pedido" && s.id_pedido === id) ||
        (type === "solicitud" &&
          s.tipoItem === "solicitud" &&
          s.id_solicitud === id),
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
  }, [
    handleAprobar,
    pendingAutoOpen,
    setPendingAutoOpen,
    setSelectedService,
    setServiceModalVisible,
    solicitudes,
  ]);

  return {
    processedOpenId,
    nowTick,
    ...checkout,
    ...serviceModal,
    alertConfig,
    setAlertConfig,
    setProcessedOpenId,
    setNowTick,
    handleAprobar,
    handleRechazar,
  };
};
