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
import { BarmanOfflineBanner } from '@/components/barman/BarmanOfflineBanner';
import { useCartStore } from '@/store/cartStore';
import { FontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePedidosScreen, Category } from '@/hooks/usePedidosScreen';

export default function BarmanPedidosScreen() {
    const { accentColor, accentText, gradientColors, bg, cardBg, borderColor, textPrimary, textSecondary, isDark } = useAccentColor();
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
        onRefresh
    } = usePedidosScreen();

    const handleCategoryPress = useCallback((categoryId: string, categoryName: string) => {
        router.push({
            pathname: '/(app)/barman/productos',
            params: { categoryId, categoryName }
        } as Href);
    }, [router]);

    const renderItem = useCallback(({ item, index }: { item: Category, index: number }) => (
        <View style={styles.cardCell}>
            <CategoryCard
                item={item}
                index={index}
                onPress={handleCategoryPress}
            />
        </View>
    ), [handleCategoryPress]);

    if (loading)
        return <PedidosSkeleton bg={bg} gradientColors={gradientColors} insets={insets} />;

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

            <BarmanOfflineBanner />

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
                        router.push('/(app)/garzon/pedido-detalle');
                      }}
                      style={[
                        styles.cartSummaryCard,
                        { backgroundColor: cardBg, borderColor },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Ver detalle del pedido"
                    >
                      <View style={styles.cartSummaryLeft}>
                        <Ionicons name="cart-outline" size={20} color={accentColor} />
                        <Text style={[styles.cartSummaryText, { color: textPrimary }]}>
                          {cart.reduce((sum, item) => sum + item.quantity, 0)} producto{cart.reduce((sum, item) => sum + item.quantity, 0) !== 1 ? 's' : ''} en el pedido
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={accentColor} />
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
