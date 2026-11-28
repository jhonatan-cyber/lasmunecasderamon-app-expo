import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import VirtualizedList from "@/components/shared/VirtualizedList";
import { contentColumn } from '@/constants/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmployeeListError } from '@/components/shared/EmployeeListError';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PedidosSkeleton } from '@/components/garzon/pedidos/PedidosSkeleton';
import { MisPedidosList } from '@/components/garzon/pedidos/MisPedidosList';
import { GarzonOfflineBanner } from '@/components/garzon/GarzonOfflineBanner';
import { BarmanOfflineBanner } from '@/components/barman/BarmanOfflineBanner';
import { useCartStore } from '@/store/cartStore';
import { FontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePedidosScreen, type Category } from '@/hooks/usePedidosScreen';
import { useVentaSearch } from '@/hooks/useVentaSearch';

export interface PedidosCatalogScreenProps {
  /** Define el banner offline y las rutas de navegación. */
  role: 'garzon' | 'barman';
}

/** Catálogo de categorías compartido por las rutas de pedidos de garzón y barman. */
export function PedidosCatalogScreen({ role }: PedidosCatalogScreenProps) {
  const { accentColor, gradientColors, bg, cardBg, borderColor, textPrimary, textSecondary, accentOnSurface } =
    useAccentColor();
  const { isTablet, isLandscape } = useResponsiveMetrics();
  const columnas = isTablet || isLandscape ? 3 : 2;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useCartStore((state) => state.cart);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [searchText, setSearchText] = useState('');
  const {
    searchResults: productSearchResults,
    searchLoading: productSearchLoading,
    searchError: productSearchError,
    setSearchProducto,
    handleSearchNow,
  } = useVentaSearch();

  const {
    categories,
    loading,
    refreshing,
    error,
    fromCache,
    fetchCategories,
    onRefresh,
  } = usePedidosScreen();

  const filteredCategories = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase();
    if (!search) return categories;

    return categories.filter((category) =>
      [category.name, category.description].some((value) =>
        value?.toLocaleLowerCase().includes(search),
      ),
    );
  }, [categories, searchText]);

  const searchTerm = searchText.trim();
  const showProductSearch = searchTerm.length >= 2;
  const navigableProductResults = useMemo(() =>
    productSearchResults.map((product: any) => {
      const categoryName = product.categoria || product.categoria_nombre || '';
      const productCategoryId =
        product.category_id || product.categoria_id || product.id_categoria || '';
      const category = categories.find((item) =>
        String(item.id) === String(productCategoryId) ||
        item.name.toLocaleLowerCase() === String(categoryName).toLocaleLowerCase(),
      );
      const categoryId = String(productCategoryId || category?.id || '');
      return {
        product,
        categoryId,
        categoryName: category?.name || categoryName || 'Categoría',
      };
    }).filter((result) => result.categoryId),
  [categories, productSearchResults]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setSearchProducto(value.trim().length >= 2 ? value : '');
  }, [setSearchProducto]);

  const handleSearchClear = useCallback(() => {
    setSearchText('');
    setSearchProducto('');
  }, [setSearchProducto]);

  const productPath =
    role === 'barman'
      ? '/(app)/barman/productos'
      : '/(app)/garzon/productos';
  const detailPath = '/(app)/garzon/pedido-detalle';
  const cartTotal = useCartStore((state) => state.getTotal());
  const OfflineBanner =
    role === 'barman' ? BarmanOfflineBanner : GarzonOfflineBanner;

  const handleCategoryPress = useCallback(
    (categoryId: string, categoryName: string) => {
      router.push({
        pathname: productPath,
        params: { categoryId, categoryName },
      } as Href);
    },
    [productPath, router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Category; index: number }) => (
      <View style={styles.cardCell}>
        <CategoryCard item={item} index={index} onPress={handleCategoryPress} />
      </View>
    ),
    [handleCategoryPress],
  );

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const openCart = useCallback(() => {
    useCartStore.getState().splitShorts();
    router.push(detailPath as Href);
  }, [detailPath, router]);
  const cartSummaryBar = activeTab === 'new' && cart.length > 0 ? (
    <View
      style={[
        styles.cartBar,
        {
          backgroundColor: cardBg,
          borderColor,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <Pressable
        onPress={openCart}
        style={styles.cartBarButton}
        accessibilityRole="button"
        accessibilityLabel={`Ver pedido: ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}, total $${cartTotal.toLocaleString('es-CL')}`}
        accessibilityHint="Abre el detalle para revisar y editar el pedido"
      >
        <View style={styles.cartBarInfo}>
          <Ionicons name="cart-outline" size={22} color={accentOnSurface} />
          <View style={styles.cartBarAmounts}>
            <Text style={[styles.cartBarCount, { color: textPrimary }]}>
              {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
            </Text>
            <Text style={[styles.cartBarTotal, { color: textPrimary }]}>
              ${cartTotal.toLocaleString('es-CL')}
            </Text>
          </View>
        </View>
        <View style={styles.cartBarAction}>
          <Text style={[styles.cartBarActionText, { color: accentOnSurface }]}>Ver pedido</Text>
          <Ionicons name="chevron-forward" size={18} color={accentOnSurface} />
        </View>
      </Pressable>
    </View>
  ) : null;

  const pedidosHeader = (
    <PremiumHeader
      title="Pedidos"
      subtitle={activeTab === 'history'
        ? 'Consulta tus pedidos anteriores'
        : fromCache
          ? 'Catálogo guardado en el dispositivo'
          : 'Busca un producto o selecciona una categoría'}
      connectionStatus={
        activeTab === 'new' && fromCache
          ? { isConnected: false, label: 'Modo Offline' }
          : undefined
      }
      tabs={[
        { id: 'new', label: 'Nuevo pedido' },
        { id: 'history', label: 'Mis pedidos' },
      ]}
      tabsVariant="pills"
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as 'new' | 'history')}
      onBack={() => router.back()}
    />
  );

  if (loading && activeTab === 'new') {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PedidosSkeleton
          bg={bg}
          gradientColors={gradientColors}
          insets={insets}
          headerSlot={pedidosHeader}
        />
        {cartSummaryBar}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {pedidosHeader}

      {activeTab === 'new' && <OfflineBanner />}

      {activeTab === 'new' && error ? (
        <EmployeeListError
          message={typeof error === 'string' ? error : 'No pudimos cargar las categorías.'}
          onRetry={() => fetchCategories()}
        />
      ) : null}

      {activeTab === 'history' ? (
        <MisPedidosList onNuevoPedido={() => setActiveTab('new')} />
      ) : (
        <VirtualizedList
          key={`categorias-${columnas}`}
          data={filteredCategories}
          keyExtractor={(item: Category) => item.id.toString()}
          renderItem={renderItem}
          numColumns={columnas}
          columnWrapperStyle={styles.columnWrapper}
          estimatedItemSize={180}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 112 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          ListHeaderComponent={
            <>
              <SearchBar
                compact
                debounceMs={0}
                placeholder="Buscar productos o categorías..."
                value={searchText}
                onChangeText={handleSearchChange}
                onClear={handleSearchClear}
                onSubmitEditing={handleSearchNow}
                accessibilityLabel="Buscar productos o categorías"
                autoCapitalize="none"
                style={styles.searchBar}
              />
              {searchTerm.length === 1 && (
                <Text style={[styles.searchHint, { color: textSecondary }]}>
                  Escribe al menos 2 caracteres para buscar productos en todo el catálogo.
                </Text>
              )}
              {showProductSearch && (
                <View style={[styles.productSearchResults, { backgroundColor: cardBg, borderColor }]}>
                  <Text style={[styles.productSearchTitle, { color: textPrimary }]}>Productos en todas las categorías</Text>
                  {productSearchLoading ? (
                    <View style={styles.searchStatus}>
                      <ActivityIndicator size="small" color={accentColor} />
                      <Text style={{ color: textSecondary }}>Buscando productos...</Text>
                    </View>
                  ) : productSearchError ? (
                    <Pressable
                      onPress={handleSearchNow}
                      style={styles.searchStatus}
                      accessibilityRole="button"
                      accessibilityLabel="Reintentar búsqueda de productos"
                    >
                      <Text style={{ color: textSecondary }}>{productSearchError}</Text>
                      <Text style={[styles.retryText, { color: accentOnSurface }]}>Reintentar</Text>
                    </Pressable>
                  ) : navigableProductResults.length > 0 ? (
                    navigableProductResults.map(({ product, categoryId, categoryName }: any) => (
                      <Pressable
                        key={String(product.id || product.presentacion_id || product.producto_id)}
                        onPress={() => router.push({
                          pathname: productPath,
                          params: { categoryId, categoryName, search: searchTerm },
                        } as Href)}
                        style={[styles.productSearchResult, { borderTopColor: borderColor }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir ${product.name || product.nombre || product.producto_nombre || 'producto'} en ${categoryName}`}
                        accessibilityHint="Abre esa categoría con este producto ya filtrado"
                      >
                        <View style={styles.productSearchResultText}>
                          <Text style={[styles.productSearchName, { color: textPrimary }]} numberOfLines={1}>
                            {product.name || product.nombre || product.producto_nombre || 'Producto'}
                          </Text>
                          <Text style={{ color: textSecondary }} numberOfLines={1}>{categoryName}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={accentOnSurface} />
                      </Pressable>
                    ))
                  ) : (
                    <Text style={[styles.searchStatusText, { color: textSecondary }]}>No hay productos con ese nombre.</Text>
                  )}
                </View>
              )}
            </>
          }
          ListEmptyComponent={showProductSearch ? null : (
            <EmptyState
              icon="basket-outline"
              title={searchText.trim() ? 'No se encontraron categorías' : 'No hay categorías disponibles'}
              actionLabel="Actualizar"
              onAction={() => fetchCategories()}
            />
          )}
        />
      )}
      {cartSummaryBar}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { ...contentColumn, paddingHorizontal: 20, paddingTop: 10 },
  searchBar: { marginBottom: 12 },
  searchHint: { fontSize: 12, marginTop: -4, marginBottom: 12, paddingHorizontal: 4 },
  productSearchResults: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  productSearchTitle: {
    fontFamily: FontFamily.extrabold,
    fontSize: 13,
    paddingVertical: 12,
  },
  searchStatus: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  searchStatusText: {
    textAlign: 'center',
    paddingVertical: 14,
  },
  retryText: {
    fontFamily: FontFamily.bold,
  },
  productSearchResult: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    gap: 12,
    paddingVertical: 8,
  },
  productSearchResultText: { flex: 1, gap: 3 },
  productSearchName: { fontFamily: FontFamily.semibold },
  columnWrapper: { gap: 15 },
  cardCell: { flex: 1, marginBottom: 15 },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99,
  },
  cartBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    gap: 12,
  },
  cartBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  cartBarAmounts: { gap: 2 },
  cartBarCount: {
    fontFamily: FontFamily.extrabold,
    fontSize: 14,
  },
  cartBarTotal: { fontFamily: FontFamily.bold, fontSize: 13 },
  cartBarAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cartBarActionText: { fontFamily: FontFamily.bold, fontSize: 14 },
});
