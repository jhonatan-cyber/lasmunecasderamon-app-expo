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
import { useAccentColor } from "@/hooks/useAccentColor";
import { OrderProductPhoto } from "./OrderProductPhoto";
export function IncludedServiceProductSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { cardBg, textPrimary, textSecondary, borderColor, accentColor, bg } =
    useAccentColor();
  const [productos, setProductos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let alive = true;
    apiClientSafe("/bar")
      .then((res: any) => {
        if (!res.success || !Array.isArray(res.data)) throw new Error();
        if (alive)
          setProductos(
            res.data.filter(
              (p: any) => Number(p.stock_bar_cerrado ?? p.stock_bar) > 0,
            ),
          );
      })
      .catch(() => {
        if (alive)
          setError("No se pudo cargar el bar. Cierra y vuelve a intentar.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);
  const nombre = (p: any) => `${p.producto_nombre || ""} · ${p.nombre || ""}`;
  const codigos = (p: any): string[] =>
    [p.producto_codigo, p.codigo_barras, ...(p.codigos_unidades_bar || [])]
      .filter(Boolean)
      .map(String);
  const seleccionado = productos.find(
    (p) => String(p.presentacion_id || p.id) === value,
  );
  return (
    <View
      style={{
        gap: 8,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor,
        backgroundColor: cardBg,
      }}
    >
      <Text style={{ color: textPrimary, fontWeight: "700" }}>
        Producto incluido en la habitación
      </Text>
      <Pressable
        onPress={() => {
          setLoading(true);
          setError("");
          setOpen(true);
        }}
        style={{
          padding: 12,
          borderRadius: 30,
          borderColor,
          borderWidth: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        {seleccionado && (
          <OrderProductPhoto
            foto={seleccionado.foto || seleccionado.producto_foto}
            name={nombre(seleccionado)}
          />
        )}
        <Text style={{ color: textPrimary, flex: 1 }}>
          {seleccionado
            ? nombre(seleccionado)
            : "Seleccionar una unidad del bar"}
        </Text>
      </Pressable>
      <Text style={{ color: textSecondary, fontSize: 12 }}>
        Una unidad completa incluida, sin cobro adicional.
      </Text>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{ flex: 1, padding: 24, paddingTop: 54, backgroundColor: bg }}
        >
          <Text style={{ color: textPrimary, fontWeight: "700", fontSize: 20 }}>
            Seleccionar producto incluido
          </Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar nombre, categoría o escanear código"
            onSubmitEditing={() => {
              const code = search.trim().toLowerCase();
              const matches = productos.filter((p) =>
                codigos(p).some((c) => c.toLowerCase() === code),
              );
              if (code && matches.length === 1) {
                onChange(String(matches[0].presentacion_id || matches[0].id));
                setOpen(false);
              }
            }}
            placeholderTextColor={textSecondary}
            style={{
              color: textPrimary,
              padding: 12,
              borderColor,
              borderWidth: 1,
              borderRadius: 30,
              marginVertical: 16,
            }}
          />
          {loading && <ActivityIndicator color={accentColor} />}
          {error && <Text style={{ color: textSecondary }}>{error}</Text>}
          <ScrollView>
            {productos
              .filter((p) =>
                `${nombre(p)} ${p.categoria_nombre || ""} ${codigos(p).join(" ")}`
                  .toLowerCase()
                  .includes(search.trim().toLowerCase()),
              )
              .map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    onChange(String(p.presentacion_id || p.id));
                    setOpen(false);
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderColor,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <OrderProductPhoto
                    foto={p.foto || p.producto_foto}
                    name={nombre(p)}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: textPrimary }}>{nombre(p)}</Text>
                    <Text style={{ color: textSecondary }}>
                      {p.categoria_nombre ? `${p.categoria_nombre} · ` : ""}Bar:{" "}
                      {p.stock_bar_cerrado ?? p.stock_bar} unidades
                    </Text>
                  </View>
                </Pressable>
              ))}
          </ScrollView>
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              padding: 16,
              borderRadius: 30,
              backgroundColor: accentColor,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>Cerrar</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
