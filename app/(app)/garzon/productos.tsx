import Ionicons from '@expo/vector-icons/Ionicons';
import {useAccentColor} from '@/hooks/useAccentColor';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useCallback, useEffect, useRef, useState} from 'react';
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
    View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {apiClient} from '@/api/client';
import {Anfitriona, CartItem, Product, ProductCard, Room} from '@/components/shared/ProductCard';
import {useAuthStore} from '@/store/authStore';
import {useCartStore} from '@/store/cartStore';
import {PremiumHeader} from '@/components/ui/PremiumHeader';
import {ClientSelectModal} from '@/components/cajero/forms/ClientSelectModal';
import {PremiumAlert} from '@/components/ui/PremiumAlert';

import logger from '@/utils/logger';
interface Client {
    id: string;
    id_cliente?: string;
    name: string;
    nombre?: string;
    lastName: string;
    apellido?: string;
}

export default function ProductosScreen() {
    const { accentColor, bg, cardBg, borderColor, textPrimary, textSecondary } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { categoryId, categoryName } = useLocalSearchParams<{ categoryId: string; categoryName: string }>();
    const user = useAuthStore((state) => state.user);

    const [products, setProducts] = useState<Product[]>([]);
    const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [clientModalVisible, setClientModalVisible] = useState(false);
    const [clearCartAlertVisible, setClearCartAlertVisible] = useState(false);
    const [, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const dataRef = useRef<string>('');

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
        getTipAmount,
        getTotal,
        buildOrderPayload
    } = useCartStore();

    // Modal state
    const [activeConfigItem, setActiveConfigItem] = useState<{ productId: string, type: 'hostess' | 'room' } | null>(null);

    const fetchData = useCallback(async (isManual = false) => {
        try {
            setError('');
            const [prodRes, anfRes, roomRes, clientRes] = await Promise.allSettled([
                apiClient(`/products?category_id=${categoryId}`),
                apiClient('/anfitrionas'),
                apiClient('/rooms?status=1'),
                apiClient('/clients'),
            ]);

            const prodData = prodRes.status === 'fulfilled' ? prodRes.value : null;
            const anfData = anfRes.status === 'fulfilled' ? anfRes.value : null;
            const roomData = roomRes.status === 'fulfilled' ? roomRes.value : null;
            const clientData = clientRes.status === 'fulfilled' ? clientRes.value : null;

            logger.info('Anfitrionas response', { data: anfData });

            const newData = { products: prodData?.data, anfitrionas: anfData?.data || (Array.isArray(anfData) ? anfData : null), rooms: roomData?.data, clients: clientData?.data || clientData };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (prodData?.success) {
                const active = (prodData.data || []).filter((p: Product) => p.status === 1);
                setProducts(active);
            }
            if (anfData?.success) {
                setAnfitrionas(anfData.data || []);
            } else if (Array.isArray(anfData)) {
                setAnfitrionas(anfData);
            }
            if (roomData?.success) setRooms(roomData.data || []);
            
            if (Array.isArray(clientData)) {
                setClients(clientData);
            } else if (clientData?.success) {
                setClients(clientData.data || []);
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
            logger.captureException(err, { context: 'Productos:fetchProductos' });
            setError(err.message || 'Error de conexión');
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar la lista de productos',
                    visibilityTime: 3000
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [categoryId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

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

            // Construir y validar payload con Zod mediante el store
            const buildResult = buildOrderPayload({
                meseroId: user.id,
                codigo,
                clienteId: selectedClientId,
                device_date: new Date().toISOString(),
            });

            if (!buildResult.success) {
                Toast.show({
                    type: 'error',
                    text1: 'Datos inválidos',
                    text2: buildResult.errors.join('; '),
                });
                setSubmitting(false);
                return;
            }

            const orderData = buildResult.data;

            logger.info('[DEBUG] Enviando pedido', { orderData });
            logger.info('[DEBUG] Cliente ID', { clienteId: selectedClientId });
            logger.info('[DEBUG] Propina', { amount: tipAmount });
            logger.info('[DEBUG] Total', { total: cartTotal });

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
            <PremiumHeader 
                title={decodeURIComponent(categoryName || 'Productos')}
                subtitle="Selecciona productos para tu orden"
                rightComponent={
                    <View style={styles.headerActions}>
                        {cart.length > 0 && (
                            <Pressable 
                                onPress={() => setClearCartAlertVisible(true)}
                                style={styles.emptyCartBtn}
                            >
                                <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
                            </Pressable>
                        )}
                        <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backTextHeader}>Atrás</Text>
                        </Pressable>
                    </View>
                }
            />

            <FlatList
                data={products}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderProduct}
                contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />}
                ListHeaderComponent={
                    <View>
                        <Text style={[styles.sectionTitle, { color: textSecondary, marginBottom: 8 }]}>
                            {products.length} productos en catálogo
                        </Text>
                        
                        {/* Selector de Cliente (Opcional) */}
                        <Text style={[styles.sectionLabel, { color: textSecondary }]}>CLIENTE (OPCIONAL)</Text>
                        <Pressable 
                            onPress={() => setClientModalVisible(true)}
                            style={[styles.selectField, { backgroundColor: cardBg, borderColor }]}
                        >
                            <View style={styles.selectFieldContent}>
                                <Ionicons name="person-outline" size={20} color={selectedClientId ? accentColor : textSecondary} />
                                <Text style={[styles.selectFieldText, { color: selectedClientId ? textPrimary : textSecondary }]}>
                                    {selectedClientId 
                                        ? (() => {
                                            const c = clients.find(cl => (cl.id_cliente || cl.id) === selectedClientId);
                                            return `${c?.nombre || c?.name || ''} ${c?.apellido || c?.lastName || ''}`.trim() || 'Cliente seleccionado';
                                          })()
                                        : 'Seleccionar cliente...'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color={textSecondary} />
                        </Pressable>
                        
                        <View style={{ height: 20 }} />
                    </View>
                }
            />

            <ClientSelectModal 
                visible={clientModalVisible}
                onClose={() => setClientModalVisible(false)}
                clients={clients as any}
                selectedIds={selectedClientId ? [selectedClientId] : []}
                onToggle={(id) => {
                    setSelectedClientId(selectedClientId === String(id) ? null : String(id));
                    setClientModalVisible(false);
                }}
            />

            <PremiumAlert 
                visible={clearCartAlertVisible}
                title="Vaciar Carrito"
                message="¿Estás seguro que deseas eliminar todos los productos del pedido? Esta acción no se puede deshacer."
                type="danger"
                showCancel
                confirmText="Sí, vaciar"
                cancelText="Cancelar"
                onConfirm={() => {
                    clearCart();
                    setClearCartAlertVisible(false);
                }}
                onCancel={() => setClearCartAlertVisible(false)}
            />

            {cart.length > 0 && (
                <View style={[styles.cartBar, { backgroundColor: cardBg, borderTopColor: borderColor, paddingBottom: 16 + insets.bottom }]}>
                    <View style={styles.cartTopRow}>
                        <View style={styles.tipControl}>
                            <Text style={[styles.tipText, { color: textSecondary }]}>Propina (10%)</Text>
                            <Switch
                                value={tipEnabled}
                                onValueChange={setTipEnabled}
                                trackColor={{ false: '#374151', true: accentColor }}
                                thumbColor="#FFF"
                            />
                        </View>
                        {tipEnabled && (
                            <Text style={[styles.tipAmount, { color: accentColor }]}>
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
                            style={({ pressed }) => [styles.submitBtn, { backgroundColor: accentColor }, submitting && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
                        >
                            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Enviar Pedido</Text>}
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Config Modals */}
            <Modal visible={!!activeConfigItem} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg, paddingBottom: insets.bottom }]}>
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
                                            style={[styles.modalItem, { borderColor: isSelected ? accentColor : borderColor, backgroundColor: isSelected ? `${accentColor}15` : 'transparent' }]}
                                        >
                                            <Text style={[styles.modalItemText, { color: textPrimary }]}>{a.nick || a.name}</Text>
                                            {isSelected && <Ionicons name="checkmark" size={16} color={accentColor} />}
                                        </Pressable>
                                    );
                                })
                            ) : (
                                <>
                                    <Pressable
                                        onPress={() => { updateItemRoom(activeConfigItem!.productId, null); setActiveConfigItem(null); }}
                                        style={[styles.modalItem, { borderColor: !currentConfigItem?.selectedRoom ? accentColor : borderColor, backgroundColor: !currentConfigItem?.selectedRoom ? `${accentColor}15` : 'transparent' }]}
                                    >
                                        <Text style={[styles.modalItemText, { color: textPrimary }]}>Sin Habitación</Text>
                                    </Pressable>
                                    {rooms.map(r => (
                                        <Pressable
                                            key={r.id}
                                            onPress={() => { updateItemRoom(activeConfigItem!.productId, r.id); setActiveConfigItem(null); }}
                                            style={[styles.modalItem, { borderColor: currentConfigItem?.selectedRoom === r.id ? accentColor : borderColor, backgroundColor: currentConfigItem?.selectedRoom === r.id ? `${accentColor}15` : 'transparent' }]}
                                        >
                                            <Text style={[styles.modalItemText, { color: textPrimary }]}>{r.name}</Text>
                                            {currentConfigItem?.selectedRoom === r.id && <Ionicons name="checkmark" size={16} color={accentColor} />}
                                        </Pressable>
                                    ))}
                                </>
                            )}
                        </ScrollView>

                        <Pressable onPress={() => setActiveConfigItem(null)} style={[styles.doneBtn, { backgroundColor: accentColor }]}>
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
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
    sectionTitle: { fontSize: 13, fontWeight: '600' },
    sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 10, marginBottom: 10 },
    selectField: {
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    selectFieldContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectFieldText: {
        fontSize: 15,
        fontWeight: '600',
    },
    horizontalSelect: { marginBottom: 10 },
    clientCard: { width: 120, height: 60, borderRadius: 16, padding: 12, marginRight: 10, borderWidth: 1, justifyContent: 'center' },
    clientName: { fontSize: 13, fontWeight: '700' },
    clientLastName: { fontSize: 11, marginTop: 2 },
    cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    cartTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    tipControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tipText: { fontSize: 13, fontWeight: '600' },
    tipAmount: { fontSize: 13, fontWeight: '700' },
    cartMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cartLabel: { fontSize: 12, fontWeight: '600' },
    cartTotal: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    submitBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    modalList: { padding: 16 },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1.5 },
    modalItemText: { fontSize: 16, fontWeight: '600' },
    doneBtn: { margin: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    doneBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    emptyCartBtn: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

