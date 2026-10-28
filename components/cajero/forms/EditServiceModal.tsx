import { styles } from "./EditServiceModal.styles";
import { createQueueId } from "@/utils/ids";
import { apiClientSafe } from "@/api/client";
import { HostessSelectModal } from "@/components/cajero/forms/HostessSelectModal";
import {
  PaymentMethodSelect,
  type PaymentMethod,
} from "@/components/cajero/forms/PaymentMethodSelect";
import { TimeSelector } from "@/components/ui/TimeSelector";
import type { Timer } from "@/context/types";
import { getIvaDecimal } from "@/hooks/utils/cuentaUtils";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useDebouncedEventListener } from "@/hooks/useDebouncedEventListener";
import { blockOffline } from "@/utils/offlineGuard";
import { REALTIME_EVENT_NAMES } from "@/utils/realtime";
import { showToast } from "@/utils/toast-lazy";
import Ionicons from "@expo/vector-icons/Ionicons";
import { EditServiceInfoBox } from "./EditServiceModalParts/EditServiceInfoBox";
import { EditServiceSummary } from "./EditServiceModalParts/EditServiceSummary";
import { EditServiceFooter } from "./EditServiceModalParts/EditServiceFooter";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import logger from "@/utils/logger";
interface Anfitriona {
  id_usuario: number;
  nombre: string;
  apellido: string;
  nick: string;
  status?: number;
}

interface RoomRaw {
  nombre?: string;
  name?: string;
  precio?: number;
  price?: number;
  tiempo?: number;
  time?: number;
  comision_anfitriona?: number;
  [key: string]: unknown;
}

interface ServicioDetailRaw {
  usuarios?: Anfitriona[];
}

