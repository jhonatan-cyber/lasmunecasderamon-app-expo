import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  ActivityIndicator,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { apiClientSafe } from "@/api/client";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useTimer } from "@/context/TimerContext";
import { showToast } from "@/hooks/utils/cartUtils";
import { blockOffline } from "@/utils/offlineGuard";
import type { Timer } from "@/context/types";
export function ServiceAssignmentActions({ item }: { item: Timer }) {
  const router = useRouter();
  const { refreshTimers } = useTimer();
  const { bg, textPrimary, textSecondary, accentColor, borderColor } =
    useAccentColor();
  const [open, setOpen] = useState(false),
    [loading, setLoading] = useState(false);
  const [opciones, setOpciones] = useState<{ id: string; nombre: string }[]>(
    [],
  );
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [actuales, setActuales] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const nuevas = seleccion.filter((id) => !actuales.includes(id));
  const retiradas = actuales.filter((id) => !seleccion.includes(id));
  const changed = nuevas.length > 0 || retiradas.length > 0;
  async function abrir() {
    if (!blockOffline("servicio")) return;
    setOpen(true);
    setSearch("");
    setLoading(true);
    try {
      const [service, hosts] = (await Promise.all([
        apiClientSafe(`/servicios/${item.servicioId}`),
        apiClientSafe("/anfitrionas"),
      ])) as any[];
      if (!service.success || !hosts.success) throw new Error();
      const ids = (service.data.anfitrionas_ids || "")
        .split(",")
        .filter(Boolean);
      const names = (service.data.anfitrionas_nombres || "")
        .split(",")
        .map((s: string) => s.trim());
      setSeleccion(ids);
      setActuales(ids);
      const actuales = ids.map((id: string, i: number) => ({
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
          [...actuales, ...disponibles].map((h) => [h.id, h]),
        ).values(),
      ]);
    } catch {
      showToast("Error", "No se pudo cargar las anfitrionas");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }
  async function guardar() {
    if (loading || !changed || !blockOffline("servicio")) return;
    setLoading(true);
    try {
      const res: any = await apiClientSafe(
        `/servicios/${item.servicioId}/anfitrionas`,
        { method: "PATCH", body: JSON.stringify({ usuarios: seleccion }) },
      );
      if (!res.success) throw new Error(res.message || "No se pudo actualizar");
      await refreshTimers();
      setOpen(false);
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
  if (
    item.tipoTransaccion === "venta" ||
    item.tipoTransaccion === "cuenta" ||
    ![2, 3].includes(Number(item.estado))
  )
    return null;
  return (
    <>
      <View style={{ gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/cajero/nueva-venta",
              params: { servicio_id: item.servicioId },
            })
          }
          style={{
            padding: 12,
            borderRadius: 30,
            backgroundColor: accentColor,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>
            Agregar venta
          </Text>
        </Pressable>
        <Pressable
          onPress={abrir}
          style={{ padding: 12, borderRadius: 30, borderWidth: 1, borderColor }}
        >
          <Text style={{ color: textPrimary, textAlign: "center" }}>
            Cambiar o liberar anfitrionas
          </Text>
        </Pressable>
      </View>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{ flex: 1, padding: 24, paddingTop: 54, backgroundColor: bg }}
        >
          <Text style={{ color: textPrimary, fontSize: 20, fontWeight: "700" }}>
            Anfitrionas de la habitación
          </Text>
          <Text style={{ color: textSecondary, marginVertical: 16 }}>
            Las comisiones registradas se conservan. Puedes liberar todas sin
            finalizar el servicio.
          </Text>
          <Text style={{ color: textSecondary, marginBottom: 12 }}>
            {seleccion.length} seleccionadas · {nuevas.length} entran ·{" "}
            {retiradas.length} salen
          </Text>
          <TextInput
            accessibilityLabel="Buscar anfitriona"
            placeholder="Buscar anfitriona..."
            placeholderTextColor={textSecondary}
            value={search}
            onChangeText={setSearch}
            style={{
              borderWidth: 1,
              borderColor,
              borderRadius: 30,
              padding: 12,
              color: textPrimary,
              marginBottom: 12,
            }}
          />
          {loading && <ActivityIndicator color={accentColor} />}
          <ScrollView>
            {opciones
              .filter((h) =>
                h.nombre.toLowerCase().includes(search.trim().toLowerCase()),
              )
              .map((h) => (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: seleccion.includes(h.id),
                    disabled: loading,
                  }}
                  disabled={loading}
                  key={h.id}
                  onPress={() =>
                    setSeleccion((prev) =>
                      prev.includes(h.id)
                        ? prev.filter((id) => id !== h.id)
                        : [...prev, h.id],
                    )
                  }
                  style={{
                    padding: 14,
                    borderBottomWidth: 1,
                    borderColor,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: seleccion.includes(h.id)
                      ? `${accentColor}12`
                      : "transparent",
                  }}
                >
                  <Ionicons
                    name={
                      seleccion.includes(h.id) ? "checkbox" : "square-outline"
                    }
                    size={24}
                    color={
                      seleccion.includes(h.id) ? accentColor : textSecondary
                    }
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: textPrimary, fontWeight: "600" }}>
                      {h.nombre}
                    </Text>
                    <Text style={{ color: textSecondary, fontSize: 12 }}>
                      {actuales.includes(h.id)
                        ? seleccion.includes(h.id)
                          ? "Permanece en el privado"
                          : "Se liberará al guardar"
                        : seleccion.includes(h.id)
                          ? "Entrará al privado"
                          : "Disponible"}
                    </Text>
                  </View>
                </Pressable>
              ))}
          </ScrollView>
          <Pressable
            disabled={loading}
            onPress={() => setSeleccion([])}
            style={{ padding: 16 }}
          >
            <Text style={{ color: textPrimary, textAlign: "center" }}>
              Liberar todas
            </Text>
          </Pressable>
          <Pressable
            disabled={loading || !changed}
            onPress={guardar}
            style={{
              padding: 16,
              borderRadius: 30,
              backgroundColor: accentColor,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
              {loading
                ? "Guardando…"
                : seleccion.length
                  ? "Guardar cambios"
                  : "Confirmar liberación"}
            </Text>
          </Pressable>
          <Pressable onPress={() => setOpen(false)} style={{ padding: 16 }}>
            <Text style={{ color: textPrimary, textAlign: "center" }}>
              Cerrar
            </Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
