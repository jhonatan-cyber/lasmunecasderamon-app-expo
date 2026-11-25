import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppModal as Modal } from "@/components/ui/AppModal";
import { apiClientSafe } from "@/api/client";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useTimer } from "@/context/TimerContext";
import { showToast } from "@/hooks/utils/cartUtils";
import { blockOffline } from "@/utils/offlineGuard";
import { useDebouncedEventListener } from "@/hooks/useDebouncedEventListener";
import { REALTIME_EVENT_NAMES } from "@/utils/realtime";
import { FontSize, MIN_TOUCH_TARGET, BorderRadius, HitSlop } from "@/constants/spacing";
import { haptic } from "@/utils/haptics";
import type { Timer } from "@/context/types";

interface ServiceHostessesModalProps {
  visible: boolean;
  item: Timer | null;
  onClose: () => void;
}

/**
 * Modo controlado del antiguo panel de anfitrionas: la pantalla decide cuándo
 * abrirlo (menú de la tarjeta o hoja de detalle) y aquí solo se edita.
 */
export function ServiceHostessesModal({ visible, item, onClose }: ServiceHostessesModalProps) {
  const { refreshTimers } = useTimer();
  const { bg, cardBg, textPrimary, textSecondary, accentColor, accentText, borderColor, surfaceMuted, isDark } =
    useAccentColor();
  const [loading, setLoading] = useState(false);
  const [opciones, setOpciones] = useState<{ id: string; nombre: string }[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [actuales, setActuales] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const servicioId = item?.servicioId;
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const nuevas = seleccion.filter((id) => !actuales.includes(id));
  const retiradas = actuales.filter((id) => !seleccion.includes(id));
  const changed = nuevas.length > 0 || retiradas.length > 0;

  const liveStateRef = useRef<{
    open: boolean;
    actuales: string[];
    opciones: { id: string; nombre: string }[];
  }>({ open: false, actuales: [], opciones: [] });

  useEffect(() => {
    liveStateRef.current = { open: visible, actuales, opciones };
  }, [visible, actuales, opciones]);

  useDebouncedEventListener(
    REALTIME_EVENT_NAMES.refreshPersonal,
    useCallback(() => {
      const {
        open: isOpen,
        actuales: actualesIds,
        opciones: actualesOpciones,
      } = liveStateRef.current;
      if (!isOpen) return;
      void (async () => {
        try {
          const hosts: any = await apiClientSafe("/hostesses");
          if (!hosts?.success) return;
          const disponibles = (hosts.data || [])
            .filter(
              (h: any) =>
                actualesIds.includes(String(h.id_usuario || h.id)) ||
                Number(h.estado_servicio || 0) === 0,
            )
            .map((h: any) => ({
              id: String(h.id_usuario || h.id),
              nombre: h.nick || h.nombre || h.name,
            }));
          const previas = actualesOpciones.filter((o) =>
            actualesIds.includes(o.id),
          );
          setOpciones([
            ...new Map<string, { id: string; nombre: string }>(
              [...previas, ...disponibles].map((h) => [h.id, h]),
            ).values(),
          ]);
        } catch { }
      })();
    }, []),
  );

  useEffect(() => {
    if (!visible || !servicioId) return;
    let cancelado = false;
    void (async () => {
      setSearch("");
      setSeleccion([]);
      setActuales([]);
      setOpciones([]);
      setLoading(true);
      try {
        const [service, hosts] = (await Promise.all([
          apiClientSafe(`/services/${servicioId}`),
          apiClientSafe("/hostesses"),
        ])) as any[];
        if (cancelado) return;
        if (!service.success || !hosts.success) throw new Error();
        const ids: string[] = (service.data.anfitrionas_ids || "")
          .split(",")
          .filter(Boolean);
        const names = (service.data.anfitrionas_nombres || "")
          .split(",")
          .map((s: string) => s.trim());
        setSeleccion(ids);
        setActuales(ids);
        const actualesHosts = ids.map((id: string, i: number) => ({
          id,
          nombre: names[i] || "Anfitriona actual",
        }));
        const disponibles = hosts.data
          .filter(
            (h: any) =>
              ids.includes(String(h.id_usuario || h.id)) ||
              Number(h.estado_servicio || 0) === 0,
          )
          .map((h: any) => ({
            id: String(h.id_usuario || h.id),
            nombre: h.nick || h.nombre || h.name,
          }));
        setOpciones([
          ...new Map<string, { id: string; nombre: string }>(
            [...actualesHosts, ...disponibles].map((h) => [h.id, h]),
          ).values(),
        ]);
      } catch {
        if (cancelado) return;
        showToast("Error", "No se pudo cargar las anfitrionas");
        onCloseRef.current();
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [visible, servicioId]);

  async function guardar() {
    if (loading || !changed || !servicioId || !blockOffline("servicio")) return;
    setLoading(true);
    try {
      const res: any = await apiClientSafe(
        `/services/${servicioId}/hostesses`,
        { method: "PATCH", body: JSON.stringify({ usuarios: seleccion }) },
      );
      if (!res.success) throw new Error(res.message || "No se pudo actualizar");
      await refreshTimers();
      onClose();
      showToast(
        "Servicio",
        seleccion.length ? "Anfitrionas actualizadas" : "Anfitrionas liberadas",
        "success",
      );
    } catch (err) {
      showToast(
        "Error",
        err instanceof Error ? err.message : "No se pudo actualizar",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!item) return null;

  // Glow neón en botón de guardar en modo oscuro
  const saveBtnNeonGlow = isDark && changed ? {
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  } : {};

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: cardBg, borderColor, borderTopLeftRadius: BorderRadius.card, borderTopRightRadius: BorderRadius.card }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: textPrimary }]}>Anfitrionas</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {item.roomName || "Habitación"}
              </Text>
            </View>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: surfaceMuted, borderRadius: BorderRadius.full }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar anfitrionas"
            >
              <Ionicons name="close" size={22} color={textPrimary} />
            </Pressable>
          </View>

          <Text style={[styles.help, { color: textSecondary }]}>
            Las comisiones registradas se conservan. Puedes liberar todas sin finalizar el servicio.
          </Text>
          <Text style={[styles.resumen, { color: textSecondary }]}>
            {seleccion.length} seleccionadas · {nuevas.length} entran · {retiradas.length} salen
          </Text>

          <TextInput
            accessibilityLabel="Buscar anfitriona"
            placeholder="Buscar anfitriona"
            placeholderTextColor={textSecondary}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { borderColor, color: textPrimary, backgroundColor: bg, borderRadius: BorderRadius.full }]}
          />

          {loading && <ActivityIndicator color={accentColor} style={styles.loader} />}

          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 8 }}>
            {opciones
              .filter((h) =>
                h.nombre.toLowerCase().includes(search.trim().toLowerCase()),
              )
              .map((h) => {
                const activa = seleccion.includes(h.id);
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: activa, disabled: loading }}
                    disabled={loading}
                    key={h.id}
                    onPress={() =>
                      setSeleccion((prev) =>
                        prev.includes(h.id)
                          ? prev.filter((id) => id !== h.id)
                          : [...prev, h.id],
                      )
                    }
                    style={[
                      styles.hostRow,
                      {
                        borderBottomColor: borderColor,
                        backgroundColor: activa ? `${accentColor}12` : "transparent",
                      },
                    ]}
                  >
                    <Ionicons
                      name={activa ? "checkbox" : "square-outline"}
                      size={24}
                      color={activa ? accentColor : textSecondary}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: textPrimary, fontWeight: "600" }}>{h.nombre}</Text>
                      <Text style={{ color: textSecondary, fontSize: FontSize.xs }}>
                        {actuales.includes(h.id)
                          ? activa
                            ? "Permanece en el privado"
                            : "Se liberará al guardar"
                          : activa
                            ? "Entrará al privado"
                            : "Disponible"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
          </ScrollView>

          <Pressable
            disabled={loading}
            onPress={() => {
              haptic.tap();
              setSeleccion([]);
            }}
            accessibilityRole="button"
            accessibilityLabel="Liberar todas las anfitrionas"
            accessibilityHint="Deselecciona todas las anfitrionas asignadas"
            hitSlop={HitSlop.sm}
            style={({ pressed }) => [
              styles.liberarBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={{ color: textPrimary, textAlign: "center" }}>Liberar todas</Text>
          </Pressable>
          <Pressable
            disabled={loading || !changed}
            onPress={() => {
              haptic.confirm();
              guardar();
            }}
            style={[
              styles.saveBtn,
              { backgroundColor: accentColor, opacity: loading || !changed ? 0.5 : 1 },
              saveBtnNeonGlow,
            ]}
            accessibilityRole="button"
            accessibilityLabel={seleccion.length ? "Guardar cambios de anfitrionas" : "Confirmar liberación de anfitrionas"}
            accessibilityHint="Guarda los cambios en la asignación de anfitrionas"
            accessibilityState={{ busy: loading, disabled: loading || !changed }}
            hitSlop={HitSlop.sm}
          >
            <Text style={[styles.saveText, { color: accentText }]}>
              {loading
                ? "Guardando…"
                : seleccion.length
                  ? "Guardar cambios"
                  : "Confirmar liberación"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    borderTopWidth: 1,
    padding: 20,
    maxHeight: "88%",
    overflow: 'hidden',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginTop: 2,
  },
  closeBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    justifyContent: "center",
    alignItems: "center",
  },
  help: {
    marginTop: 8,
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  resumen: {
    marginVertical: 12,
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
  searchInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: MIN_TOUCH_TARGET,
    fontSize: FontSize.md,
    marginBottom: 8,
  },
  loader: {
    marginVertical: 8,
  },
  list: {
    flexGrow: 0,
  },
  hostRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  liberarBtn: {
    paddingVertical: 12,
  },
  saveBtn: {
    borderRadius: BorderRadius.full,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  saveText: {
    textAlign: "center",
    fontWeight: "900",
    fontSize: FontSize.md,
  },
});
