import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import {
    RefreshControl,
    StyleSheet,
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
import { usePedidosScreen, Category } from '@/hooks/usePedidosScreen';
import { PedidosSkeleton } from '@/components/garzon/pedidos/PedidosSkeleton';
import { GarzonOfflineBanner } from '@/components/garzon/GarzonOfflineBanner';
import { useAuthStore } from '@/store/authStore';
import { isBarmanRole } from '@/utils/userRole';


export default function PedidosScreen() {
    const { gradientColors, bg } = useAccentColor();
    const { isTablet, isLandscape } = useResponsiveMetrics();
    // 3 columnas cuando el ancho lo permite (horizontal o tablet).
    const columnas = isTablet || isLandscape ? 3 : 2;
    const router = useRouter();
    const isBarman = isBarmanRole(useAuthStore((state) => state.user));
    const insets = useSafeAreaInsets();

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
            pathname: isBarman ? '/(app)/barman/productos' : '/(app)/garzon/productos',
            params: { categoryId, categoryName }
        } as Href);
    }, [router, isBarman]);

    const renderItem = useCallback(({ item, index }: { item: Category, index: number }) => (
        <View style={styles.cardCell}>
            <CategoryCard
                item={item}
                index={index}
                onPress={handleCategoryPress}
            />
        </View>
    ), [handleCategoryPress]);

    if (loading) return <PedidosSkeleton bg={bg} gradientColors={gradientColors} insets={insets} />;

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader
                title="Categorías"
                subtitle={fromCache ? 'Catálogo guardado en el dispositivo' : 'Selecciona una para ver los productos'}
                connectionStatus={fromCache ? { isConnected: false, label: 'Modo Offline' } : undefined}
                onBack={() => router.back()}
            />

            <GarzonOfflineBanner />

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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E11D48" />}
                ListEmptyComponent={
                    <EmptyState
                        icon="basket-outline"
                        title="No hay categorías disponibles"
                        message="Todavía no hay categorías activas para mostrar."
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
    backBtnRight: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6
    },
    backTextHeader: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    listContent: { ...contentColumn, paddingHorizontal: 20, paddingTop: 10 },
    columnWrapper: { gap: 15 },
    cardCell: { flex: 1, marginBottom: 15 },
    errorCard: {
        margin: 20,
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EF444430'
    },
    errorText: { color: '#EF4444', fontSize: 15, fontWeight: '700', marginTop: 10, textAlign: 'center' },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 14, marginTop: 16 },
    retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyIconBg: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyText: { fontSize: 18, fontWeight: '800' },
    emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
