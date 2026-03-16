import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { PremiumHeader } from '../../../components/PremiumHeader';
import { CartList } from '../../../components/cajero/forms/CartList';
import { CategorySelector } from '../../../components/cajero/forms/CategorySelector';
import { ClientSelectModal } from '../../../components/cajero/forms/ClientSelectModal';
import { HostessSelectModal } from '../../../components/cajero/forms/HostessSelectModal';
import { PaymentMethod, PaymentMethodSelect } from '../../../components/cajero/forms/PaymentMethodSelect';
import { RoomSelectModal } from '../../../components/cajero/forms/RoomSelectModal';
import { TipCheckbox } from '../../../components/cajero/forms/TipCheckbox';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useSales } from '../../../context/SalesContext';
import { useAccentColor } from '../../../hooks/useAccentColor';
import { useAuthStore } from '../../../store/authStore';

type VentaState = {
    loadingInitial: boolean;
    refreshing: boolean;
    anfitrionas: any[];
    habitaciones: any[];
    clientes: any[];
    cajaAbierta: boolean | null;
    cart: any[];
    selectedCliente: any;
    selectedHabitacion: any;
    metodoPago: PaymentMethod;
    enableTip: boolean;
    selectedTime: number;
    timeModalVisible: boolean;
    categories: any[];
    modalOpen: boolean;
    modalCategoria: any;
    modalProducts: any[];
    modalLoading: boolean;
    modalQuantities: { [key: string]: number };
    modalHostessSelections: { [key: string]: string[] };
    hostessSelectionTarget: { productId: string; isChampagne: boolean; max: number; product?: any } | null;
    hostessSubModalVisible: boolean;
    hostessModalVisible: boolean;
    roomModalVisible: boolean;
    clientModalVisible: boolean;
    activeCartIdx: number | null;
    submitting: boolean;
};

