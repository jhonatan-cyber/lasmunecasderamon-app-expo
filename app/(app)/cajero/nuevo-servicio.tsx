import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useReducer } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import Toast from "react-native-toast-message";
import { apiClient } from "@/api/client";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { ClientSelectModal } from "@/components/cajero/forms/ClientSelectModal";
import { HostessSelectModal } from "@/components/cajero/forms/HostessSelectModal";
import {
  PaymentMethod,
  PaymentMethodSelect,
} from "@/components/cajero/forms/PaymentMethodSelect";
import { RoomSelectModal } from "@/components/cajero/forms/RoomSelectModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAccentColor } from "@/hooks/useAccentColor";
import { parseDateSafe } from "@/utils/timeUtils";

type ServiceState = {
  loadingInitial: boolean;
  anfitrionas: any[];
  habitaciones: any[];
  clientes: any[];
  cajaAbierta: boolean | null;
  selectedHostesses: (number | string)[];
  selectedClients: (number | string)[];
  selectedHabitacion: any;
  precioServicio: string;
  metodoPago: PaymentMethod;
  metodoPagoAdicional: PaymentMethod | "";
  submitting: boolean;
  hostessModalVisible: boolean;
  roomModalVisible: boolean;
  clientModalVisible: boolean;
  balanceModalVisible: boolean;
  balanceAmount: string;
  balanceSubmitting: boolean;
};

type ServiceAction =
  | { type: 'SET_LOADING_INITIAL'; payload: boolean }
  | { type: 'SET_INITIAL_DATA'; payload: { anfitrionas: any[], habitaciones: any[], clientes: any[], cajaAbierta: boolean } }
  | { type: 'SET_SELECTED_HOSTESSES'; payload: (number | string)[] }
  | { type: 'SET_SELECTED_CLIENTS'; payload: (number | string)[] }
  | { type: 'SET_SELECTED_HABITACION'; payload: any }
  | { type: 'SET_PRECIO_SERVICIO'; payload: string }
  | { type: 'SET_METODO_PAGO'; payload: PaymentMethod }
  | { type: 'SET_METODO_PAGO_ADICIONAL'; payload: PaymentMethod | "" }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_MODAL_VISIBLE'; modal: 'hostess' | 'room' | 'client' | 'balance'; visible: boolean }
  | { type: 'SET_BALANCE_AMOUNT'; payload: string }
  | { type: 'SET_BALANCE_SUBMITTING'; payload: boolean }
  | { type: 'UPDATE_CLIENT_SALDO'; payload: { id: string | number, saldo: number } };

const initialServiceState: ServiceState = {
  loadingInitial: true,
  anfitrionas: [],
  habitaciones: [],
  clientes: [],
  cajaAbierta: null,
  selectedHostesses: [],
  selectedClients: [],
  selectedHabitacion: null,
  precioServicio: "0",
  metodoPago: "efectivo",
  metodoPagoAdicional: "",
  submitting: false,
  hostessModalVisible: false,
  roomModalVisible: false,
  clientModalVisible: false,
  balanceModalVisible: false,
  balanceAmount: "",
  balanceSubmitting: false,
};

