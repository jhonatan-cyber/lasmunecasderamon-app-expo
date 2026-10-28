import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { showToast } from "@/utils/toast-lazy";
import { ajustarFotoBaucher } from "@/utils/baucherFoto";
import { apiClientSafe } from "@/api/client";
import { blockOffline } from "@/utils/offlineGuard";
import { getIvaDecimal } from "@/hooks/utils/cuentaUtils";
import logger from "@/utils/logger";

export interface Room {
  id: number;
  id_habitacion?: number;
  name: string;
  numero: string;
  nombre?: string;
  price: number;
  precio?: number;
  time: number;
  tiempo?: number;
  status: number;
  comision_anfitriona?: number;
}

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
  /**
   * Foto del baucher en data URL. Solo se exige con transferencia: sin ella la
   * solicitud no puede enviarse porque es la única constancia de que el pago
   * entró (mismo contrato que el pedido y la entrada en la puerta).
   */
  const [baucherFoto, setBaucherFoto] = useState<string | null>(null);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [hostessModalVisible, setHostessModalVisible] = useState(false);
  const [clientModalVisible, setClientModalVisible] = useState(false);

  /**
   * Abre la cámara para fotografiar el baucher. Si el garzón cancela, el método
   * sigue siendo transferencia pero sin foto: `handleSubmit` vuelve a pedirla.
   */
  const takeBaucherPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showToast({
          type: "error",
          text1: "Sin acceso a la cámara",
          text2: "Permite la cámara para fotografiar el baucher de la transferencia.",
        });
        return;
      }
      // Calidad baja a propósito: el base64 viaja dentro del payload y el
      // servidor rechaza sobre `BAUCHER_FOTO_MAX_CHARS`. El baucher se lee
      // igual, y así una foto de cámara no deja la solicitud sin poder enviarse.
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.4,
        base64: true,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64) return;
      const original = `data:image/jpeg;base64,${asset.base64}`;
      // Si no cabe ni reducida no se guarda: una foto que el servidor rechaza
      // con 400 dejaría la solicitud sin registrar.
      const ajuste = await ajustarFotoBaucher(original, asset.uri);
      if (!ajuste.ok) {
        showToast({
          type: "error",
          text1: "La foto del baucher no sirve",
          text2:
            ajuste.motivo === "no-cabe"
              ? "No entra en el tamaño permitido. Tómala de nuevo con más luz y sin zoom."
              : "No se pudo reducir la foto. Tómala de nuevo.",
        });
        return;
      }
      setBaucherFoto(ajuste.dataUrl);
    } catch (err) {
      logger.fetchError(err, { context: "Servicios:takeBaucherPhoto" });
      showToast({
        type: "error",
        text1: "No se pudo abrir la cámara",
        text2: "Vuelve a intentar fotografiar el baucher.",
      });
    }
  }, []);

  /** Elegir transferencia dispara la cámara: la foto es obligatoria para enviar. */
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
        const newData = {
          rooms: (roomData as any)?.data,
          anfitrionas: rawAnf,
          clients: rawClients,
        };
        const serialized = JSON.stringify(newData);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;

        setRooms((roomData as any)?.data || []);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const hasComision = useMemo(() => {
    return selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0;
  }, [selectedRoom]);

  const maxHostesses = useMemo(() => {
    if (!hasComision) return 10;
    return Math.min(3, 4 - Math.max(1, selectedClients.length));
  }, [hasComision, selectedClients.length]);

  const maxClients = useMemo(() => {
    if (!hasComision) return 10;
    return 4 - Math.max(1, selectedHostesses.length);
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
    const roomPrice = selectedRoom
      ? selectedRoom.precio || selectedRoom.price || 0
      : 0;

    const cantAnfitrionas = selectedHostesses.length || 1;
    const cantClientes = selectedClients.length || 1;

    let multServicio = cantAnfitrionas;
    let multHabitacion = cantAnfitrionas;

    if (
      cantClientes > cantAnfitrionas &&
      selectedRoom &&
      (selectedRoom.comision_anfitriona ?? 0) === 0
    ) {
      multServicio = cantClientes;
      multHabitacion = cantClientes;
    }

    if (selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0) {
      multHabitacion = 1;
    }

    const subtotal = price * multServicio;
    const totalHabitacion = roomPrice * multHabitacion;

    let currentIva = 0;
    if (paymentMethod === "tarjeta") {
      currentIva = Math.floor(subtotal * getIvaDecimal());
    }

    let total = subtotal + totalHabitacion + currentIva;

    if (paymentMethod === "tarjeta" && !hasComision) {
      const totalRedondeado = Math.ceil(total / 5000) * 5000;
      const excedente = totalRedondeado - total;
      total = totalRedondeado;
      currentIva += excedente;
    }

    const comisionTotal = selectedRoom
      ? selectedRoom.comision_anfitriona || 0
      : 0;
    const comisionPorAnfitriona =
      comisionTotal > 0 && selectedHostesses.length > 0
        ? Math.floor(comisionTotal / selectedHostesses.length)
        : comisionTotal;

    return {
      subtotal,
      totalHabitacion,
      total,
      iva: currentIva,
      comisionPorAnfitriona,
    };
  }, [
    servicePrice,
    selectedRoom,
    selectedHostesses.length,
    selectedClients.length,
    paymentMethod,
    hasComision,
  ]);

  const formatNumber = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handlePriceChange = (val: string) => {
    setServicePrice(formatNumber(val));
  };

  const handleSubmit = async () => {
    if (hasComision && !productoIncluido)
      return Alert.alert(
        "Producto incluido",
        "Selecciona una unidad del bar para la habitación",
      );
    if (!selectedRoom) return Alert.alert("Error", "Selecciona una habitación");
    if (selectedHostesses.length === 0)
      return Alert.alert("Error", "Selecciona al menos una anfitriona");
    if (!paymentMethod)
      return Alert.alert("Error", "Selecciona un método de pago");

    if (paymentMethod === "transferencia" && !baucherFoto) {
      Alert.alert(
        "Falta el baucher",
        "El pago con transferencia requiere la foto del baucher para enviar la solicitud.",
      );
      void takeBaucherPhoto();
      return;
    }

    if (!hasComision && (!servicePrice || servicePrice === "0")) {
      return Alert.alert("Error", "Ingresa el precio del servicio");
    }

    // La solicitud nace en caja: sin el servidor no se puede registrar ni
    // validar, así que se avisa en vez de enviarla a ciegas.
    if (!blockOffline("solicitud")) return;

    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

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
        precio_habitacion: selectedRoom.precio || selectedRoom.price || 0,
        comision_anfitriona: selectedRoom.comision_anfitriona || 0,
        usuarios: selectedHostesses,
        anfitrionas_ids: selectedHostesses,
        metodo_pago: paymentMethod,
        // Solo transferencia lleva la foto: es la constancia del pago y el
        // servidor la exige en ese caso.
        ...(paymentMethod === "transferencia" && baucherFoto
          ? { baucher_foto: baucherFoto }
          : {}),
        tiempo: selectedRoom.tiempo || selectedRoom.time || 0,
        total: totals.total,
        iva: totals.iva,
        num_clientes: selectedClients.length || 1,
      };

      const res = await apiClientSafe("/service-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if ((res as any).success) {
        showToast({
          type: "success",
          text1: "Solicitud Enviada",
          text2: "La solicitud de servicio ha sido enviada a caja",
        });
        router.back();
      } else {
        Alert.alert(
          "Error",
          (res as any).message || "No se pudo crear el servicio",
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Error de conexión");
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
  };
}
