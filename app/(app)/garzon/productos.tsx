import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { Anfitriona, CartItem, Product, ProductCard, Room } from '../../../components/ProductCard';
import { useAuthStore } from '../../../store/authStore';
import { useCartStore } from '../../../store/cartStore';



export default function ProductosScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { categoryId, categoryName } = useLocalSearchParams<{ categoryId: string; categoryName: string }>();
    const user = useAuthStore((state) => state.user);

    const [products, setProducts] = useState<Product[]>([]);
    const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Get cart from persistent store
    const {
        cart,
        addToCart,
        removeFromCart,
        updateItemHostesses,
        updateItemRoom,
        tipEnabled,
        setTipEnabled,
        clearCart,
        getSubtotal,
        getTipAmount,
        getTotal
    } = useCartStore();

    // Modal state
    const [activeConfigItem, setActiveConfigItem] = useState<{ productId: number, type: 'hostess' | 'room' } | null>(null);

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const fetchData = useCallback(async () => {
        try {
            setError('');
            const [prodData, anfData, roomData] = await Promise.all([
                apiClient(`/products?category_id=${categoryId}`),
                apiClient('/anfitrionas'),
                apiClient('/rooms?status=1'),
            ]);
            if (prodData.success) {
                const active = (prodData.data || []).filter((p: Product) => p.status === 1);
                setProducts(active);
            }
            if (anfData.success) setAnfitrionas(anfData.data || []);
            if (roomData.success) setRooms(roomData.data || []);
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [categoryId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const hasCommission = (product: Product) => (product.commission || 0) > 0;

    const canSelectRoom = (product: Product) => product.price >= 30000 && hasCommission(product);

    const cartSubtotal = getSubtotal();
    const tipAmount = getTipAmount();
    const cartTotal = getTotal();

    // ============ SUBMIT ============
    const submitOrder = async () => {
        if (cart.length === 0) return;
        if (!user) return;

        // Validation: All items with commission must have at least 1 hostess
        for (const item of cart) {
            const hasCommission = (item.product.commission || 0) > 0;
            if (hasCommission && item.selectedHostesses.length === 0) {
                Toast.show({
                    type: 'error',
                    text1: 'Falta Anfitriona',
                    text2: `Debes asignar al menos una anfitriona a "${item.product.name}"`,
                });
                return;
            }
        }

        const generateCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        setSubmitting(true);
        try {
            const codigo = generateCode();
            const totalComision = cart.reduce((s, i) => s + (i.product.commission * i.quantity), 0);

            const orderData = {
                codigo,
                meseroId: user.id,
                clienteId: null,
                subtotal: cartSubtotal,
                total: cartSubtotal,
                propina: tipAmount,
                totalComision,
                detalles: cart.map(item => ({
                    productoId: item.product.id,
                    precio: item.product.price,
                    comision: item.product.commission,
                    cantidad: item.quantity,
                    subtotal: item.product.price * item.quantity,
                    generaComision: (item.product.commission || 0) > 0 ? 1 : 0,
                    hostessId: item.selectedHostesses.length === 1 ? item.selectedHostesses[0] : null,
                    selectedHostesses: item.selectedHostesses.map(String),
                    roomId: item.selectedRoom,
                })),
                usuarios: Array.from(new Set(cart.flatMap(i => i.selectedHostesses))).map(id => ({ usuarioId: id })),
            };

            const res = await apiClient('/orders', { method: 'POST', body: JSON.stringify(orderData) });
            if (res.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Pedido Enviado',
                    text2: 'El pedido ha sido registrado correctamente',
                });
                clearCart();
                router.back();
            } else {
                throw new Error(res.message || 'Error al enviar pedido');
            }

        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Error de conexión',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // ============ RENDER ============
    const renderProduct = ({ item: product }: { item: Product }) => (
        <ProductCard
            product={product}
            cartItem={cart.find(i => i.product.id === product.id)}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onConfigPress={(pid, type) => setActiveConfigItem({ productId: pid, type })}
            anfitrionas={anfitrionas}
            rooms={rooms}
        />
    );

    const currentConfigItem = activeConfigItem ? cart.find(i => i.product.id === activeConfigItem.productId) : null;

    // Max hostesses logic for modal
    const getMaxHostesses = (item: CartItem) => {
        const cat = (item.product.categoria || '').toLowerCase();
        const isChampagne = cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');

        if (isChampagne) {
            const p = item.product.price;
            if (p >= 240000) return 5;
            if (p >= 200000) return 4;
            if (p >= 140000) return 3;
            if (p >= 120000) return 2;
            return 1;
        }
        return item.quantity;
    };

    const maxHostesses = currentConfigItem ? getMaxHostesses(currentConfigItem) : 0;

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <FlatList
                data={products}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderProduct}
                contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />}
                ListHeaderComponent={
                    <Text style={[styles.sectionTitle, { color: textSecondary }]}>
                        {products.length} productos en {decodeURIComponent(categoryName || '')}
                    </Text>
                }
            />

            {cart.length > 0 && (
                <View style={[styles.cartBar, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderTopColor: borderColor, paddingBottom: 16 + insets.bottom }]}>
                    <View style={styles.cartTopRow}>
                        <View style={styles.tipControl}>
                            <Text style={[styles.tipText, { color: textSecondary }]}>Propina (10%)</Text>
                            <Switch
                                value={tipEnabled}
                                onValueChange={setTipEnabled}
                                trackColor={{ false: '#374151', true: '#10B981' }}
                                thumbColor="#FFF"
                            />
                        </View>
                        {tipEnabled && (
                            <Text style={[styles.tipAmount, { color: '#10B981' }]}>
                                +${tipAmount.toLocaleString()}
                            </Text>
                        )}
                    </View>

                    <View style={styles.cartMainRow}>
                        <View>
                            <Text style={[styles.cartLabel, { color: textSecondary }]}>Total Pedido</Text>
                            <Text style={[styles.cartTotal, { color: textPrimary }]}>${cartTotal.toLocaleString()}</Text>
                        </View>
                        <Pressable
                            onPress={submitOrder}
                            disabled={submitting}
                            style={({ pressed }) => [styles.submitBtn, submitting && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
                        >
                            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Enviar Pedido</Text>}
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Config Modals */}
            <Modal visible={!!activeConfigItem} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#111827' : '#FFFFFF', paddingBottom: insets.bottom }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>
                                {activeConfigItem?.type === 'hostess'
                                    ? `Asignar Anfitrionas (Máx ${maxHostesses})`
                                    : 'Seleccionar Habitación'}
                            </Text>
                            <Pressable onPress={() => setActiveConfigItem(null)}>
                                <Ionicons name="close" size={24} color={textPrimary} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalList}>
                            {activeConfigItem?.type === 'hostess' ? (
                                anfitrionas.map(a => {
                                    const isSelected = !!currentConfigItem?.selectedHostesses?.includes(a.id);
                                    return (
                                        <Pressable
                                            key={a.id}
                                            onPress={() => {
                                                const current = currentConfigItem?.selectedHostesses || [];
                                                if (isSelected) {
                                                    updateItemHostesses(activeConfigItem.productId, current.filter(id => id !== a.id));
                                                } else if (current.length < maxHostesses) {
                                                    updateItemHostesses(activeConfigItem.productId, [...current, a.id]);
                                                } else {
                                                    Toast.show({
                                                        type: 'error',
                                                        text1: 'Límite',
                                                        text2: `Máximo ${maxHostesses} anfitriona(s) para este producto.`,
                                                    });
                                                }
                                            }}
                                            style={[styles.modalItem, isSelected && { backgroundColor: isDark ? '#065F46' : '#D1FAE5' }]}
                                        >
                                            <Text style={[styles.modalItemText, { color: textPrimary }]}>{a.nick || a.name}</Text>
                                            {isSelected && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                                        </Pressable>
                                    );
                                })
                            ) : (
                                <>
                                    <Pressable
                                        onPress={() => { updateItemRoom(activeConfigItem!.productId, null); setActiveConfigItem(null); }}
                                        style={[styles.modalItem, !currentConfigItem?.selectedRoom && { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
                                    >
                                        <Text style={[styles.modalItemText, { color: textPrimary }]}>Sin Habitación</Text>
                                    </Pressable>
                                    {rooms.map(r => (
                                        <Pressable
                                            key={r.id}
                                            onPress={() => { updateItemRoom(activeConfigItem!.productId, r.id); setActiveConfigItem(null); }}
                                            style={[styles.modalItem, currentConfigItem?.selectedRoom === r.id && { backgroundColor: isDark ? '#065F46' : '#D1FAE5' }]}
                                        >
                                            <Text style={[styles.modalItemText, { color: textPrimary }]}>{r.name}</Text>
                                            {currentConfigItem?.selectedRoom === r.id && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                                        </Pressable>
                                    ))}
                                </>
                            )}
                        </ScrollView>

                        <Pressable onPress={() => setActiveConfigItem(null)} style={styles.doneBtn}>
                            <Text style={styles.doneBtnText}>Listo</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 120 },
    sectionTitle: { fontSize: 13, marginBottom: 12, fontWeight: '600' },
    cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    cartTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    tipControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tipText: { fontSize: 13, fontWeight: '600' },
    tipAmount: { fontSize: 13, fontWeight: '700' },
    cartMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cartLabel: { fontSize: 12, fontWeight: '600' },
    cartTotal: { fontSize: 24, fontWeight: '900' },
    submitBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    modalList: { padding: 16 },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
    modalItemText: { fontSize: 16, fontWeight: '600' },
    doneBtn: { margin: 20, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    doneBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
