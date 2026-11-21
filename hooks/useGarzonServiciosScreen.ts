import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { showToast } from "@/utils/toast-lazy";
import {
  maxAnfitrionasConComision,
  maxClientesConComision,
} from "@/utils/servicioReglas";
import { apiClientSafe } from "@/api/client";
import { serviciosService } from "@/services/servicios";
import { SolicitudServicioCreateSchema } from "@lasmunecasderamon/validations";
import { blockOffline } from "@/utils/offlineGuard";
import { getIvaDecimal } from "@/hooks/utils/cuentaUtils";
import { calcularTotalesServicio } from "@/utils/servicioTotales";
import { normalizeRoom } from "@/hooks/utils/cartUtils";
import { useDebouncedEventListeners } from "@/hooks/useDebouncedEventListener";
import { REALTIME_EVENT_NAMES } from "@/utils/realtime";
import logger from "@/utils/logger";
import { useBaucherPhoto } from "@/hooks/useBaucherPhoto";
import { generateCode, formatAmountInput } from "@/components/cajero/nuevo-servicio/helpers";

export interface Room {
  id: string | number;
  id_habitacion?: string | number;
  nombre: string;
  precio: number;
  tiempo: number;
  estado: number;
  comision_anfitriona?: number;
}

/** `/rooms` llega con `name`/`price`/`time` o `nombre`/`precio`/`tiempo`. */
const normalizeRooms = (data: unknown): Room[] =>
  (Array.isArray(data) ? data : []).map((room) =>
    normalizeRoom(room as Record<string, unknown>),
  );

export interface Anfitriona {
  id: number;
  id_usuario?: number;
  nick: string;
  name: string;
  nombre?: string;
  foto: string;
  estado_servicio?: number;
}

export interface Client {
  id: number;
  id_cliente?: number;
  name: string;
  nombre?: string;
  lastName: string;
  apellido?: string;
  saldo?: number;
}

