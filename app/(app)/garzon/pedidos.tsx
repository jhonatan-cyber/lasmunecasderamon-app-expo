import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import FlashList from "@/components/shared/FlashList";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccentColor } from '@/hooks/useAccentColor';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { usePedidosScreen, Category } from '@/hooks/usePedidosScreen';
import { PedidosSkeleton } from '@/components/garzon/pedidos/PedidosSkeleton';

export default function PedidosScreen() {
    const { gradientColors, bg, cardBg, textPrimary, textSecondary } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = (useColorScheme() ?? 'dark') === 'dark';

    const {
        categories,
        loading,
        refreshing,
        error,
        fetchCategories,
        onRefresh
    } = usePedidosScreen();

    const renderItem = useCallback(({ item, index }: { item: Category, index: number }) => (
        <CategoryCard
            item={item}
            index={index}
            onPress={() => {
                router.push({
                    pathname: '/(app)/garzon/productos',
                    params: { categoryId: item.id, categoryName: item.name }
                });
            }}
        />
    ), [router]);

    if (loading) return <PedidosSkeleton bg={bg} gradientColors={gradientColors} insets={insets} />;

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader 
                title="Categorías"
                subtitle="Selecciona una para ver los productos"
                rightComponent={
                    <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        <Text style={styles.backTextHeader}>Atrás</Text>
                    </Pressable>
                }
            />

            {error ? (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#451a1a' : '#FEF2F2' }]}>
                    <Ionicons name="alert-circle" size={24} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable onPress={() => fetchCategories()} style={styles.retryButton}>
                        <Text style={styles.retryText}>REINTENTAR</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlashList
                data={categories}
                keyExtractor={(item: Category) => item.id.toString()}
                renderItem={renderItem}
                estimatedItemSize={100}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E11D48" />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconBg, { backgroundColor: cardBg }]}>
                            <Ionicons name="basket-outline" size={60} color={textSecondary} />
                        </View>
                        <Text style={[styles.emptyText, { color: textPrimary }]}>No hay categorías disponibles</Text>
                        <Text style={[styles.emptySubtext, { color: textSecondary }]}>Por el momento no se han encontrado categorías activas para mostrar.</Text>
                    </View>
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
    listContent: { paddingHorizontal: 20, paddingTop: 10 },
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
