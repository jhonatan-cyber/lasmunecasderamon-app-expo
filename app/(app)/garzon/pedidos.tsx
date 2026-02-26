import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../../api/client';
import { CategoryCard } from '../../../components/CategoryCard';

const { width } = Dimensions.get('window');

interface Category {
    id: number;
    name: string;
    description: string;
    status: number;
    total_products: number;
    display_order: number;
}

export default function PedidosScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const fetchCategories = useCallback(async () => {
        try {
            setError('');
            const data = await apiClient('/categories');
            if (data.success) {
                const active = (data.data || [])
                    .filter((c: Category) => c.status === 1)
                    .sort((a: Category, b: Category) => a.display_order - b.display_order);
                setCategories(active);
            } else {
                setError(data.message || 'Error al cargar categorías');
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCategories();
    }, [fetchCategories]);

    const renderItem = ({ item, index }: { item: Category, index: number }) => (
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
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={[styles.loadingText, { color: textSecondary }]}>Actualizando catálogo...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <LinearGradient
                colors={isDark ? ['#1E1B4B', '#000000'] : ['#E0E7FF', '#F3F4F6']}
                style={[styles.topBanner, { paddingTop: insets.top }]}
            >
                <Text style={[styles.bannerSubtitle, { color: textSecondary }]}>
                    Selecciona una categoría para ver los productos
                </Text>
            </LinearGradient>

            {error ? (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#451a1a' : '#FEF2F2' }]}>
                    <Ionicons name="alert-circle" size={24} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable onPress={fetchCategories} style={styles.retryButton}>
                        <Text style={styles.retryText}>REINTENTAR</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlatList
                data={categories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
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
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600', letterSpacing: -0.5 },
    topBanner: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    bannerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
    bannerSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
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
