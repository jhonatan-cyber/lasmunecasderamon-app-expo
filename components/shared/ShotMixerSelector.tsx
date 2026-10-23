import {
  requiresShortMixer,
  bottleMixerUnits,
  shortMixerConsumption,
  hostessMixerMl,
} from "@/hooks/utils/productConfiguration";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiClientSafe } from "@/api/client";
import { getMirror, MIRROR_MAX_AGE_MS } from "@/services/mirror";
import { useAccentColor } from "@/hooks/useAccentColor";
import { availableOrderMixers } from "@/hooks/utils/orderMixers";
import { OrderProductPhoto } from "./OrderProductPhoto";

export type ShortMixer = {
  presentacion_id: string;
  nombre?: string;
  unidades?: number;
  ml_por_corto?: number;
  foto?: string;
};
export function ShotMixerSelector({
  items,
  onChange,
  bottle = false,
  compact = false,
}: {
  compact?: boolean;
  bottle?: boolean;
  items: {
    opciones_venta?: unknown;
    shot_anfitriona?: boolean;
    nombre: string;
    presentacion_id?: string;
    cantidad: number;
    tipo_venta?: string;
    acompanamiento_corto?: ShortMixer;
    acompanamiento_botella?: {
      presentacion_id: string;
      unidades: number;
      nombre?: string;
      foto?: string;
    };
  }[];
  onChange: (index: number, mixer: ShortMixer) => void;
}) {
  const { cardBg, textPrimary, textSecondary, borderColor, accentColor } =
    useAccentColor();
  const [bar, setBar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    getMirror()
      .readThroughDetailed<any>(
        "bar:short-mixers",
        () => apiClientSafe("/bar"),
        { maxAgeMs: MIRROR_MAX_AGE_MS.catalogo },
      )
      .then((result) => {
        if (!alive) return;
        if (!result.data.success || !Array.isArray(result.data.data))
          throw new Error();
        setBar(result.data.data);
        setCached(result.fromCache);
      })
      .catch(() => {
        if (alive)
          setError(
            "No se pudo cargar el bar. Conéctate para guardar el catálogo.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reload]);
  const needsMixer = (item: any) =>
    bottle
      ? item.tipo_venta !== "shot" && bottleMixerUnits(item) > 0
      : requiresShortMixer(item);
  const choices = availableOrderMixers(
    bar,
    items[selected ?? -1],
    bottle,
    search,
  );
  if (!items.some(needsMixer)) return null;
  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderColor,
        borderWidth: compact ? 0 : 1,
        borderRadius: 16,
        padding: compact ? 0 : 16,
        gap: 12,
      }}
    >
      {!compact && (
        <Text style={{ color: textPrimary, fontWeight: "700" }}>
          {bottle
            ? "Acompa\u00f1amiento por botella"
            : "Soda o gaseosa para los cortos"}
        </Text>
      )}
      <Text style={{ color: textSecondary }}>
        {bottle
          ? "Incluido en el precio. Se descuentan las unidades configuradas por botella."
          : "Incluida en el precio. Cliente: producto completo. Anfitriona: ml configurados."}
      </Text>
      {cached && (
        <Text style={{ color: textSecondary }}>
          Catálogo guardado: el stock se comprobará al sincronizar.
        </Text>
      )}
      {loading && <ActivityIndicator color={accentColor} />}
      {!!error && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setLoading(true);
            setError("");
            setReload((n) => n + 1);
          }}
        >
          <Text style={{ color: textPrimary }}>{error} Reintentar</Text>
        </Pressable>
      )}
      {items.map(
        (item, index) =>
          needsMixer(item) && (
            <View key={index} style={{ gap: 8 }}>
              <Text style={{ color: textPrimary }}>
                {item.nombre} · {item.cantidad} {bottle ? "botellas" : "cortos"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Soda o gaseosa para ${item.nombre}`}
                disabled={loading}
                onPress={() => {
                  setSearch("");
                  setSelected(index);
                }}
                style={{
                  padding: 12,
                  borderColor,
                  borderWidth: 1,
                  borderRadius: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {(bottle
                    ? item.acompanamiento_botella
                    : item.acompanamiento_corto) && (
                    <OrderProductPhoto
                      foto={
                        (bottle
                          ? item.acompanamiento_botella
                          : item.acompanamiento_corto
                        )?.foto
                      }
                      name={
                        (bottle
                          ? item.acompanamiento_botella
                          : item.acompanamiento_corto
                        )?.nombre || "Bebida"
                      }
                    />
                  )}
                  <Text style={{ color: textPrimary, flex: 1 }}>
                    {(bottle
                      ? item.acompanamiento_botella?.nombre
                      : item.acompanamiento_corto?.nombre) ||
                      "Seleccionar producto o sabor del bar"}
                  </Text>
                </View>
              </Pressable>
              <Text style={{ color: textSecondary }}>
                {bottle
                  ? item.cantidad * bottleMixerUnits(item)
                  : item.cantidad *
                    (item.shot_anfitriona ? hostessMixerMl(item) : 1)}{" "}
                {!bottle && item.shot_anfitriona
                  ? "ml incluidos"
                  : "unidades completas incluidas"}
              </Text>
            </View>
          ),
      )}
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0008",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              padding: 20,
              maxHeight: "80%",
              gap: 12,
            }}
          >
            <Text style={{ color: textPrimary, fontWeight: "700" }}>
              Elegir producto o sabor del bar
            </Text>
            <TextInput
              accessibilityLabel="Buscar bebida en bar"
              placeholder="Buscar producto o sabor"
              placeholderTextColor={textSecondary}
              value={search}
              onChangeText={setSearch}
              style={{
                color: textPrimary,
                borderColor,
                borderWidth: 1,
                padding: 12,
                borderRadius: 10,
              }}
            />
            <ScrollView
              style={{ maxHeight: 360 }}
              keyboardShouldPersistTaps="handled"
            >
              {choices.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => {
                    if (selected !== null)
                      onChange(selected, {
                        presentacion_id: p.id,
                        nombre: `${p.producto_nombre} ${p.nombre}`,
                        foto:
                          p.foto && p.foto !== "default.png"
                            ? p.foto
                            : p.producto_foto,
                        ...(bottle
                          ? { unidades: bottleMixerUnits(items[selected]) }
                          : shortMixerConsumption(items[selected])),
                      });
                    setSelected(null);
                  }}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <OrderProductPhoto
                      foto={
                        p.foto && p.foto !== "default.png"
                          ? p.foto
                          : p.producto_foto
                      }
                      name={`${p.producto_nombre} ${p.nombre}`}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: textPrimary }}>
                        {p.producto_nombre} {p.nombre}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: textSecondary }}>
                    {p.stock_bar} en bar · {Number(p.ml_abierta ?? 0)} ml
                    abiertos
                  </Text>
                </Pressable>
              ))}
              {!choices.length && (
                <Text style={{ color: textSecondary }}>
                  Sin productos disponibles en el bar
                </Text>
              )}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelected(null)}
              style={{ padding: 12 }}
            >
              <Text style={{ color: accentColor, textAlign: "center" }}>
                Cerrar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