export function useGarzonServiciosScreen() {
  const router = useRouter();
  const [includedProduct, setIncludedProduct] = useState({ roomId: "", id: "" });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dataRef = useRef<string>("");

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const includedRoomId = String(selectedRoom?.id_habitacion || selectedRoom?.id || '');
  const productoIncluido = includedProduct.roomId === includedRoomId ? includedProduct.id : '';
  const setProductoIncluido = (id: string) => setIncludedProduct({ roomId: includedRoomId, id });
  const [selectedHostesses, setSelectedHostesses] = useState<number[]>([]);
  const [selectedClients, setSelectedClients] = useState<(number | string)[]>(
    [],
  );
  const [servicePrice, setServicePrice] = useState<string>("");
  const [paymentMethod, setPaymentMethodRaw] = useState<
    "efectivo" | "tarjeta" | "transferencia" | "prepago" | ""
  >("");

  const { baucherFoto, takeBaucherPhoto } = useBaucherPhoto("Servicios");
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [hostessModalVisible, setHostessModalVisible] = useState(false);
  const [clientModalVisible, setClientModalVisible] = useState(false);

  const setPaymentMethod = useCallback(
    (metodo: "efectivo" | "tarjeta" | "transferencia" | "prepago" | "") => {
      setPaymentMethodRaw(metodo);
      if (metodo === "transferencia") void takeBaucherPhoto();
    },
    [takeBaucherPhoto],
  );

  const fetchData = useCallback(
    async (isRefreshing = false, signal?: AbortSignal) => {
      try {
        if (!isRefreshing) setLoading(true);
        const [roomRes, anfRes, clientRes] = await Promise.allSettled([
          apiClientSafe("/rooms", { signal }),
          apiClientSafe("/users?anfitrionas=1", { signal }),
          apiClientSafe("/clients", { signal }),
        ]);

        if (signal?.aborted) return;

        const roomData = roomRes.status === "fulfilled" ? roomRes.value : null;
        const anfData = anfRes.status === "fulfilled" ? anfRes.value : null;
        const clientData =
          clientRes.status === "fulfilled" ? clientRes.value : null;

        const deduplicate = (arr: any[], idKey: string) => {
          if (!Array.isArray(arr)) return [];
          const unique = new Map<string, any>();
          for (const item of arr) {
            const id = item?.[idKey] ?? item?.id;
            if (id == null) continue;
            const key = String(id);
            if (!unique.has(key)) unique.set(key, item);
          }
          return Array.from(unique.values());
        };

        const rawAnf = (anfData as any)?.data || [];
        const rawClients = Array.isArray(clientData)
          ? clientData
          : (clientData as any)?.data || [];
        const normalizedRooms = normalizeRooms((roomData as any)?.data);
        const newData = {
          rooms: normalizedRooms,
          anfitrionas: rawAnf,
          clients: rawClients,
        };
        const serialized = JSON.stringify(newData);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;

        setRooms(normalizedRooms);

        setAnfitrionas(deduplicate(rawAnf, "id_usuario"));
        setClients(deduplicate(rawClients, "id_cliente"));

        if (isRefreshing) {
          showToast({
            type: hasChanges ? "success" : "info",
            text1: hasChanges ? "Éxito" : "Información",
            text2: hasChanges
              ? "Datos actualizados"
              : "Sin cambios en los datos",
            visibilityTime: 3000,
          });
        }
      } catch (err: any) {
        if (signal?.aborted) return;
        logger.fetchError(err, { context: "Servicios:fetchServicios" });
        showToast({
          type: "error",
          text1: "Error",
          text2: isRefreshing
            ? "No se pudieron actualizar los datos"
            : "No se pudieron cargar los datos necesarios",
        });
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const ac = new AbortController();
      fetchData(false, ac.signal);
      return () => ac.abort();
    }, [fetchData]),
  );

  useDebouncedEventListeners(
    [
      REALTIME_EVENT_NAMES.refreshRooms,
      REALTIME_EVENT_NAMES.refreshPersonal,
      REALTIME_EVENT_NAMES.refreshClients,
    ],
    useCallback(() => {
      void fetchData(false);
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const hasComision = useMemo(() => {
    return selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0;
  }, [selectedRoom]);

  const maxHostesses = useMemo(() => {
    if (!hasComision) return 10;
    return maxAnfitrionasConComision(selectedClients.length);
  }, [hasComision, selectedClients.length]);

  const maxClients = useMemo(() => {
    if (!hasComision) return 10;
    return maxClientesConComision(selectedHostesses.length);
  }, [hasComision, selectedHostesses.length]);

  const toggleHostess = (hostessId: string | number) => {
    const isSelected = selectedHostesses.some(
      (id) => String(id) === String(hostessId),
    );
    let next;

    if (isSelected) {
      next = selectedHostesses.filter((id) => String(id) !== String(hostessId));
    } else {
      if (selectedHostesses.length >= maxHostesses) {
        showToast({
          type: "info",
          text1: "Límite alcanzado",
          text2: `Máximo ${maxHostesses} anfitrionas permitidas`,
        });
        return;
      }
      next = [...selectedHostesses, hostessId];
    }

    const uniqueNext = Array.from(new Set(next.map((id) => String(id)))).map(
      (idStr) => next.find((id) => String(id) === idStr) || idStr,
    );

    setSelectedHostesses(uniqueNext as any);
  };

  const toggleClient = (clientId: string | number) => {
    const isSelected = selectedClients.some(
      (id) => String(id) === String(clientId),
    );
    let next;

    if (isSelected) {
      next = selectedClients.filter((id) => String(id) !== String(clientId));
    } else {
      if (selectedClients.length >= maxClients) {
        showToast({
          type: "info",
          text1: "Límite alcanzado",
          text2: `Máximo ${maxClients} clientes permitidos`,
        });
        return;
      }
      next = [...selectedClients, clientId];
    }

    const uniqueNext = Array.from(new Set(next.map((id) => String(id)))).map(
      (idStr) => next.find((id) => String(id) === idStr) || idStr,
    );

    setSelectedClients(uniqueNext as any);

    const activeClient =
      uniqueNext.length === 0
        ? null
        : clients.find(
          (c) => String(c.id_cliente || c.id) === String(uniqueNext[0]),
        );

    if (activeClient && (activeClient.saldo || 0) > 0) {
      setPaymentMethod("prepago");
    } else if (paymentMethod === "prepago") {
      setPaymentMethod("");
    }
  };

  const activeClientWithBalance = useMemo(() => {
    if (selectedClients.length === 0) return null;
    const mainClientId = selectedClients[0];
    const client = clients.find(
      (c) => String(c.id_cliente || c.id) === String(mainClientId),
    );
    return client && (client.saldo || 0) > 0 ? client : null;
  }, [selectedClients, clients]);

  const hasPrepago = !!activeClientWithBalance;

  const totals = useMemo(() => {
    const price = parseInt(servicePrice.replace(/\./g, "")) || 0;
    const resultado = calcularTotalesServicio({
      precioServicioUnidad: price,
      precioHabitacion: selectedRoom ? selectedRoom.precio || 0 : 0,
      tiempoHabitacion: selectedRoom?.tiempo || 0,
      cantidadAnfitrionas: selectedHostesses.length,
      cantidadClientes: selectedClients.length,
      comisionHabitacion: selectedRoom?.comision_anfitriona ?? 0,
      metodoPago: paymentMethod,
      ivaDecimal: getIvaDecimal(),
      politica: "solicitud",
    });

    return {
      subtotal: resultado.precioServicio,
      totalHabitacion: resultado.precioHabitacion,
      total: resultado.total,
      iva: resultado.iva,
      comisionPorAnfitriona: resultado.comisionPorAnfitriona,
    };
  }, [
    servicePrice,
    selectedRoom,
    selectedHostesses.length,
    selectedClients.length,
    paymentMethod,
  ]);

  // Re-export formatAmountInput as formatNumber for backward compatibility
  const formatNumber = formatAmountInput;

  const handlePriceChange = (val: string) => {
    setServicePrice(formatNumber(val));
  };

  const alerta = (title: string, message: string) =>
    showToast({ type: "error", text1: title, text2: message });

  const handleSubmit = async () => {
    if (hasComision && !productoIncluido)
      return alerta(
        "Producto incluido",
        "Selecciona una unidad del bar para la habitación",
      );
    if (!selectedRoom) return alerta("Error", "Selecciona una habitación");
    if (selectedHostesses.length === 0)
      return alerta("Error", "Selecciona al menos una anfitriona");
    if (!paymentMethod)
      return alerta("Error", "Selecciona un método de pago");

    if (paymentMethod === "transferencia" && !baucherFoto) {
      alerta(
        "Falta el baucher",
        "El pago con transferencia requiere la foto del baucher para enviar la solicitud.",
      );
      void takeBaucherPhoto();
      return;
    }

    if (!hasComision && (!servicePrice || servicePrice === "0")) {
      return alerta("Error", "Ingresa el precio del servicio");
    }

    if (!blockOffline("solicitud")) return;

    setSubmitting(true);
    try {
      const codigo = generateCode();
      const payload = {
        codigo,
        cliente_id: selectedClients.length > 0 ? selectedClients[0] : null,
        clientes: selectedClients,
        habitacion_id: selectedRoom.id_habitacion || selectedRoom.id,
        producto_incluido_presentacion_id: hasComision
          ? productoIncluido
          : null,
        precio_servicio: parseInt(servicePrice.replace(/\./g, "")) || 0,
        precio_habitacion: selectedRoom.precio || 0,
        comision_anfitriona: selectedRoom.comision_anfitriona || 0,
        usuarios: selectedHostesses,
        anfitrionas_ids: selectedHostesses,
        metodo_pago: paymentMethod,

        ...(paymentMethod === "transferencia" && baucherFoto
          ? { baucher_foto: baucherFoto }
          : {}),
        tiempo: selectedRoom.tiempo || 0,
        total: totals.total,
        iva: totals.iva,
        num_clientes: selectedClients.length || 1,
      };

      const validation = SolicitudServicioCreateSchema.safeParse(payload);
      if (!validation.success) {
        showToast({
          type: "error",
          text1: "Datos incompletos",
          text2: validation.error.issues[0]?.message || "Revisa la solicitud",
        });
        return;
      }

      const res = await serviciosService.crearSolicitud(validation.data);

      if (res.success) {
        showToast({
          type: "success",
          text1: "Solicitud Enviada",
          text2: "La solicitud de servicio ha sido enviada a caja",
        });
        router.back();
      } else {
        alerta("Error", res.message || "No se pudo crear el servicio");
      }
    } catch (err: any) {
      alerta("Error", err.message || "Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    productoIncluido,
    setProductoIncluido,
    rooms,
    anfitrionas,
    clients,
    loading,
    refreshing,
    submitting,

    selectedRoom,
    setSelectedRoom,
    selectedHostesses,
    setSelectedHostesses,
    selectedClients,
    setSelectedClients,
    servicePrice,
    setServicePrice,
    paymentMethod,
    setPaymentMethod,
    baucherFoto,
    takeBaucherPhoto,

    roomModalVisible,
    setRoomModalVisible,
    hostessModalVisible,
    setHostessModalVisible,
    clientModalVisible,
    setClientModalVisible,

    hasComision,
    maxHostesses,
    maxClients,
    activeClientWithBalance,
    hasPrepago,
    totals,

    onRefresh,
    toggleHostess,
    toggleClient,
    handlePriceChange,
    handleSubmit,
    formatNumber,
    formatAmountInput: formatNumber,
  };
}
