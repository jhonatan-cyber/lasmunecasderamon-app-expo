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

export type ShortMixer = {
  presentacion_id: string;
  nombre?: string;
  ml_por_corto: number;
};
export function ShotMixerSelector({
  items,
  onChange,
}: {
  items: {
    nombre: string;
    presentacion_id?: string;
    cantidad: number;
    tipo_venta?: string;
    acompanamiento_corto?: ShortMixer;
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
        setBar(result.data.data.filter((p: any) => Number(p.stock_bar) > 0));
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
  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderColor,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 12,
      }}
    >
      <Text style={{ color: textPrimary, fontWeight: "700" }}>
        Soda o gaseosa para los cortos
      </Text>
      <Text style={{ color: textSecondary }}>
        Incluida en el precio. Se reutiliza la botella abierta y se descuentan
        ml por corto.
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
          item.tipo_venta === "shot" && (
            <View key={index} style={{ gap: 8 }}>
              <Text style={{ color: textPrimary }}>
                {item.nombre} · {item.cantidad} cortos
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
                <Text style={{ color: textPrimary }}>
                  {item.acompanamiento_corto?.nombre ||
                    "Seleccionar producto o sabor del bar"}
                </Text>
              </Pressable>
              <Text style={{ color: textSecondary }}>
                Ml de soda o gaseosa por corto
              </Text>
              <TextInput
                accessibilityLabel={`Ml de acompañamiento para ${item.nombre}`}
                keyboardType="number-pad"
                editable={!!item.acompanamiento_corto}
                value={
                  item.acompanamiento_corto?.ml_por_corto
                    ? String(item.acompanamiento_corto.ml_por_corto)
                    : ""
                }
                onChangeText={(value) => {
                  if (item.acompanamiento_corto)
                    onChange(index, {
                      ...item.acompanamiento_corto,
                      ml_por_corto: Number(value.replace(/\D/g, "")),
                    });
                }}
                style={{
                  color: textPrimary,
                  borderColor,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 12,
                }}
              />
              {!!item.acompanamiento_corto && (
                <Text style={{ color: textSecondary }}>
                  Consumo incluido:{" "}
                  {item.cantidad * item.acompanamiento_corto.ml_por_corto} ml
                </Text>
              )}
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
              accessibilityLabel="Buscar acompañamiento en bar"
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
            <ScrollView>
              {bar
                .filter(
                  (p) =>
                    p.id !== items[selected ?? -1]?.presentacion_id &&
                    `${p.producto_nombre} ${p.nombre}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    onPress={() => {
                      if (selected !== null)
                        onChange(selected, {
                          presentacion_id: p.id,
                          nombre: `${p.producto_nombre} ${p.nombre}`,
                          ml_por_corto:
                            items[selected]?.acompanamiento_corto
                              ?.ml_por_corto ?? 0,
                        });
                      setSelected(null);
                    }}
                    style={{
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderColor,
                    }}
                  >
                    <Text style={{ color: textPrimary }}>
                      {p.producto_nombre} {p.nombre}
                    </Text>
                    <Text style={{ color: textSecondary }}>
                      {p.stock_bar} en bar · {Number(p.ml_abierta ?? 0)} ml
                      abiertos
                    </Text>
                  </Pressable>
                ))}
              {!bar.length && (
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