interface EditServiceModalProps {
  visible: boolean;
  onClose: () => void;
  timer: Timer | null;
  onSuccess: () => void;
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({
  visible,
  onClose,
  timer,
  onSuccess,
}) => {
  const { cardBg, borderColor, accentColor, bg, textPrimary, textSecondary } =
    useAccentColor();
  const [loading, setLoading] = useState(false);
  const savingRef = useRef(false);
  const operationRef = useRef({ signature: "", key: "" });
  const [currentHostessIds, setCurrentHostessIds] = useState<string[]>([]);
  const [loadingAnfitrionas, setLoadingAnfitrionas] = useState(false);
  const [tiempo, setTiempo] = useState<number>(30);
  const [precioServicio, setPrecioServicio] = useState<string>("0");
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>("efectivo");
  const [anfitrionasDisponibles, setAnfitrionasDisponibles] = useState<
    Anfitriona[]
  >([]);
  const [anfitrionasSeleccionadas, setAnfitrionasSeleccionadas] = useState<
    (string | number)[]
  >([]);
  const [showHostessModal, setShowHostessModal] = useState(false);
  const [precioHabitacionSinComision, setPrecioHabitacionSinComision] =
    useState<number>(0);

  const liveStateRef = useRef<{
    seleccionadas: (string | number)[];
    disponibles: Anfitriona[];
  }>({ seleccionadas: [], disponibles: [] });

  useEffect(() => {
    liveStateRef.current = {
      seleccionadas: anfitrionasSeleccionadas,
      disponibles: anfitrionasDisponibles,
    };
  }, [anfitrionasSeleccionadas, anfitrionasDisponibles]);

  const fetchHabitacionSinComision = useCallback(async () => {
    try {
      const res = await apiClientSafe<RoomRaw[]>("/rooms");
      logger.debug("[EditServiceModal] Respuesta habitaciones", {
        response: res,
      });

      if (res.success && Array.isArray(res.data)) {
        logger.debug("[EditServiceModal] Total habitaciones", {
          count: res.data.length,
        });

        res.data.forEach((h: RoomRaw, index: number) => {
          logger.debug(`[EditServiceModal] Habitación ${index}:`, {
            nombre: h.nombre || h.name,
            precio: h.precio || h.price,
            tiempo: h.tiempo || h.time,
            comision: h.comision_anfitriona,
          });
        });

        const habitacionSinComision = res.data.find((h: RoomRaw) => {
          const precio = h.precio || h.price || 0;
          const tiempo = h.tiempo || h.time || 0;
          const comision = h.comision_anfitriona || 0;
          const cumple = comision === 0 && precio > 0 && tiempo > 0;
          return cumple;
        });

        if (habitacionSinComision) {
          const precio =
            habitacionSinComision.precio || habitacionSinComision.price || 0;
          setPrecioHabitacionSinComision(precio);
        } else {
          setPrecioHabitacionSinComision(0);
        }
      }
    } catch {
      setPrecioHabitacionSinComision(0);
    }
  }, []);

  const fetchAnfitrionas = useCallback(async () => {
    setLoadingAnfitrionas(true);
    try {
      const disponiblesRes = await apiClientSafe<Anfitriona[]>(
        "/hostesses/available",
      );
      const servicioRes = await apiClientSafe<ServicioDetailRaw>(
        `/services/${timer?.servicioId}`,
      );
      let todasAnfitrionas: Anfitriona[] = [];

      if (disponiblesRes.success && Array.isArray(disponiblesRes.data)) {
        todasAnfitrionas = [...disponiblesRes.data];
      }

      if (servicioRes.success && servicioRes.data?.usuarios) {
        const anfitrionasServicio = servicioRes.data.usuarios;
        const currentIds = anfitrionasServicio.map((anf) =>
          String(anf.id_usuario),
        );
        setCurrentHostessIds(currentIds);
        setAnfitrionasSeleccionadas(currentIds);
        anfitrionasServicio.forEach((anf: Anfitriona) => {
          if (
            !todasAnfitrionas.find(
              (a) => String(a.id_usuario) === String(anf.id_usuario),
            )
          ) {
            todasAnfitrionas.push(anf);
          }
        });
      }

      setAnfitrionasDisponibles(todasAnfitrionas);
    } catch {
      showToast({
        type: "error",
        text1: "Error",
        text2: "No se pudieron cargar las anfitrionas",
      });
    } finally {
      setLoadingAnfitrionas(false);
    }
  }, [timer]);

  useEffect(() => {
    if (visible && timer) {
      const timerId = setTimeout(() => {
        setPrecioServicio("0");
        setTiempo(30);
        setMetodoPago("efectivo");

        let ids: string[] = [];
        if (timer.anfitrionas_ids && Array.isArray(timer.anfitrionas_ids)) {
          ids = timer.anfitrionas_ids.map((id) => String(id));
        } else if (timer.anfitrionas && typeof timer.anfitrionas === "string") {
        }

        setAnfitrionasSeleccionadas(ids);
        void fetchAnfitrionas();
        void fetchHabitacionSinComision();
      }, 0);

      return () => clearTimeout(timerId);
    }
  }, [visible, timer, fetchAnfitrionas, fetchHabitacionSinComision]);

  useDebouncedEventListener(
    REALTIME_EVENT_NAMES.refreshPersonal,
    useCallback(() => {
      const { seleccionadas, disponibles } = liveStateRef.current;
      void (async () => {
        try {
          const res = await apiClientSafe<Anfitriona[]>("/hostesses/available");
          if (!res.success || !Array.isArray(res.data)) return;
          const elegidasIds = seleccionadas.map(String);
          const conservadas = disponibles.filter((anf) =>
            elegidasIds.includes(String(anf.id_usuario)),
          );
          setAnfitrionasDisponibles([
            ...new Map(
              [...conservadas, ...res.data].map((anf) => [
                String(anf.id_usuario),
                anf,
              ]),
            ).values(),
          ]);
        } catch { }
      })();
    }, []),
    500,
    visible,
  );

  const toggleAnfitriona = (id: string | number) => {
    setAnfitrionasSeleccionadas((prev) => {
      const isSelected = prev.some((sid) => String(sid) === String(id));
      if (isSelected) {
        return prev.filter((sid) => String(sid) !== String(id));
      } else {
        return [...prev, id];
      }
    });
  };

  const getSelectedHostessNames = () => {
    return (
      anfitrionasDisponibles
        .filter((anf) =>
          anfitrionasSeleccionadas.some(
            (sid) => String(sid) === String(anf.id_usuario),
          ),
        )
        .map(
          (anf) =>
            anf.nick || [anf.nombre, anf.apellido].filter(Boolean).join(" "),
        )
        .join(", ") || "Ninguna seleccionada"
    );
  };

  const handleSave = async () => {
    if (!timer || savingRef.current || loadingAnfitrionas) return;
    const timeVal = tiempo;
    if (!timeVal || timeVal <= 0) {
      showToast({
        type: "error",
        text1: "Error",
        text2: "El tiempo debe ser mayor a 0",
      });
      return;
    }

    if (anfitrionasSeleccionadas.length === 0) {
      showToast({
        type: "error",
        text1: "Error",
        text2: "Debe seleccionar al menos una anfitriona",
      });
      return;
    }

    if (!blockOffline("servicio")) return;

    savingRef.current = true;
    setLoading(true);
    try {
      const numericPrecio = parseInt(precioServicio.replace(/\./g, "")) || 0;
      const numAnfitrionas = anfitrionasSeleccionadas.length;
      const factor = timeVal === 60 ? 2 : 1;
      const precioServicioTotal = numericPrecio * numAnfitrionas * factor;
      const precioHabitacionTotal =
        precioHabitacionSinComision * numAnfitrionas * factor;
      let calculatedIva = 0;
      if (metodoPago === "tarjeta") {
        calculatedIva = Math.floor(precioServicioTotal * getIvaDecimal());
      }

      let totalGeneral =
        precioServicioTotal + precioHabitacionTotal + calculatedIva;

      if (metodoPago === "tarjeta") {
        const totalRedondeado = Math.ceil(totalGeneral / 5000) * 5000;
        const excedente = totalRedondeado - totalGeneral;
        totalGeneral = totalRedondeado;
        calculatedIva += excedente;
      }

      const payload = {
        es_temporal: true,
        servicio_original_id: String(timer.servicioId),
        cliente_id: timer.cliente_id ? String(timer.cliente_id) : null,
        habitacion_id: String(timer.roomId),
        precio_habitacion: precioHabitacionTotal,
        precio_servicio: precioServicioTotal,
        iva: calculatedIva,
        sub_total: precioServicioTotal,
        total: totalGeneral,
        tiempo: timeVal,
        metodo_pago: metodoPago,
        usuarios: anfitrionasSeleccionadas.map((id) => String(id)),
        clientes: timer.cliente_id ? [String(timer.cliente_id)] : [],
      };
      const signature = JSON.stringify(payload);
      if (operationRef.current.signature !== signature)
        operationRef.current = { signature, key: createQueueId() };
      const res = await apiClientSafe("/services/temporary", {
        method: "POST",
        headers: { "x-idempotency-key": operationRef.current.key },
        body: JSON.stringify(payload),
      });

      if (res.success) {
        showToast({
          type: "success",
          text1: "Éxito",
          text2: "Nuevo servicio iniciado (Principal pausado)",
        });
        onSuccess();
        onClose();
      } else {
        showToast({
          type: "error",
          text1: "Error",
          text2: res.message || "No se pudo crear el servicio temporal",
        });
      }
    } catch {
      showToast({
        type: "error",
        text1: "Error",
        text2: "Ocurrió un error inesperado",
      });
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  if (!timer) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!savingRef.current) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: bg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textPrimary }]}>
              Servicio adicional
            </Text>
            <Pressable
              onPress={onClose}
              disabled={loading || loadingAnfitrionas}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            <EditServiceInfoBox
              roomName={timer.roomName}
              clienteNombre={timer.clienteNombre}
              anfitrionas={timer.anfitrionas}
              precioHabitacionSinComision={precioHabitacionSinComision}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textSecondary }]}>
                ANFITRIONAS ({anfitrionasSeleccionadas.length} seleccionadas)
              </Text>
              <Pressable
                style={[styles.inputWrapper, { borderColor }]}
                onPress={() => setShowHostessModal(true)}
              >
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={textSecondary}
                />
                <Text
                  style={[
                    styles.input,
                    {
                      color:
                        anfitrionasSeleccionadas.length > 0
                          ? textPrimary
                          : textSecondary,
                    },
                  ]}
                >
                  {getSelectedHostessNames()}
                </Text>
                <Ionicons name="chevron-down" size={20} color={textSecondary} />
              </Pressable>
            </View>

            <TimeSelector
              value={tiempo}
              onChange={setTiempo}
              label="TIEMPO (MINUTOS)"
            />

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textSecondary }]}>
                PRECIO SERVICIO (POR ANFITRIONA)
              </Text>
              <View style={[styles.inputWrapper, { borderColor }]}>
                <Ionicons name="cash-outline" size={20} color={textSecondary} />
                <TextInput
                  style={[styles.input, { color: textPrimary }]}
                  value={precioServicio}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, "");
                    setPrecioServicio(
                      clean === ""
                        ? "0"
                        : parseInt(clean)
                          .toLocaleString("es-CL")
                          .replace(/,/g, "."),
                    );
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={textSecondary}
                />
              </View>
            </View>

            <PaymentMethodSelect
              selectedMethod={metodoPago}
              onSelect={setMetodoPago}
            />

            {anfitrionasSeleccionadas.length > 0 && (
              <EditServiceSummary
                anfitrionasCount={anfitrionasSeleccionadas.length}
                precioServicio={precioServicio}
                precioHabitacionSinComision={precioHabitacionSinComision}
                metodoPago={metodoPago}
                accentColor={accentColor}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            )}

            <View style={styles.warningBox}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                Al guardar, el servicio actual de {timer.roomName} se pausará
                automáticamente.
              </Text>
            </View>
          </ScrollView>

          <EditServiceFooter
            loading={loading}
            disabled={loading || loadingAnfitrionas}
            accentColor={accentColor}
            borderColor={borderColor}
            textSecondary={textSecondary}
            onCancel={onClose}
            onSave={handleSave}
          />
        </View>

        <HostessSelectModal
          visible={showHostessModal}
          onClose={() => setShowHostessModal(false)}
          onToggle={toggleAnfitriona}
          hostesses={anfitrionasDisponibles.map((anf) => ({
            id: anf.id_usuario,
            id_usuario: anf.id_usuario,
            nick: anf.nick,
            estado_servicio: currentHostessIds.includes(String(anf.id_usuario))
              ? 1
              : 0,
            status: anf.status || 0,
          }))}
          allowedOccupiedIds={currentHostessIds}
          selectedIds={anfitrionasSeleccionadas.map((id) => String(id))}
          title="Seleccionar Anfitrionas"
        />
      </View>
    </Modal>
  );
};