function serviceReducer(state: ServiceState, action: ServiceAction): ServiceState {
  switch (action.type) {
    case 'SET_LOADING_INITIAL': return { ...state, loadingInitial: action.payload };
    case 'SET_INITIAL_DATA': return { ...state, ...action.payload };
    case 'SET_SELECTED_HOSTESSES': return { ...state, selectedHostesses: action.payload };
    case 'SET_SELECTED_CLIENTS': return { ...state, selectedClients: action.payload };
    case 'SET_SELECTED_HABITACION': return { ...state, selectedHabitacion: action.payload };
    case 'SET_PRECIO_SERVICIO': return { ...state, precioServicio: action.payload };
    case 'SET_METODO_PAGO': return { ...state, metodoPago: action.payload };
    case 'SET_METODO_PAGO_ADICIONAL': return { ...state, metodoPagoAdicional: action.payload };
    case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
    case 'SET_MODAL_VISIBLE':
      if (action.modal === 'hostess') return { ...state, hostessModalVisible: action.visible };
      if (action.modal === 'room') return { ...state, roomModalVisible: action.visible };
      if (action.modal === 'client') return { ...state, clientModalVisible: action.visible };
      if (action.modal === 'balance') return { ...state, balanceModalVisible: action.visible };
      return state;
    case 'SET_BALANCE_AMOUNT': return { ...state, balanceAmount: action.payload };
    case 'SET_BALANCE_SUBMITTING': return { ...state, balanceSubmitting: action.payload };
    case 'UPDATE_CLIENT_SALDO':
      return {
        ...state,
        clientes: state.clientes.map(c => 
          String(c.id_cliente || c.id) === String(action.payload.id) 
            ? { ...c, saldo: action.payload.saldo } 
            : c
        )
      };
    default: return state;
  }
}