type VentaAction =
    | { type: 'SET_LOADING_INITIAL'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_INITIAL_DATA'; payload: any }
    | { type: 'SET_CART'; payload: any[] }
    | { type: 'SET_SELECTED_CLIENTE'; payload: any }
    | { type: 'SET_SELECTED_HABITACION'; payload: any }
    | { type: 'SET_METODO_PAGO'; payload: PaymentMethod }
    | { type: 'SET_ENABLE_TIP'; payload: boolean }
    | { type: 'SET_SELECTED_TIME'; payload: number }
    | { type: 'SET_MODAL_VISIBLE'; modal: string; visible: boolean }
    | { type: 'OPEN_CATEGORY_MODAL'; category: any; products: any[] }
    | { type: 'SET_MODAL_LOADING'; payload: boolean }
    | { type: 'SET_MODAL_QUANTITY'; productId: string; quantity: number }
    | { type: 'SET_MODAL_HOSTESSES'; productId: string; hostesses: string[] }
    | { type: 'SET_HOSTESS_TARGET'; target: any }
    | { type: 'SET_ACTIVE_CART_IDX'; payload: number | null }
    | { type: 'SET_SUBMITTING'; payload: boolean };

const initialVentaState: VentaState = {
    loadingInitial: true,
    refreshing: false,
    anfitrionas: [],
    habitaciones: [],
    clientes: [],
    cajaAbierta: null,
    cart: [],
    selectedCliente: null,
    selectedHabitacion: null,
    metodoPago: 'efectivo',
    enableTip: false,
    selectedTime: 5,
    timeModalVisible: false,
    categories: [],
    modalOpen: false,
    modalCategoria: null,
    modalProducts: [],
    modalLoading: false,
    modalQuantities: {},
    modalHostessSelections: {},
    hostessSelectionTarget: null,
    hostessSubModalVisible: false,
    hostessModalVisible: false,
    roomModalVisible: false,
    clientModalVisible: false,
    activeCartIdx: null,
    submitting: false,
};

function ventaReducer(state: VentaState, action: VentaAction): VentaState {
    switch (action.type) {
        case 'SET_LOADING_INITIAL': return { ...state, loadingInitial: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_INITIAL_DATA': return { ...state, ...action.payload };
        case 'SET_CART': return { ...state, cart: action.payload };
        case 'SET_SELECTED_CLIENTE': return { ...state, selectedCliente: action.payload };
        case 'SET_SELECTED_HABITACION': return { ...state, selectedHabitacion: action.payload };
        case 'SET_METODO_PAGO': return { ...state, metodoPago: action.payload };
        case 'SET_ENABLE_TIP': return { ...state, enableTip: action.payload };
        case 'SET_SELECTED_TIME': return { ...state, selectedTime: action.payload };
        case 'SET_MODAL_VISIBLE':
            return { ...state, [`${action.modal}ModalVisible`]: action.visible, modalOpen: action.modal === 'category' ? action.visible : state.modalOpen };
        case 'OPEN_CATEGORY_MODAL':
            return { ...state, modalOpen: true, modalCategoria: action.category, modalProducts: action.products, modalQuantities: {}, modalHostessSelections: {} };
        case 'SET_MODAL_LOADING': return { ...state, modalLoading: action.payload };
        case 'SET_MODAL_QUANTITY':
            return { ...state, modalQuantities: { ...state.modalQuantities, [action.productId]: action.quantity } };
        case 'SET_MODAL_HOSTESSES':
            return { ...state, modalHostessSelections: { ...state.modalHostessSelections, [action.productId]: action.hostesses } };
        case 'SET_HOSTESS_TARGET':
            return { ...state, hostessSelectionTarget: action.target, hostessSubModalVisible: !!action.target };
        case 'SET_ACTIVE_CART_IDX': return { ...state, activeCartIdx: action.payload };
        case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
        default: return state;
    }
}

const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    Toast.show({ type, text1: title, text2: message, visibilityTime: 4000 });
};

const isChampagneProduct = (producto: any) => {
    const cat = (producto.categoria || '').toLowerCase();
    return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
};

const getChampagneLimit = (precio: number) => {
    if (precio >= 240000) return 5;
    if (precio >= 200000) return 4;
    if (precio >= 160000) return 3;
    if (precio >= 120000) return 2;
    return 1;
};

const getHostessLimit = (prod: any) => {
    const price = prod.precio ?? prod.price ?? 0;
    if (isChampagneProduct(prod)) {
        return getChampagneLimit(price);
    }
    return 1;
};

export default function NuevaVentaScreen() {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((state) => state.user);
    const { refreshVentas } = useSales();

    const [state, dispatch] = useReducer(ventaReducer, initialVentaState);
    const {
        loadingInitial, refreshing, anfitrionas, habitaciones, clientes, cajaAbierta,
        cart, selectedCliente, selectedHabitacion, metodoPago, enableTip, selectedTime, timeModalVisible,
        categories, modalOpen, modalCategoria, modalProducts, modalLoading,
        modalQuantities, modalHostessSelections, hostessSelectionTarget, hostessSubModalVisible, roomModalVisible, clientModalVisible, submitting
    } = state;

    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

    const spacing = isTablet ? 24 : 16;
    const borderRadius = isTablet ? 28 : 24;
    const fontSize = isTablet ? 18 : 14;

    const dynamicStyles = {
        scrollContent: { padding: spacing, paddingBottom: 100 },
        section: { padding: spacing, borderRadius: borderRadius, marginBottom: spacing },
        summaryCard: { padding: spacing + 8, borderRadius: borderRadius + 4 },
        submitBtn: { height: isTablet ? 70 : 60, borderRadius: isTablet ? 24 : 20 },
        selectorBtn: { padding: isTablet ? 18 : 14, borderRadius: isTablet ? 20 : 16 },
    };

    const fetchInitialData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) dispatch({ type: 'SET_LOADING_INITIAL', payload: true });
        try {
            const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] = await Promise.allSettled([
                apiClient('/cashregister/status'),
                apiClient('/users?anfitrionas=1'),
                apiClient('/rooms'),
                apiClient('/clients'),
                apiClient('/categories'),
            ]);

            const caja = cajaRes.status === 'fulfilled' ? cajaRes.value : null;
            const anfitrionas = anfitrionasRes.status === 'fulfilled' ? anfitrionasRes.value : null;
            const rooms = roomsRes.status === 'fulfilled' ? roomsRes.value : null;
            const clients = clientsRes.status === 'fulfilled' ? clientsRes.value : null;
            const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value : null;

            const fetchedData: any = {
                // null = desconocido (request falló), true/false = confirmado por el servidor
                cajaAbierta: cajaRes.status === 'fulfilled' ? (caja?.success && caja?.data?.hasOpenCaja) : null,
                anfitrionas: anfitrionas?.success ? anfitrionas.data : [],
                habitaciones: rooms?.success ? rooms.data : [],
                categories: categories?.success ? (categories.data || []) : []
            };

            if (Array.isArray(clients)) {
                fetchedData.clientes = clients;
            } else if (clients?.success) {
                fetchedData.clientes = clients.data || [];
            }

            dispatch({ type: 'SET_INITIAL_DATA', payload: fetchedData });

            // Solo avisar si el servidor CONFIRMÓ que no hay caja abierta (no si hubo error de red)
            if (cajaRes.status === 'fulfilled' && (!caja?.success || !caja?.data?.hasOpenCaja)) {
                showToast('Caja Cerrada', 'Abre una caja primero.');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Error', 'No se pudo cargar la información.');
        } finally {
            dispatch({ type: 'SET_LOADING_INITIAL', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchInitialData(true);
    }, [fetchInitialData]);

    const handleOpenCategory = useCallback(async (cat: any) => {
        dispatch({ type: 'SET_MODAL_LOADING', payload: true });
        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: true });
        try {
            const res = await apiClient(`/products?category_id=${cat.id}`);
            if (res.success) {
                dispatch({ type: 'OPEN_CATEGORY_MODAL', category: cat, products: res.data || [] });
            } else showToast('Error', 'No se pudieron cargar los productos');
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            dispatch({ type: 'SET_MODAL_LOADING', payload: false });
        }
    }, []);

    const addProductToCart = useCallback((prod: any) => {
        const id = prod.id || prod.id_producto;
        const qty = modalQuantities[id] || 1;
        const hostesses = modalHostessSelections[id] || [];

        const newCart = [...cart];

        // Las anfitrionas acompañan el producto pero NO multiplican la cantidad
        const itemHostesses = hostesses.length > 0 ? hostesses : [];
        const hostessNames = hostesses.length > 0
            ? hostesses.map((hId: string) => anfitrionas.find((a: any) => String(a.id_usuario || a.id) === hId)?.nick || '').filter(Boolean).join(', ')
            : null;

        const existingItemIndex = newCart.findIndex((item) => {
            const itemId = item.id || item.id_producto;
            const currentH = item.anfitrionas || [];
            const sortedCurrent = [...currentH].sort().join(',');
            const sortedNew = [...itemHostesses].sort().join(',');
            return itemId === id && sortedCurrent === sortedNew;
        });

        if (existingItemIndex >= 0) {
            newCart[existingItemIndex].quantity += qty;
        } else {
            newCart.push({
                ...prod,
                quantity: qty,
                anfitrionas: itemHostesses,
                hostessNames: hostessNames || null,
            });
        }

        dispatch({ type: 'SET_CART', payload: newCart });
        showToast('Producto Agregado', `Se agregó ${prod.name || prod.nombre} al carrito`, 'success');
    }, [cart, modalQuantities, modalHostessSelections, anfitrionas]);

    const removeFromCart = useCallback((index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        dispatch({ type: 'SET_CART', payload: newCart });
    }, [cart]);

    const updateQuantity = useCallback((index: number, delta: number) => {
        const newCart = [...cart];
        const newQty = Math.max(1, (newCart[index].quantity || 1) + delta);
        newCart[index].quantity = newQty;
        dispatch({ type: 'SET_CART', payload: newCart });
    }, [cart]);

    const totals = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + (item.precio || item.price || 0) * (item.quantity || 1), 0);
        const tip = enableTip ? subtotal * 0.1 : 0;
        return { subtotal, tip, total: subtotal + tip };
    }, [cart, enableTip]);

    // Calcular si hay algún producto que tenga comisión para habilitar o no la selección de habitación
    const hasCommissionItem = useMemo(() => {
        return cart.some(item => Number(item.commission || item.comision || 0) > 0);
    }, [cart]);

    const handleSubmit = useCallback(async () => {
        // null = estado desconocido (error de red), se permite intentar — el backend valida
        if (cajaAbierta === false) return showToast('Error', 'Caja cerrada');
        if (cart.length === 0) return showToast('Error', 'Carrito vacío');

        dispatch({ type: 'SET_SUBMITTING', payload: true });
        try {
            const payload = {
                detalles: cart.map(item => ({
                    producto_id: item.id || item.id_producto,
                    cantidad: item.quantity || item.cantidad || 1,
                    precio: item.precio || item.price || 0,
                    sub_total: (item.precio || item.price || 0) * (item.quantity || item.cantidad || 1),
                    comision: Number(item.comision || item.commission || 0) * (item.quantity || item.cantidad || 1),
                    hostesses: item.anfitrionas?.map((a: any) => typeof a === 'object' ? (a.id_usuario || a.id) : a) || []
                })),
                cliente_id: selectedCliente?.id || selectedCliente?.id_cliente || null,
                habitacion_id: hasCommissionItem ? (selectedHabitacion?.id || selectedHabitacion?.id_habitacion || null) : null,
                metodo_pago: metodoPago,
                propina: totals.tip,
                sub_total: totals.subtotal,
                total: totals.total,
                tiempo: selectedHabitacion ? (Number(selectedHabitacion.tiempo || 0) > 0 ? Number(selectedHabitacion.tiempo) : selectedTime) : 0,
                usuarios: cart.flatMap((item: any) => item.anfitrionas?.map((a: any) => typeof a === 'object' ? (a.id_usuario || a.id) : a) || [])
            };

            const res = await apiClient('/sales', { method: 'POST', body: JSON.stringify(payload) });
            if (res.success) {
                showToast('Éxito', 'Venta realizada', 'success');
                refreshVentas();
                router.replace('/cajero/ventas');
            } else showToast('Error', res.message || 'Error al vender');
        } catch (error) {
            console.error('Submit error:', error);
            showToast('Error', 'Error de conexión');
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    }, [cajaAbierta, cart, selectedCliente, selectedHabitacion, metodoPago, totals, selectedTime, router, refreshVentas]);

    const NuevaVentaSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <PremiumHeader title="Nueva Venta" subtitle="Cargando información..." />
            <View style={{ padding: spacing }}>
                <View style={{ marginBottom: 25 }}>
                    <Skeleton width={180} height={20} style={{ marginBottom: 15 }} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} width={120} height={100} borderRadius={20} />
                        ))}
                    </ScrollView>
                </View>

                <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
                    <Skeleton width={150} height={15} style={{ marginBottom: 20 }} />
                    <Skeleton width="100%" height={50} borderRadius={16} style={{ marginBottom: 12 }} />
                    <Skeleton width="100%" height={50} borderRadius={16} style={{ marginBottom: 12 }} />
                    <Skeleton width="100%" height={80} borderRadius={16} />
                </View>

                <Skeleton width="100%" height={200} borderRadius={32} />
            </View>
        </View>
    );

    if (loadingInitial) return <NuevaVentaSkeleton />;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'dark' : 'light'} />

            <PremiumHeader
                title="Nueva Venta"
                subtitle="Registrar productos y servicios"
                onBack={() => router.back()}
            />

            <ScrollView contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}>
                <CategorySelector
                    categories={categories}
                    onSelectCategory={handleOpenCategory}
                />

                <View style={[styles.section, dynamicStyles.section, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: isTablet ? 16 : 13 }]}>2. Detalles de la Venta</Text>
                    {hasCommissionItem && (
                        <Pressable
                            style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor }]}
                            onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: true })}
                            accessibilityLabel="Seleccionar habitación"
                            accessibilityRole="button"
                        >
                            <Ionicons name="business" size={20} color={accentColor} />
                            <Text style={[styles.selectorText, { color: textPrimary, marginLeft: 10 }]}>{selectedHabitacion?.nombre || 'Seleccionar Habitación'}</Text>
                        </Pressable>
                    )}
                    {selectedHabitacion && (Number(selectedHabitacion.tiempo || 0) === 0) && (
                        <Pressable
                            style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor, marginTop: spacing / 2 }]}
                            onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'time', visible: true })}
                            accessibilityLabel="Tiempo de estancia"
                            accessibilityRole="button"
                        >
                            <Ionicons name="time-outline" size={20} color="#10B981" />
                            <Text style={[styles.selectorText, { color: textPrimary, marginLeft: 10 }]}>{selectedTime} minutos</Text>
                        </Pressable>
                    )}
                    <Pressable
                        style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor, marginTop: hasCommissionItem ? spacing / 2 : 0 }]}
                        onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: true })}
                        accessibilityLabel="Seleccionar cliente"
                        accessibilityRole="button"
                    >
                        <Ionicons name="person" size={20} color={accentColor} />
                        <Text style={[styles.selectorText, { color: textPrimary, marginLeft: 10 }]}>{selectedCliente?.nombre || 'Seleccionar Cliente'}</Text>
                    </Pressable>
                    <PaymentMethodSelect selectedMethod={metodoPago} onSelect={(val) => dispatch({ type: 'SET_METODO_PAGO', payload: val as PaymentMethod })} />
                </View>

                <CartList
                    items={cart}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                />

                <View style={[styles.summaryCard, dynamicStyles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Subtotal</Text>
                        <Text style={[styles.summaryVal, { color: textPrimary }]}>${totals.subtotal.toLocaleString()}</Text>
                    </View>
                    <TipCheckbox
                        enabled={enableTip}
                        onToggle={(val: boolean) => dispatch({ type: 'SET_ENABLE_TIP', payload: val })}
                        tipAmount={totals.tip}
                    />

                    <View style={[styles.summaryRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 10 }]}>
                        <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL</Text>
                        <Text style={[styles.totalValue, { color: accentColor }]}>${totals.total.toLocaleString()}</Text>
                    </View>
                    <Pressable
                        style={[styles.submitBtn, dynamicStyles.submitBtn, { backgroundColor: accentColor }, (submitting || cajaAbierta === false) && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={submitting || cajaAbierta === false}
                        accessibilityLabel="Finalizar venta"
                        accessibilityRole="button"
                    >
                        {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Finalizar Venta</Text>}
                    </Pressable>
                </View>
            </ScrollView>

            <Modal visible={modalOpen} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>{modalCategoria?.name || 'Productos'}</Text>
                            <Pressable
                                onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: false })}
                                accessibilityLabel="Cerrar modal"
                                accessibilityRole="button"
                            >
                                <Ionicons name="close" size={26} color={textPrimary} />
                            </Pressable>
                        </View>
                        {modalLoading ? <ActivityIndicator size="large" color={accentColor} style={{ margin: 40 }} /> : (
                            <FlatList
                                data={modalProducts}
                                keyExtractor={(item) => (item.id || item.id_producto).toString()}
                                renderItem={({ item }) => (
                                    <View style={[styles.productItem, { borderBottomColor: borderColor }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.productName, { color: textPrimary }]}>{item.name || item.nombre}</Text>
                                            <Text style={[styles.productPrice, { color: textSecondary }]}>${(item.precio || item.price || 0).toLocaleString()}</Text>
                                        </View>
                                        <View style={styles.modalQuantityActions}>
                                            <Pressable
                                                style={[styles.modalQtyBtn, { backgroundColor: cardBg, borderColor }]}
                                                onPress={() => {
                                                    const id = item.id || item.id_producto;
                                                    const qty = Math.max(1, (modalQuantities[id] || 1) - 1);
                                                    dispatch({ type: 'SET_MODAL_QUANTITY', productId: id, quantity: qty });
                                                }}
                                            >
                                                <Ionicons name="remove" size={16} color={textPrimary} />
                                            </Pressable>
                                            <Text style={[styles.modalQtyText, { color: textPrimary }]}>
                                                {modalQuantities[item.id || item.id_producto] || 1}
                                            </Text>
                                            <Pressable
                                                style={[styles.modalQtyBtn, { backgroundColor: cardBg, borderColor }]}
                                                onPress={() => {
                                                    const id = item.id || item.id_producto;
                                                    const qty = (modalQuantities[id] || 1) + 1;
                                                    dispatch({ type: 'SET_MODAL_QUANTITY', productId: id, quantity: qty });
                                                }}
                                            >
                                                <Ionicons name="add" size={16} color={textPrimary} />
                                            </Pressable>
                                        </View>
                                        <Pressable
                                            style={[styles.addBtn, { backgroundColor: accentColor }]}
                                            onPress={() => {
                                                const id = item.id || item.id_producto;
                                                const hasComm = Number(item.comision || item.commission || 0) > 0;

                                                if (hasComm) {
                                                    dispatch({
                                                        type: 'SET_HOSTESS_TARGET',
                                                        target: {
                                                            productId: id,
                                                            product: item,
                                                            max: getHostessLimit(item),
                                                            isChampagne: isChampagneProduct(item)
                                                        }
                                                    });
                                                } else {
                                                    addProductToCart(item);
                                                }
                                            }}
                                            accessibilityLabel={`Añadir ${item.name || item.nombre}`}
                                            accessibilityRole="button"
                                        >
                                            <Ionicons name="add" size={24} color="#FFF" />
                                        </Pressable>
                                    </View>
                                )}
                            />
                        )}
                        <Pressable
                            style={[styles.confirmModalBtn, { backgroundColor: accentColor }]}
                            onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: false })}
                            accessibilityLabel="Confirmar selección de productos"
                            accessibilityRole="button"
                        >
                            <Text style={styles.confirmModalBtnText}>Confirmar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal visible={timeModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg, padding: 0 }]} >
                        <View style={[styles.modalHeader, { padding: 24, paddingBottom: 10, marginBottom: 0 }]}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Tiempo de Estancia</Text>
                            <Pressable onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'time', visible: false })}>
                                <Ionicons name="close" size={26} color={textPrimary} />
                            </Pressable>
                        </View>
                        <FlatList
                            data={[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]}
                            keyExtractor={(item) => item.toString()}
                            contentContainerStyle={{ paddingHorizontal: 24 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.productItem, { borderBottomColor: borderColor }]}
                                    onPress={() => {
                                        dispatch({ type: 'SET_SELECTED_TIME', payload: item });
                                        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'time', visible: false });
                                    }}
                                >
                                    <Ionicons name="time" size={22} color="#10B981" />
                                    <Text style={[styles.productName, { color: textPrimary, marginLeft: 16 }]}>{item} minutos</Text>
                                    {selectedTime === item && <Ionicons name="checkmark-circle" size={24} color={accentColor} style={{ marginLeft: 'auto' }} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <RoomSelectModal
                visible={roomModalVisible}
                rooms={habitaciones}
                selectedRoomId={selectedHabitacion?.id || selectedHabitacion?.id_habitacion}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: false })}
                onSelect={(room) => {
                    dispatch({ type: 'SET_SELECTED_HABITACION', payload: room });
                    dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: false });
                }}
            />

            <ClientSelectModal
                visible={clientModalVisible}
                clients={clientes}
                selectedIds={selectedCliente ? [selectedCliente.id || selectedCliente.id_cliente] : []}
                max={1}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: false })}
                onToggle={(id) => {
                    const cl = clientes.find(c => String(c.id_cliente || c.id) === String(id));
                    dispatch({ type: 'SET_SELECTED_CLIENTE', payload: cl });
                    dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: false });
                }}
            />

            <HostessSelectModal
                visible={hostessSubModalVisible && hostessSelectionTarget !== null}
                hostesses={anfitrionas.map(a => ({
                    id: String(a.id_usuario || a.id),
                    id_usuario: String(a.id_usuario || a.id),
                    nick: a.nick,
                    status: a.estado_servicio || 1
                }))}
                selectedIds={hostessSelectionTarget ? (modalHostessSelections[hostessSelectionTarget.productId] || []) : []}
                max={hostessSelectionTarget?.max}
                onToggle={(id) => {
                    if (!hostessSelectionTarget) return;
                    const pid = hostessSelectionTarget.productId;
                    const currentSelected = modalHostessSelections[pid] || [];
                    let newSelected: string[];

                    if (currentSelected.includes(id)) {
                        newSelected = currentSelected.filter(x => x !== id);
                    } else {
                        if (hostessSelectionTarget.max && currentSelected.length >= hostessSelectionTarget.max) {
                            showToast('Límite', `Máximo ${hostessSelectionTarget.max} anfitrionas por esta cantidad`, 'error');
                            return;
                        }
                        newSelected = [...currentSelected, id];
                    }
                    dispatch({ type: 'SET_MODAL_HOSTESSES', productId: pid, hostesses: newSelected });
                }}
                onClose={() => {
                    dispatch({ type: 'SET_HOSTESS_TARGET', target: null });
                }}
                onConfirm={() => {
                    if (hostessSelectionTarget) {
                        const pid = hostessSelectionTarget.productId;
                        const hasComm = Number(hostessSelectionTarget.product.comision || hostessSelectionTarget.product.commission || 0) > 0;
                        const currentSelected = modalHostessSelections[pid] || [];
                        if (hasComm && currentSelected.length === 0) {
                            showToast('Asignación', 'Debes escoger al menos 1 anfitriona', 'error');
                            return;
                        }
                        addProductToCart(hostessSelectionTarget.product);
                        dispatch({ type: 'SET_HOSTESS_TARGET', target: null });
                    }
                }}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, fontWeight: '500', opacity: 0.8 },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(155,155,155,0.1)',
    },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '900', marginBottom: 15, textTransform: 'uppercase', opacity: 0.6 },
    selectorBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(155,155,155,0.03)' },
    selectorText: { fontSize: 14, fontWeight: '700' },
    summaryCard: { padding: 24, borderRadius: 32, borderWidth: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 14, fontWeight: '600' },
    summaryVal: { fontSize: 15, fontWeight: '800' },
    totalLabel: { fontSize: 18, fontWeight: '900' },
    totalValue: { fontSize: 26, fontWeight: '900' },
    submitBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { height: '80%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    productItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    productName: { fontSize: 16, fontWeight: '800' },
    productPrice: { fontSize: 14, fontWeight: '900', marginTop: 4, color: '#10B981' },
    modalQuantityActions: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    modalQtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    modalQtyText: { fontSize: 16, fontWeight: '700', marginHorizontal: 12 },
    addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    confirmModalBtn: { height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    confirmModalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
