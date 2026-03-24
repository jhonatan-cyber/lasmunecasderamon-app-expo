import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { PremiumHeader } from '@/components/ui/PremiumHeader';

const { width } = Dimensions.get('window');

interface Category {
    id: string;
    name: string;
    description: string;
    status: number;
    total_products: number;
    display_order: number;
}

export default function PedidosScreen() {
    const { gradientColors, bg, cardBg, textPrimary, textSecondary } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const dataRef = useRef<string>('');

    const fetchCategories = useCallback(async (isManual = false) => {
        try {
            setError('');
            const data = await apiClient('/categories');

            const serialized = JSON.stringify(data.data || []);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (data.success) {
                const active = (data.data || [])
                    .filter((c: Category) => c.status === 1)
                    .sort((a: Category, b: Category) => a.display_order - b.display_order);
                setCategories(active);
            } else {
                setError(data.message || 'Error al cargar categorías');
            }

            if (isManual) {
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000
                });
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar el catálogo',
                    visibilityTime: 3000
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCategories(true);
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

    const PedidosSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <LinearGradient
                colors={gradientColors as any}
                style={[styles.header, {
                    paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20),
                    paddingBottom: 25,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                    height: 160
                }]}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 20 }}>
                     <Skeleton width={150} height={30} />
                     <Skeleton width={44} height={44} borderRadius={22} />
                </View>
                <View style={{ paddingHorizontal: 20 }}>
                     <Skeleton width="60%" height={24} />
                </View>
            </LinearGradient>

            <View style={{ padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 15 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} width={(width - 55) / 2} height={180} borderRadius={24} />
                ))}
            </View>
        </View>
    );

    if (loading) return <PedidosSkeleton />;

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

            <FlatList
                data={categories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
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
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600', letterSpacing: -0.5 },
    backBtnRight: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6
    },
    backTextHeader: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
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
