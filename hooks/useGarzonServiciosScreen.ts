import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";
import { apiClient } from "@/api/client";
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

  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dataRef = useRef<string>("");

  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedHostesses, setSelectedHostesses] = useState<
    (number | string)[]
  >([]);
  const [selectedClients, setSelectedClients] = useState<(number | string)[]>(
    [],
  );
  const [servicePrice, setServicePrice] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "efectivo" | "tarjeta" | "transferencia" | "prepago" | ""
  >("");
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [hostessModalVisible, setHostessModalVisible] = useState(false);
  const [clientModalVisible, setClientModalVisible] = useState(false);

  
  const fetchData = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const [roomRes, anfRes, clientRes] = await Promise.allSettled([
        apiClient("/rooms"),
        apiClient("/users?anfitrionas=1"),
        apiClient("/clients"),
      ]);

      const roomData = roomRes.status === "fulfilled" ? roomRes.value : null;
      const anfData = anfRes.status === "fulfilled" ? anfRes.value : null;
      const clientData =
        clientRes.status === "fulfilled" ? clientRes.value : null;

      const deduplicate = (arr: any[], idKey: string) => {
        if (!Array.isArray(arr)) return [];
        const seen = new Set();
        return arr.filter((item) => {
          const id = item[idKey] || item.id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      };

      const rawAnf = anfData?.data || [];
      const rawClients = Array.isArray(clientData)
        ? clientData
        : clientData?.data || [];
      const newData = {
        rooms: roomData?.data,
        anfitrionas: rawAnf,
        clients: rawClients,
      };
      const serialized = JSON.stringify(newData);
      const hasChanges = dataRef.current !== serialized;
      dataRef.current = serialized;

      setRooms(roomData?.data || []);

      
      setAnfitrionas((prev) => {
        const combined = [...(rawAnf || []), ...(prev || [])];
        return deduplicate(combined, "id_usuario");
      });
      setClients(deduplicate(rawClients, "id_cliente"));

      if (isRefreshing) {
        Toast.show({
          type: hasChanges ? "success" : "info",
          text1: hasChanges ? "Éxito" : "Información",
          text2: hasChanges ? "Datos actualizados" : "Sin cambios en los datos",
          visibilityTime: 3000,
        });
      }
    } catch (err: any) {
      logger.captureException(err, { context: "Servicios:fetchServicios" });
      Toast.show({
        type: "error",
        text1: "Error",
        text2: isRefreshing
          ? "No se pudieron actualizar los datos"
          : "No se pudieron cargar los datos necesarios",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        await fetchData();
      };
      void run();
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
        Toast.show({
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
        Toast.show({
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
      
      currentIva = Math.floor(subtotal * 0.2);
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
    if (!selectedRoom) return Alert.alert("Error", "Selecciona una habitación");
    if (selectedHostesses.length === 0)
      return Alert.alert("Error", "Selecciona al menos una anfitriona");
    if (!paymentMethod)
      return Alert.alert("Error", "Selecciona un método de pago");

    
    if (!hasComision && (!servicePrice || servicePrice === "0")) {
      return Alert.alert("Error", "Ingresa el precio del servicio");
    }

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
        precio_servicio: parseInt(servicePrice.replace(/\./g, "")) || 0,
        precio_habitacion: selectedRoom.precio || selectedRoom.price || 0,
        comision_anfitriona: selectedRoom.comision_anfitriona || 0,
        usuarios: selectedHostesses,
        anfitrionas_ids: selectedHostesses,
        metodo_pago: paymentMethod,
        tiempo: selectedRoom.tiempo || selectedRoom.time || 0,
        total: totals.total,
        iva: totals.iva,
        num_clientes: selectedClients.length || 1,
      };

      const res = await apiClient("/solicitudes-servicios", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        Toast.show({
          type: "success",
          text1: "Solicitud Enviada",
          text2: "La solicitud de servicio ha sido enviada a caja",
        });
        router.back();
      } else {
        Alert.alert("Error", res.message || "No se pudo crear el servicio");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    
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
