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
  Pressable,
  Text,
  View,
} from 'react-native';
import { apiClientSafe } from "@/api/client";
import { getMirror, MIRROR_MAX_AGE_MS } from "@/services/mirror";
import { useAccentColor } from "@/hooks/useAccentColor";
import { BorderRadius } from '@/constants/spacing';
import { useConfigValue } from "@/hooks/useConfigValue";
import { availableOrderMixers } from "@/hooks/utils/orderMixers";
import { parseOpcionesVenta } from "@/hooks/utils/saleChoice";
import { BottleMixerRow } from "./BottleMixerRow";
import { ShortMixerRow } from "./ShortMixerRow";
import { MixerSelectorModal } from "./MixerSelectorModal";

export type ShortMixer = {
  presentacion_id: string;
  nombre?: string;
  unidades?: number;
  ml_por_corto?: number;
  foto?: string;
  /** Precio unitario de la bebida elegida (del catálogo de productos). */
  precio?: number;
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

function stockLabel(p: { stock_bar?: number; ml_abierta?: number }) {
  const stock = Number(p.stock_bar) || 0;
  const openMl = Number(p.ml_abierta) || 0;
  const parts = [
    stock > 0 ? `${stock} en bar` : null,
    openMl > 0 ? `${openMl} ml abiertos` : null,
  ].filter((part): part is string => !!part);
  return parts.length ? parts.join(" · ") : null;
}

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
  const topeAcompanamiento =
    Number(useConfigValue("comisiones", "tope_precio_acompañamiento", "0")) || 0;
  const [bar, setBar] = useState<any[]>([]);
  const [barProducts, setBarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.all([
      getMirror().readThroughDetailed<any>(
        "bar:acompanamientos",
        () => apiClientSafe("/bar?acompanamientos=1"),
        { maxAgeMs: MIRROR_MAX_AGE_MS.catalogo },
      ),
      getMirror().readThroughDetailed<any>(
        "bar:products",
        () => apiClientSafe("/products?for_sale=1"),
        { maxAgeMs: MIRROR_MAX_AGE_MS.catalogo },
      ),
    ])
      .then(([barResult, productsResult]) => {
        if (!alive) return;
        if (!barResult.data.success || !Array.isArray(barResult.data.data))
          throw new Error();
        setBar(barResult.data.data);
        setCached(barResult.fromCache || productsResult.fromCache);
        const products = (productsResult.data?.success && Array.isArray(productsResult.data?.data))
          ? productsResult.data.data
          : [];
        setBarProducts(products);
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
  const priceOf = (presentacionId: string | undefined) => {
    const product = barProducts.find(
      (p) =>
        String(p.presentacion_id) === String(presentacionId) ||
        String(p.id) === String(presentacionId),
    );
    if (!product) return 0;
    const botella = parseOpcionesVenta(product.opciones_venta).find(
      (option) => option.tipo === "botella",
    );
    for (const candidate of [
      botella?.precio,
      botella?.precio_sin_anfitriona,
      product.precio_venta,
      product.precio,
      product.producto_precio,
    ]) {
      const precio = Number(candidate);
      if (Number.isFinite(precio) && precio > 0) return Math.round(precio);
    }
    return 0;
  };
  const mlBotellaOf = (presentacionId: string | undefined) =>
    Number(
      barProducts.find((p) => String(p.presentacion_id) === String(presentacionId))?.ml_botella ||
      barProducts.find((p) => String(p.id) === String(presentacionId))?.ml_botella ||
      0,
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
  const sinRecargo = !bottle && Boolean(items[currentIndex]?.shot_anfitriona);
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
        precio: priceOf(choice.id),
        ml_botella: mlBotellaOf(choice.id),
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
            ? "Bebidas"
            : "Soda o gaseosa para los cortos"}
        </Text>
      )}
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
          <View key={`${item.nombre}-${item.cantidad}`} style={{ gap: 8 }}>
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
                    borderRadius: BorderRadius.full,
                    opacity: loading || restante < 1 ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: textPrimary }}>Agregar sabor…</Text>
                </Pressable>
                {sabores.map((sabor) => {
                  const max = maxFor(sabor);
                  return (
                    <BottleMixerRow
                      key={sabor.presentacion_id}
                      sabor={sabor}
                      max={max}
                      stock={stockOf(sabor.presentacion_id)}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      onDecrement={() =>
                        distribute(
                          index,
                          sabores.map((s) =>
                            s.presentacion_id === sabor.presentacion_id
                              ? { ...s, unidades: s.unidades - 1 }
                              : s,
                          ),
                        )
                      }
                      onIncrement={() =>
                        distribute(
                          index,
                          sabores.map((s) =>
                            s.presentacion_id === sabor.presentacion_id
                              ? { ...s, unidades: s.unidades + 1 }
                              : s,
                          ),
                        )
                      }
                      onDelete={() =>
                        distribute(
                          index,
                          sabores.filter(
                            (s) =>
                              s.presentacion_id !== sabor.presentacion_id,
                          ),
                        )
                      }
                    />
                  );
                })}
              </>
            ) : (
              <ShortMixerRow
                item={item}
                loading={loading}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                includedText={`${item.cantidad * (item.shot_anfitriona ? hostessMixerMl(item) : 1)} ${item.shot_anfitriona ? 'ml incluidos' : 'unidades completas incluidas'}`}
                onPress={() => {
                  setSearch("");
                  setSelected(index);
                }}
              />
            )}
          </View>
        );
      })}
      <MixerSelectorModal
        visible={selected !== null}
        title={bottle ? 'Agregar sabor del bar' : 'Elegir producto o sabor del bar'}
        search={search}
        setSearch={setSearch}
        choices={modalChoices}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentColor={accentColor}
        sinRecargo={sinRecargo}
        topeAcompanamiento={topeAcompanamiento}
        stockLabel={stockLabel}
        precioOf={(choice) => priceOf(choice.id)}
        onSelect={(p) => {
          if (selected !== null) {
            if (bottle) addFlavor(selected, p);
            else
              onChange?.(selected, {
                presentacion_id: p.id,
                nombre: `${p.producto_nombre} ${p.nombre}`,
                foto:
                  p.foto && p.foto !== 'default.png'
                    ? p.foto
                    : p.producto_foto,
                precio: priceOf(p.id),
                ...shortMixerConsumption(items[selected]),
              });
          }
          setSelected(null);
        }}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}
