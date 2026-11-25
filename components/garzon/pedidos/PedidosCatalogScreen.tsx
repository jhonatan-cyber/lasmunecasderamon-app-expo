import { useRouter, type Href } from 'expo-router';
import React, { useCallback } from 'react';
import {
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
import { EmployeeListError } from '@/components/shared/EmployeeListError';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PedidosSkeleton } from '@/components/garzon/pedidos/PedidosSkeleton';
import { GarzonOfflineBanner } from '@/components/garzon/GarzonOfflineBanner';
import { BarmanOfflineBanner } from '@/components/barman/BarmanOfflineBanner';
import { useCartStore } from '@/store/cartStore';
import { FontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePedidosScreen, type Category } from '@/hooks/usePedidosScreen';

export interface PedidosCatalogScreenProps {
  /** Define el banner offline y las rutas de navegación. */
  role: 'garzon' | 'barman';
}

/** Catálogo de categorías compartido por las rutas de pedidos de garzón y barman. */
export function PedidosCatalogScreen({ role }: PedidosCatalogScreenProps) {
  const { accentColor, gradientColors, bg, cardBg, borderColor, textPrimary, accentOnSurface } =
    useAccentColor();
  const { isTablet, isLandscape } = useResponsiveMetrics();
  const columnas = isTablet || isLandscape ? 3 : 2;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useCartStore((state) => state.cart);

  const {
    categories,
    loading,
    refreshing,
    error,
    fromCache,
    fetchCategories,
    onRefresh,
  } = usePedidosScreen();

  const productPath =
    role === 'barman'
      ? '/(app)/barman/productos'
      : '/(app)/garzon/productos';
  const detailPath = '/(app)/garzon/pedido-detalle';
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

  if (loading)
    return <PedidosSkeleton bg={bg} gradientColors={gradientColors} insets={insets} />;

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Pedidos"
        subtitle={
          fromCache
            ? 'Catálogo guardado en el dispositivo'
            : 'Selecciona una categoría para ver los productos'
        }
        connectionStatus={
          fromCache
            ? { isConnected: false, label: 'Modo Offline' }
            : undefined
        }
        onBack={() => router.back()}
      />

      <OfflineBanner />

      {error ? (
        <EmployeeListError
          message={typeof error === 'string' ? error : 'No pudimos cargar las categorías.'}
          onRetry={() => fetchCategories()}
        />
      ) : null}

      <VirtualizedList
        key={`categorias-${columnas}`}
        data={categories}
        keyExtractor={(item: Category) => item.id.toString()}
        renderItem={renderItem}
        numColumns={columnas}
        columnWrapperStyle={styles.columnWrapper}
        estimatedItemSize={180}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        ListHeaderComponent={
          cart.length > 0 ? (
            <Pressable
              onPress={() => {
                useCartStore.getState().splitShorts();
                router.push(detailPath as Href);
              }}
              style={[styles.cartSummaryCard, { backgroundColor: cardBg, borderColor }]}
              accessibilityRole="button"
              accessibilityLabel="Ver detalle del pedido"
            >
              <View style={styles.cartSummaryLeft}>
                <Ionicons name="cart-outline" size={20} color={accentOnSurface} />
                <Text style={[styles.cartSummaryText, { color: textPrimary }]}>
                  {itemCount} producto{itemCount !== 1 ? 's' : ''} en el pedido
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={accentOnSurface} />
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="basket-outline"
            title="No hay categorías disponibles"
            actionLabel="Actualizar"
            onAction={() => fetchCategories()}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { ...contentColumn, paddingHorizontal: 20, paddingTop: 10 },
  columnWrapper: { gap: 15 },
  cardCell: { flex: 1, marginBottom: 15 },
  cartSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cartSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartSummaryText: {
    fontFamily: FontFamily.extrabold,
    fontSize: 14,
  },
});