const showToast = (
  title: string,
  message: string,
  type: "success" | "error" = "error",
) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: 4000,
  });
};

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function NuevoServicioScreen() {
  const { accentColor, isDark } = useAccentColor();
  const router = useRouter();

  const [state, dispatch] = useReducer(serviceReducer, initialServiceState);
  const {
    loadingInitial,
    anfitrionas,
    habitaciones,
    clientes,
    cajaAbierta,
    selectedHostesses,
    selectedClients,
    selectedHabitacion,
    precioServicio,
    metodoPago,
    metodoPagoAdicional,
    submitting,
    hostessModalVisible,
    roomModalVisible,
    clientModalVisible,
    balanceModalVisible,
    balanceAmount,
    balanceSubmitting,
  } = state;

  const bg = isDark ? "#000000" : "#F3F4F6";
  const cardBg = isDark ? "#111111" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? `${accentColor}40` : "rgba(0,0,0,0.1)";

  const fetchInitialData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_INITIAL', payload: true });
    try {
      const [cajaRes, anfitrionasRes, roomsRes, clientsRes] = await Promise.all(
        [
          apiClient("/cashregister/status"),
          apiClient("/anfitrionas"),
          apiClient("/rooms"),
          apiClient("/clients"),
        ],
      );

      let fetchedClients = [];
      if (Array.isArray(clientsRes)) {
        fetchedClients = clientsRes;
      } else if (clientsRes && clientsRes.success) {
        fetchedClients = clientsRes.data || [];
      }

      // Deduplicate data by ID
      const deduplicate = (arr: any[], idKey: string) => {
        const seen = new Set();
        return arr.filter(item => {
          const id = item[idKey] || item.id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      };

      const rawAnfitrionas = Array.isArray(anfitrionasRes) ? anfitrionasRes : (anfitrionasRes.success ? anfitrionasRes.data : []);
      const rawHabitaciones = roomsRes.success ? roomsRes.data : [];
      const rawClientes = fetchedClients;
      const habitacionesNormalizadas = rawHabitaciones.map((room: any) => ({
        ...room,
        estado: room.estado ?? room.status ?? 0,
        status: room.status ?? room.estado ?? 0,
        precio: room.precio ?? room.price ?? 0,
        price: room.price ?? room.precio ?? 0,
        tiempo: room.tiempo ?? room.time ?? 0,
        time: room.time ?? room.tiempo ?? 0,
        nombre: room.nombre ?? room.name ?? `Habitación ${room.numero ?? room.id_habitacion ?? room.id ?? ''}`.trim(),
      }));

      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: {
          cajaAbierta: cajaRes.success && cajaRes.data.hasOpenCaja,
          anfitrionas: deduplicate(rawAnfitrionas, 'id_usuario'),
          habitaciones: deduplicate(habitacionesNormalizadas, 'id_habitacion'),
          clientes: deduplicate(rawClientes, 'id_cliente'),
        }
      });

      if (!cajaRes.success || !cajaRes.data.hasOpenCaja) {
        showToast(
          "Caja Cerrada",
          "Debes abrir una caja antes de crear servicios.",
          "error",
        );
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      showToast("Error", "No se pudo cargar la información necesaria.");
    } finally {
      dispatch({ type: 'SET_LOADING_INITIAL', payload: false });
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const hasAnfitrionaComision = selectedHabitacion && (selectedHabitacion.comision_anfitriona ?? 0) > 0;

  const maxHostesses = hasAnfitrionaComision ? Math.min(3, 4 - selectedClients.length) : 10;
  const maxClients = hasAnfitrionaComision ? 4 - selectedHostesses.length : 4;

  const numericPrecioServicio = parseInt(precioServicio.replace(/\./g, "")) || 0;

  const totals = useMemo(() => {
    const numAnfitrionas = selectedHostesses.length || 1;
    const numClientes = selectedClients.length || 1;

    const multiplicadorTiempo = selectedHabitacion?.tiempo === 60 ? 2 : 1;
    const multiplicadorServicio = numAnfitrionas;
    const multiplicadorHabitacion = Math.max(numAnfitrionas, numClientes);
    const tieneComision = (selectedHabitacion?.comision_anfitriona ?? 0) > 0;

    const precioServicioActual = numericPrecioServicio * multiplicadorTiempo * multiplicadorServicio;
    const precioHabitacionActual =
      (selectedHabitacion?.precio || 0) * multiplicadorTiempo * multiplicadorHabitacion;

    let calculatedIva = 0;
    if (metodoPago === "tarjeta") {
      calculatedIva = Math.floor(precioServicioActual * 0.2);
    }

    let currentTotal = precioServicioActual + precioHabitacionActual + calculatedIva;

    if (metodoPago === "tarjeta") {
      const totalRedondeado = Math.ceil(currentTotal / 5000) * 5000;
      const excedente = totalRedondeado - currentTotal;
      currentTotal = totalRedondeado;
      calculatedIva += excedente;
    }

    return {
      subTotal: precioServicioActual,
      iva: calculatedIva,
      total: currentTotal,
      precioHabitacionActual,
      precioServicioActual,
      comisionPorAnfitriona: (tieneComision && selectedHostesses.length > 0) 
        ? Math.floor(selectedHabitacion.comision_anfitriona / selectedHostesses.length) 
        : (selectedHabitacion?.comision_anfitriona || 0),
    };
  }, [
    numericPrecioServicio,
    selectedHostesses.length,
    selectedClients.length,
    selectedHabitacion,
    metodoPago,
  ]);

  const toggleHostess = (hostessId: string | number) => {
    const isSelected = selectedHostesses.some(id => String(id) === String(hostessId));
    let next;
    
    if (isSelected) {
      next = selectedHostesses.filter((id) => String(id) !== String(hostessId));
    } else {
      if (selectedHostesses.length >= maxHostesses) {
        showToast("Límite", `Máximo ${maxHostesses} anfitrionas`);
        return;
      }
      next = [...selectedHostesses, hostessId];
    }

    // Double check uniqueness
    const uniqueNext = Array.from(new Set(next.map(id => String(id))))
      .map(idStr => next.find(id => String(id) === idStr));

    dispatch({ type: 'SET_SELECTED_HOSTESSES', payload: uniqueNext as (string | number)[] });
  };

  const toggleClient = (clientId: string | number) => {
    const isSelected = selectedClients.some(id => String(id) === String(clientId));
    let next;

    if (isSelected) {
      next = selectedClients.filter((id) => String(id) !== String(clientId));
    } else {
      if (selectedClients.length >= maxClients) {
        showToast("Límite", `Máximo ${maxClients} clientes`);
        return;
      }
      next = [...selectedClients, clientId];
    }

    // Double check uniqueness
    const uniqueNext = Array.from(new Set(next.map(id => String(id))))
      .map(idStr => next.find(id => String(id) === idStr));

    dispatch({ type: 'SET_SELECTED_CLIENTS', payload: uniqueNext as (string | number)[] });
  };

  
  const handleLoadBalance = async () => {
    const clientId = selectedClients.length > 0 ? selectedClients[0] : null;
    if (!clientId || !balanceAmount) return;

    dispatch({ type: 'SET_BALANCE_SUBMITTING', payload: true });
    try {
      const amount = parseInt(balanceAmount.replace(/\./g, ''));
      const res = await apiClient("/clients/prepago", {
        method: "POST",
        body: JSON.stringify({
          cliente_id: clientId,
          monto: amount,
          tipo: 'CARGA'
        })
      });

      if (res.success) {
        showToast("Éxito", "Saldo cargado correctamente", "success");
        dispatch({ type: 'UPDATE_CLIENT_SALDO', payload: { id: clientId, saldo: res.data.nuevo_saldo } });
        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'balance', visible: false });
        dispatch({ type: 'SET_BALANCE_AMOUNT', payload: "" });
      } else {
        showToast("Error", res.message || "No se pudo cargar el saldo");
      }
    } catch (error) {
      showToast("Error", "Error al procesar la carga de saldo");
    } finally {
      dispatch({ type: 'SET_BALANCE_SUBMITTING', payload: false });
    }
  };

  const selectedClientData = useMemo(() => {
    if (selectedClients.length === 0) return null;
    return clientes.find(c => String(c.id_cliente || c.id) === String(selectedClients[0]));
  }, [selectedClients, clientes]);

  const handleSubmit = useCallback(async () => {
    if (!cajaAbierta) {
      showToast("Caja Cerrada", "Abre una caja primero.");
      return;
    }
    if (metodoPago === 'prepago') {
      const saldo = Number(selectedClientData?.saldo || 0);
      if (saldo < totals.total && !metodoPagoAdicional) {
        showToast("Saldo Insuficiente", "El saldo del cliente no cubre el total. Selecciona un método adicional.", "error");
        return;
      }
    }

    if (!selectedHabitacion) {
      showToast("Falta Datos", "Selecciona una habitación.");
      return;
    }
    if (selectedHostesses.length === 0) {
      showToast("Falta Datos", "Selecciona al menos una anfitriona.");
      return;
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      const payload = {
        codigo: generateCode(),
        cliente_id: selectedClients.length > 0 ? selectedClients[0] : null,
        clientes: selectedClients,
        habitacion_id:
          selectedHabitacion.id_habitacion || selectedHabitacion.id,
        precio_habitacion: totals.precioHabitacionActual,
        precio_servicio: totals.precioServicioActual,
        iva: totals.iva,
        sub_total: totals.subTotal,
        total: totals.total,
        tiempo: selectedHabitacion.tiempo || 0,
        fecha_crea: parseDateSafe(new Date()).toISOString(),
        metodo_pago: metodoPago,
        metodo_pago_adicional: (metodoPago === 'prepago' && (Number(selectedClientData?.saldo || 0) < totals.total)) 
          ? metodoPagoAdicional || undefined 
          : undefined,
        usuarios: selectedHostesses,
      };

      // Log anfitrionas data as requested
      const anfitrionasDataRes = await apiClient("/anfitrionas");
      const anfitrionasData = Array.isArray(anfitrionasDataRes) ? anfitrionasDataRes : (anfitrionasDataRes.success ? anfitrionasDataRes.data : []);
      if (anfitrionasData.length > 0) {
        console.log('Anfitrionas fetched:', anfitrionasData.length, 'entries. First one foto:', anfitrionasData[0]?.foto);
      }

      const res = await apiClient("/servicios", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.success) {
        showToast("Éxito", "Servicio creado correctamente", "success");
        setTimeout(() => router.replace("/cajero/servicios"), 1500);
      } else {
        showToast("Error", res.message || "No se pudo crear el servicio");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Error", "Ocurrió un error al procesar el servicio.");
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [cajaAbierta, selectedHabitacion, selectedHostesses, selectedClients, totals, numericPrecioServicio, metodoPago, router]);

  const NuevoServicioSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PremiumHeader 
        title="Nuevo Servicio" 
        subtitle="Cargando información..." 
        rightComponent={
          <View style={[styles.backBtnRight, { opacity: 0.5 }]}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextRight}>Atrás</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Skeleton width={180} height={15} style={{ marginBottom: 20 }} />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={60} borderRadius={16} style={{ marginBottom: 12 }} />
          ))}
          <Skeleton width={150} height={12} style={{ marginTop: 10, marginBottom: 10 }} />
          <Skeleton width="100%" height={54} borderRadius={16} />
        </View>

        <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <Skeleton width={80} height={15} />
            <Skeleton width={80} height={15} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 15 }}>
            <Skeleton width={120} height={20} />
            <Skeleton width={100} height={30} />
          </View>
          <Skeleton width="100%" height={60} borderRadius={20} />
        </View>
      </ScrollView>
    </View>
  );

  if (loadingInitial) return <NuevoServicioSkeleton />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <PremiumHeader
        title="Nuevo Servicio"
        subtitle="Agendar servicio temporal"
        rightComponent={
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtnRight}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextRight}>Atrás</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[styles.section, { backgroundColor: cardBg, borderColor }]}
        >
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Formulario de Servicio
          </Text>

          <Pressable
            style={[styles.selectorBtn, { borderColor }]}
            onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: true })}
            accessibilityLabel="Seleccionar habitación"
            accessibilityRole="button"
          >
            <Ionicons name="business" size={22} color={accentColor} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorLabel, { color: textSecondary }]}>
                Habitación (Requerido)
              </Text>
              <Text style={[styles.selectorVal, { color: textPrimary }]}>
                {selectedHabitacion?.nombre || "Seleccionar habitación"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.selectorBtn, { borderColor, marginTop: 12 }]}
            onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'hostess', visible: true })}
            accessibilityLabel="Seleccionar anfitrionas"
            accessibilityRole="button"
          >
            <Ionicons name="people" size={22} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorLabel, { color: textSecondary }]}>
                Anfitrionas ({selectedHostesses.length})
              </Text>
              <Text style={[styles.selectorVal, { color: textPrimary }]}>
                {selectedHostesses.length > 0
                  ? selectedHostesses
                    .map(
                      (id) =>
                        anfitrionas.find((a) => String(a.id_usuario || a.id) === String(id))
                          ?.nick,
                    )
                    .join(", ")
                  : "Seleccionar anfitrionas"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.selectorBtn, { borderColor, marginTop: 12 }]}
            onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: true })}
            accessibilityLabel="Seleccionar clientes"
            accessibilityRole="button"
          >
            <Ionicons name="person" size={22} color="#3B82F6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorLabel, { color: textSecondary }]}>
                Clientes ({selectedClients.length})
              </Text>
              <Text style={[styles.selectorVal, { color: textPrimary }]}>
                {selectedClients.length > 0
                  ? selectedClients
                    .map((id) => {
                      const cl = clientes.find(
                        (c) => String(c.id_cliente || c.id) === String(id),
                      );
                      return cl
                        ? `${cl.nombre || cl.name || ""} ${cl.apellido || cl.last_name || ""}`.trim()
                        : "Cliente";
                    })
                    .join(", ")
                  : "Seleccionar clientes (Opcional)"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </Pressable>

          {!hasAnfitrionaComision && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.inputGroupLabel, { color: textSecondary }]}>
                PRECIO DE SERVICIO
              </Text>
              <View style={[styles.inputWrapper, { borderColor }]}>
                <Ionicons name="cash-outline" size={20} color={textSecondary} />
                <TextInput
                  style={[styles.textInput, { color: textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={textSecondary}
                  keyboardType="numeric"
                  value={precioServicio}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, "");
                    dispatch({
                      type: 'SET_PRECIO_SERVICIO',
                      payload: clean === ""
                        ? "0"
                        : parseInt(clean)
                          .toLocaleString("es-CL")
                          .replace(/,/g, "."),
                    });
                  }}
                />
              </View>
            </View>
          )}

          
          {selectedClientData && (
            <View style={{ marginTop: 16, marginBottom: 15, padding: 12, backgroundColor: `${accentColor}10`, borderRadius: 12, borderWidth: 1, borderColor: `${accentColor}30` }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Saldo Prepago Cliente</Text>
                  <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '900', marginTop: 2 }}>
                    ${(selectedClientData.saldo || 0).toLocaleString()}
                  </Text>
                </View>
                <Pressable 
                  onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'balance', visible: true })}
                  style={{ backgroundColor: accentColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>CARGAR</Text>
                </Pressable>
              </View>
            </View>
          )}
          <PaymentMethodSelect
            showPrepago={!!selectedClientData}
            selectedMethod={metodoPago}
            onSelect={(val) => {
              dispatch({ type: 'SET_METODO_PAGO', payload: val });
              if (val !== 'prepago') dispatch({ type: 'SET_METODO_PAGO_ADICIONAL', payload: "" });
            }}
          />

          {metodoPago === 'prepago' && selectedClientData && Number(selectedClientData.saldo || 0) < totals.total && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: borderColor }}>
              <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' }}>
                Faltan ${(totals.total - Number(selectedClientData.saldo || 0)).toLocaleString()} - Completar con:
              </Text>
              <PaymentMethodSelect
                showPrepago={false}
                selectedMethod={metodoPagoAdicional as any}
                onSelect={(val) => dispatch({ type: 'SET_METODO_PAGO_ADICIONAL', payload: val })}
              />
            </View>
          )}
        </View>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: isDark ? "#1E1B4B" : "#FFFFFF",
              borderTopColor: borderColor,
            },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>
              Subtotal
            </Text>
            <Text style={[styles.summaryVal, { color: textPrimary }]}>
              ${totals.subTotal.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>
              Habitación
            </Text>
            <Text style={[styles.summaryVal, { color: textPrimary }]}>
              ${totals.precioHabitacionActual.toLocaleString()}
            </Text>
          </View>
          {(selectedHabitacion?.comision_anfitriona ?? 0) > 0 && selectedHostesses.length > 0 && (
            <View style={[styles.summaryRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: borderColor }]}>
              <Text style={[styles.summaryLabel, { color: '#10B981', fontWeight: '800' }]}>
                Comisión p/Anf
              </Text>
              <Text style={[styles.summaryVal, { color: '#10B981', fontWeight: '800' }]}>
                ${totals.comisionPorAnfitriona.toLocaleString()} x {selectedHostesses.length}
              </Text>
            </View>
          )}
          {metodoPago === "tarjeta" && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>
                Impuesto IVA (20%)
              </Text>
              <Text style={[styles.summaryVal, { color: "#10B981" }]}>
                +${totals.iva.toLocaleString()}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.summaryRow,
              {
                marginTop: 12,
                borderTopWidth: 1,
                borderTopColor: borderColor,
                paddingTop: 12,
              },
            ]}
          >
            <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>
              TOTAL SERVICIO
            </Text>
            <Text style={[styles.totalValFinal, { color: accentColor }]}>
              ${totals.total.toLocaleString()}
            </Text>
          </View>
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: accentColor },
              (submitting || !cajaAbierta) && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={submitting || !cajaAbierta}
            accessibilityLabel="Generar nuevo servicio"
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Generar Servicio</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <RoomSelectModal
        visible={roomModalVisible}
        rooms={habitaciones.filter((room) => Number(room.precio ?? room.price ?? 0) > 0)}
        selectedRoomId={
          selectedHabitacion?.id_habitacion || selectedHabitacion?.id
        }
        onClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: false })}
        onSelect={(room) => {
          dispatch({ type: 'SET_SELECTED_HABITACION', payload: room });
          if ((room.comision_anfitriona ?? 0) > 0) {
            dispatch({ type: 'SET_PRECIO_SERVICIO', payload: "0" });
          }
          dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: false });
        }}
      />

      <HostessSelectModal
        visible={hostessModalVisible}
        hostesses={anfitrionas}
        selectedIds={selectedHostesses}
        max={maxHostesses}
        onClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'hostess', visible: false })}
        onToggle={toggleHostess}
      />

      <ClientSelectModal
        visible={clientModalVisible}
        clients={clientes}
        selectedIds={selectedClients}
        max={maxClients}
        onClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: false })}
        onToggle={toggleClient}
      />
    
      <Modal
        animationType="fade"
        transparent={true}
        visible={balanceModalVisible}
        onRequestClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'balance', visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor, padding: 24, height: 'auto' }]}>
            <Text style={[styles.modalTitleText, { color: textPrimary, marginBottom: 8 }]}>Cargar Saldo Prepago</Text>
            <Text style={{ color: textSecondary, marginBottom: 20 }}>Ingresa el monto a cargar para {selectedClientData?.nombre} {selectedClientData?.apellido}</Text>
            
            <View style={[styles.inputWrapper, { borderColor, marginBottom: 20 }]}>
              <Ionicons name="cash-outline" size={20} color={textSecondary} />
              <TextInput
                style={[styles.textInput, { color: textPrimary }]}
                placeholder="Monto"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
                value={balanceAmount}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9]/g, "");
                  dispatch({ 
                    type: 'SET_BALANCE_AMOUNT', 
                    payload: clean === "" ? "" : parseInt(clean).toLocaleString("es-CL").replace(/,/g, ".") 
                  });
                }}
                autoFocus
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable 
                onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'balance', visible: false })}
                style={{ flex: 1, height: 50, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ color: textPrimary, fontWeight: 'bold' }}>Cancelar</Text>
              </Pressable>
              
              <Pressable 
                onPress={handleLoadBalance}
                disabled={balanceSubmitting || !balanceAmount}
                style={{ flex: 1, height: 50, borderRadius: 12, backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center', opacity: (balanceSubmitting || !balanceAmount) ? 0.7 : 1 }}
              >
                {balanceSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Cargar Saldo</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(155,155,155,0.1)',
  },
  headerTitle: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: "500", opacity: 0.8 },
  scrollContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 20,
    letterSpacing: 1,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  selectorLabel: { fontSize: 12, fontWeight: "700" },
  selectorVal: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  inputGroupLabel: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  textInput: { flex: 1, marginLeft: 10, fontSize: 18, fontWeight: "700" },
  summaryCard: {
    marginTop: 10,
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    elevation: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 14, fontWeight: "600" },
  summaryVal: { fontSize: 15, fontWeight: "800" },
  totalLabelFinal: { fontSize: 16, fontWeight: "900" },
  totalValFinal: { fontSize: 28, fontWeight: "900" },
  submitBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnText: { color: "#FFF", fontSize: 17, fontWeight: "900" },
  backBtnRight: {
      flexDirection: 'row', 
      alignItems: 'center', 
      height: 38, 
      borderRadius: 12, 
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      gap: 6
  },
  backTextRight: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  detailModal: { borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalTitleText: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalSubtitle: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 20 },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16 },
  modalBody: { width: '100%' },
  closeBtn: { padding: 8 },
  modalBreakdown: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  breakdownItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownItemLabel: { fontSize: 13, fontWeight: '600' },
  breakdownItemValue: { fontSize: 13, fontWeight: '800' },
});



