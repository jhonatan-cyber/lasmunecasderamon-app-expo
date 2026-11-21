import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import VirtualizedList from "@/components/shared/VirtualizedList";
import { SkeletonLoader as Skeleton } from "@/components/ui/SkeletonLoader";
import { CategoryCard } from "@/components/shared/CategoryCard";
import { useAccentColor } from "@/hooks/useAccentColor";
import { formatCurrency } from "@/utils/format";
import type { BarStockItem } from "@/hooks/useBarScreen";
import { BASE_URL } from "@/api/client";
import { resolverVentaProducto } from "@/hooks/utils/saleChoice";

interface BarStockListProps {
  items: BarStockItem[];
  search?: string;
  error?: string | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  /** Currently selected category (null = showing categories grid). */
  selectedCategory?: string | null;
  /** Called when the selected category changes. */
  onSelectedCategoryChange?: (category: string | null) => void;
}

type StockRow =
  | { type: "header"; id: string; category: string; count: number }
  | { type: "products"; id: string; items: BarStockItem[] };

const stockRowKey = (row: StockRow) => row.id;
const stockRowType = (row: StockRow) => row.type;

export function BarStockList({
  items,
  search = "",
  error,
  loading,
  refreshing,
  onRefresh,
  selectedCategory,
  onSelectedCategoryChange,
}: BarStockListProps) {
  const [internalCategory, setInternalCategory] = useState<string | null>(null);
  const selected = selectedCategory !== undefined ? selectedCategory : internalCategory;
  const setSelectedCategoryWrapper = useCallback((cat: string | null) => {
    if (onSelectedCategoryChange) {
      onSelectedCategoryChange(cat);
    } else {
      setInternalCategory(cat);
    }
  }, [onSelectedCategoryChange]);

  const { accentColor, textPrimary, textSecondary, accentOnSurface} = useAccentColor();

  const categories = useMemo(() => {
    const grouped = new Map<string, BarStockItem[]>();
    for (const item of items) {
      // Solo se listan las categorías que tienen stock mayor a 0 en el bar.
      if (Number(item.stock_bar ?? 0) <= 0) continue;
      const category = item.categoria_nombre?.trim() || "Sin categoría";
      const group = grouped.get(category) ?? [];
      group.push(item);
      grouped.set(category, group);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [items]);

  // Si la categoría elegida deja de existir (búsqueda/filtro), volvemos a las
  // tarjetas en lugar de mostrar un vacío falso.
  const activeCategory = categories.some(([name]) => name === selected)
    ? selected
    : null;

  const categoryCards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    const cards = categories.map(([name, list]) => ({
      id: name,
      name,
      description: "",
      total_products: list.length,
    }));
    const visible = term
      ? cards.filter((card) =>
          card.name.toLocaleLowerCase("es").includes(term),
        )
      : cards;
    return visible.sort((a, b) => {
      if (a.name === "Sin categoría") return 1;
      if (b.name === "Sin categoría") return -1;
      return a.name.localeCompare(b.name, "es");
    });
  }, [categories, search]);

  const rows = useMemo(() => {
    const result: StockRow[] = [];
    for (const [category, products] of categories) {
      if (activeCategory !== null && category !== activeCategory) continue;
      result.push({
        type: "header",
        id: `category:${category}`,
        category,
        count: products.length,
      });
      for (let i = 0; i < products.length; i += 2) {
        result.push({
          type: "products",
          id: `products:${category}:${products[i].id}`,
          items: products.slice(i, i + 2),
        });
      }
    }
    return result;
  }, [categories, activeCategory]);

  const renderRow = useCallback(
    ({ item }: { item: StockRow }) => {
      if (item.type === "header") {
        return (
          <Text
            accessibilityRole="header"
            style={[styles.categoryTitle, { color: textPrimary }]}
          >
            {item.category} ({item.count})
          </Text>
        );
      }
      return (
        <View style={styles.row}>
          {item.items.map((product) => (
            <BarStockCard key={product.id} item={product} />
          ))}
          {item.items.length === 1 ? <View style={styles.cardSpacer} /> : null}
        </View>
      );
    },
    [textPrimary],
  );

  const renderCategory = useCallback(
    ({ item, index }: { item: (typeof categoryCards)[number]; index: number }) => (
      <View style={styles.cardCell}>
        <CategoryCard
          item={item}
          index={index}
          compact
          onPress={(_id, name) => setSelectedCategoryWrapper(name)}
        />
      </View>
    ),
    [setSelectedCategoryWrapper],
  );

  if (loading) {
    return (
      <View style={styles.skeletonList}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width="48%" height={220} borderRadius={16} />
            <Skeleton width="48%" height={220} borderRadius={16} />
          </View>
        ))}
      </View>
    );
  }

  if (activeCategory === null) {
    return (
      <View style={[styles.container, { marginTop: 8 }]}
        >
        <VirtualizedList
          data={categoryCards}
          keyExtractor={(item: { id: string }) => item.id}
          renderItem={renderCategory}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[styles.list, { paddingTop: 8 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accentColor}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wine-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textPrimary }]}>
                {error ||
                  (search.trim()
                    ? "Sin productos para esta búsqueda"
                    : "Sin productos en el bar")}
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VirtualizedList
        key={activeCategory}
        data={rows}
        keyExtractor={stockRowKey}
        getItemType={stockRowType}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wine-outline" size={48} color={textSecondary} />
            <Text style={[styles.emptyText, { color: textPrimary }]}>
              {error ||
                (search.trim()
                  ? "Sin productos para esta búsqueda"
                  : "Sin productos en el bar")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const BarStockCard = memo(function BarStockCard({
  item,
}: {
  item: BarStockItem;
}) {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface} =
    useAccentColor();
  const opcionesVenta = useMemo(
    () => resolverVentaProducto(item).opciones,
    [item],
  );
  const stock = item.stock_bar ?? 0;
  const hasLowStock = stock > 0 && stock <= 3;
  const hasShot = opcionesVenta.some((option) => option.esShot);

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {/* Image section */}
      <View style={styles.imageWrap}>
        {item.producto_foto ? (
          <Image
            source={{
              uri: `${BASE_URL}/api/images/products/${encodeURIComponent(item.producto_foto)}`,
            }}
            style={styles.image}
            contentFit="cover"
            recyclingKey={item.id}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="wine-outline" size={34} color={textSecondary} />
          </View>
        )}
        <View
          style={[
            styles.badge,
            {
              backgroundColor: hasLowStock ? "#F59E0B" : `${accentColor}E8`,
            },
          ]}
        >
          <Ionicons
            name={hasLowStock ? "warning" : "cube"}
            size={10}
            color="#FFFFFF"
          />
          <Text style={[styles.badgeText, { color: "#FFFFFF" }]}>
            {stock}
          </Text>
        </View>
      </View>

      {/* Product identity */}
      <View style={styles.identitySection}>
        <Text
          style={[styles.productName, { color: textPrimary }]}
          numberOfLines={2}
        >
          {item.producto_nombre}
        </Text>
        {item.nombre ? (
          <View style={styles.presentationRow}>
            <Ionicons name="pricetag-outline" size={11} color={textSecondary} />
            <Text
              style={[styles.presentation, { color: textSecondary }]}
              numberOfLines={1}
            >
              {item.nombre}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Prices section */}
      {opcionesVenta.length > 0 && (
        <View style={[styles.prices, { borderTopColor: borderColor }]}>
          {opcionesVenta.map((option) => (
            <View key={option.value} style={styles.priceInfo}>
              <View style={styles.priceHeader}>
                <Text style={[styles.statLabel, { color: textSecondary }]}>
                  {option.nombre}
                </Text>
                <Text style={[styles.statValue, { color: textPrimary }]}>
                  {formatCurrency(option.precio)}
                </Text>
              </View>
              <Text style={[styles.commission, { color: accentOnSurface }]}>
                Com. {formatCurrency(option.comision)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Shot sizes */}
      {hasShot && (item.ml_shot ?? 0) > 0 && (
        <View style={styles.metalInfo}>
          <Ionicons name="water" size={11} color={textSecondary} />
          <Text style={[styles.shotSize, { color: textSecondary }]}>
            {item.ml_shot} ml
          </Text>
          {item.ml_shot_anfitriona !== item.ml_shot &&
            (item.ml_shot_anfitriona ?? 0) > 0 && (
              <Text style={[styles.shotSize, { color: textSecondary }]}>
                · Anfitriona: {item.ml_shot_anfitriona} ml
              </Text>
            )}
        </View>
      )}

      {/* Remaining ml */}
      {(item.ml_abierta ?? 0) > 0 && (
        <View style={[styles.warningRow, { backgroundColor: `${"#F59E0B"}15"` }]}>
          <Ionicons name="alert-circle" size={12} color="#F59E0B" />
          <Text style={[styles.warningText, { color: "#F59E0B" }]}>
            Restante: {item.ml_abierta} ml
          </Text>
        </View>
      )}

      {/* Open bottles */}
      {(item.botellas_abiertas?.length ?? 0) > 0 && (
        <View style={[styles.bottleDetails, { borderColor }]}>
          <View style={styles.bottleDetailsHeader}>
            <Ionicons name="wine" size={11} color={textSecondary} />
            <Text
              style={[styles.bottleDetailsTitle, { color: textSecondary }]}
            >
              Contenido por botella
            </Text>
          </View>
          {item.botellas_abiertas?.map((bottle) => (
            <Text
              key={bottle.id}
              style={[styles.bottleDetailsRow, { color: textPrimary }]}
              numberOfLines={1}
            >
              {item.producto_nombre} · {bottle.ml_restante} ml
            </Text>
          ))}
        </View>
      )}

      {/* Bottles to return */}
      {(item.botellas_vacias_shots ?? 0) > 0 && (
        <View style={[styles.returnDetails, { borderColor }]}>
          <View style={styles.bottleDetailsHeader}>
            <Ionicons name="return-up-back" size={11} color="#F59E0B" />
            <Text style={[styles.returnDetailsTitle, { color: "#F59E0B" }]}>
              Para devolver ({item.botellas_vacias_shots})
            </Text>
          </View>
          {item.botellas_por_devolver?.map((bottle) => (
            <Text
              key={bottle.id}
              style={[styles.bottleDetailsRow, { color: textPrimary }]}
              numberOfLines={1}
            >
              {bottle.codigo}:{" "}
              {bottle.ml_restante > 0
                ? `${bottle.ml_restante} ml de merma`
                : "vacía"}
            </Text>
          ))}
        </View>
      )}

      {/* Served ml */}
      {(item.ml_servidos ?? 0) > 0 && (
        <View style={styles.metalInfo}>
          <Ionicons name="checkmark-circle" size={11} color={textSecondary} />
          <Text style={[styles.served, { color: textSecondary }]}>
            Servido: {item.ml_servidos} ml
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeletonList: { padding: 16, gap: 10 },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "800",
    paddingTop: 16,
    paddingBottom: 4,
  },
  cardSpacer: { flex: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 120 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: 110,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(127,127,127,0.12)",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  badgeText: { fontSize: 10, fontWeight: "800" },
  identitySection: {
    gap: 3,
    marginBottom: 2,
  },
  productName: { fontSize: 14, fontWeight: "800", lineHeight: 18 },
  presentationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  presentation: { fontSize: 11, fontWeight: "600" },
  prices: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 7,
  },
  priceInfo: { flex: 1, minWidth: 0, gap: 2 },
  priceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 13, fontWeight: "800" },
  commission: { fontSize: 9, fontWeight: "700" },
  metalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  shotSize: { fontSize: 10, fontWeight: "600" },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warningText: { fontSize: 10, fontWeight: "700" },
  served: {
    fontSize: 10,
    fontWeight: "600",
  },
  bottleDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 7,
    paddingTop: 6,
    gap: 3,
  },
  bottleDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bottleDetailsTitle: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  bottleDetailsRow: { fontSize: 10, fontWeight: "700", paddingLeft: 15 },
  returnDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 7,
    paddingTop: 6,
    gap: 3,
  },
  returnDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  returnDetailsTitle: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "600" },
  cardCell: { flex: 1, marginBottom: 15 },
  columnWrapper: { gap: 15 },
  categoryCard: {
    flex: 1,
    minHeight: 100,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  categoryName: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  categoryCount: { fontSize: 12, fontWeight: "700" },
});
