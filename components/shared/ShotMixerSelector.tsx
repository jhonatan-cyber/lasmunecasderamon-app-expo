import {
  requiresShortMixer,
  bottleMixerUnits,
  shortMixerConsumption,
  hostessMixerMl,
  normalizarAcompanamientoBotella,
} from "@/hooks/utils/productConfiguration";
import type {
  AcompanamientoBotella,
  AcompanamientoBotellaItem,
} from "@/types/cart";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
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

type MixerSourceItem = {
  opciones_venta?: unknown;
  shot_anfitriona?: boolean;
  nombre: string;
  presentacion_id?: string;
  cantidad: number;
  tipo_venta?: string;
  acompanamiento_corto?: ShortMixer;
  acompanamiento_botella?: AcompanamientoBotella;
};

export function ShotMixerSelector({
  items,
  onChange,
  onChangeBottle,
  bottle = false,
  compact = false,
}: {
  compact?: boolean;
  bottle?: boolean;
  items: MixerSourceItem[];
  onChange?: (index: number, mixer: ShortMixer) => void;
  onChangeBottle?: (index: number, sabores: AcompanamientoBotellaItem[]) => void;
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
        "bar:acompanamientos",
        () => apiClientSafe("/bar?acompanamientos=1"),
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
  const needsMixer = (item: MixerSourceItem) =>
    bottle
      ? item.tipo_venta !== "shot" && bottleMixerUnits(item) > 0
      : requiresShortMixer(item);
  const stockOf = (presentacionId: string | undefined) =>
    Number(
      bar.find((b) => String(b.id) === String(presentacionId))?.stock_bar || 0,
    );
  const currentIndex = selected ?? -1;
  const saboresActuales = bottle
    ? normalizarAcompanamientoBotella(items[currentIndex]?.acompanamiento_botella)
    : [];
  const elegidos = new Set(
    saboresActuales.map((sabor) => String(sabor.presentacion_id)),
  );
  const choices = availableOrderMixers(
    bar,
    items[currentIndex],
    bottle,
    search,
  );
  const modalChoices = bottle
    ? choices.filter((choice) => !elegidos.has(String(choice.id)))
    : choices;
  if (!items.some(needsMixer)) return null;

  const distribute = (index: number, next: AcompanamientoBotellaItem[]) =>
    onChangeBottle?.(index, next);
  const addFlavor = (index: number, choice: any) => {
    const sabores = normalizarAcompanamientoBotella(
      items[index]?.acompanamiento_botella,
    );
    const requerido = bottleMixerUnits(items[index]);
    const asignado = sabores.reduce((sum, sabor) => sum + sabor.unidades, 0);
    if (asignado >= requerido) return;
    distribute(index, [
      ...sabores,
      {
        presentacion_id: String(choice.id),
        unidades: 1,
        nombre: `${choice.producto_nombre} ${choice.nombre}`,
        foto:
          choice.foto && choice.foto !== "default.png"
            ? choice.foto
            : choice.producto_foto,
      },
    ]);
  };

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
          ? "Incluido en el precio. Reparte las unidades configuradas entre los sabores que quieras."
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
      {items.map((item, index) => {
        if (!needsMixer(item)) return null;
        const sabores = normalizarAcompanamientoBotella(
          item.acompanamiento_botella,
        );
        const requerido = bottleMixerUnits(item);
        const asignado = sabores.reduce((sum, sabor) => sum + sabor.unidades, 0);
        const restante = Math.max(0, requerido - asignado);
        const botellas = Math.max(1, Number(item.cantidad) || 1);
        const maxFor = (sabor: AcompanamientoBotellaItem) => {
          const otros = asignado - sabor.unidades;
          return Math.max(
            1,
            Math.min(
              requerido - otros,
              Math.floor(stockOf(sabor.presentacion_id) / botellas),
            ),
          );
        };
        return (
          <View key={index} style={{ gap: 8 }}>
            <Text style={{ color: textPrimary }}>
              {item.nombre} · {item.cantidad} {bottle ? "botellas" : "cortos"}
            </Text>
            {bottle ? (
              <>
                <Text style={{ color: textSecondary }}>
                  {restante > 0
                    ? `Reparte ${requerido} unidades por botella · asignado ${asignado}/${requerido}`
                    : `Reparto completo · ${requerido} unidades por botella`}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar sabor para ${item.nombre}`}
                  disabled={loading || restante < 1}
                  onPress={() => {
                    setSearch("");
                    setSelected(index);
                  }}
                  style={{
                    padding: 12,
                    borderColor,
                    borderWidth: 1,
                    borderRadius: 10,
                    opacity: loading || restante < 1 ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: textPrimary }}>Agregar sabor…</Text>
                </Pressable>
                {sabores.map((sabor) => {
                  const max = maxFor(sabor);
                  const nombre = sabor.nombre || sabor.presentacion_id;
                  return (
                    <View
                      key={sabor.presentacion_id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <OrderProductPhoto foto={sabor.foto} name={nombre} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: textPrimary }}>{nombre}</Text>
                        <Text style={{ color: textSecondary, fontSize: 12 }}>
                          Stock: {stockOf(sabor.presentacion_id)} · máx {max}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar una unidad de ${nombre}`}
                        disabled={sabor.unidades <= 1}
                        onPress={() =>
                          distribute(
                            index,
                            sabores.map((s) =>
                              s.presentacion_id === sabor.presentacion_id
                                ? { ...s, unidades: s.unidades - 1 }
                                : s,
                            ),
                          )
                        }
                        style={{
                          padding: 6,
                          opacity: sabor.unidades <= 1 ? 0.4 : 1,
                        }}
                      >
                        <Ionicons
                          name="remove-circle-outline"
                          size={22}
                          color={accentColor}
                        />
                      </Pressable>
                      <Text
                        style={{
                          color: textPrimary,
                          fontWeight: "800",
                          minWidth: 18,
                          textAlign: "center",
                        }}
                      >
                        {sabor.unidades}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Agregar una unidad de ${nombre}`}
                        disabled={sabor.unidades >= max}
                        onPress={() =>
                          distribute(
                            index,
                            sabores.map((s) =>
                              s.presentacion_id === sabor.presentacion_id
                                ? { ...s, unidades: s.unidades + 1 }
                                : s,
                            ),
                          )
                        }
                        style={{
                          padding: 6,
                          opacity: sabor.unidades >= max ? 0.4 : 1,
                        }}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={22}
                          color={accentColor}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar ${nombre}`}
                        onPress={() =>
                          distribute(
                            index,
                            sabores.filter(
                              (s) =>
                                s.presentacion_id !== sabor.presentacion_id,
                            ),
                          )
                        }
                        style={{ padding: 6 }}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={22}
                          color={textSecondary}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </>
            ) : (
              <>
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
                    {item.acompanamiento_corto && (
                      <OrderProductPhoto
                        foto={item.acompanamiento_corto.foto}
                        name={item.acompanamiento_corto.nombre || "Bebida"}
                      />
                    )}
                    <Text style={{ color: textPrimary, flex: 1 }}>
                      {item.acompanamiento_corto?.nombre ||
                        "Seleccionar producto o sabor del bar"}
                    </Text>
                  </View>
                </Pressable>
                <Text style={{ color: textSecondary }}>
                  {item.cantidad *
                    (item.shot_anfitriona ? hostessMixerMl(item) : 1)}{" "}
                  {item.shot_anfitriona
                    ? "ml incluidos"
                    : "unidades completas incluidas"}
                </Text>
              </>
            )}
          </View>
        );
      })}
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
              {bottle
                ? "Agregar sabor del bar"
                : "Elegir producto o sabor del bar"}
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
              {modalChoices.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => {
                    if (selected !== null) {
                      if (bottle) addFlavor(selected, p);
                      else
                        onChange?.(selected, {
                          presentacion_id: p.id,
                          nombre: `${p.producto_nombre} ${p.nombre}`,
                          foto:
                            p.foto && p.foto !== "default.png"
                              ? p.foto
                              : p.producto_foto,
                          ...shortMixerConsumption(items[selected]),
                        });
                    }
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
              {!modalChoices.length && (
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
