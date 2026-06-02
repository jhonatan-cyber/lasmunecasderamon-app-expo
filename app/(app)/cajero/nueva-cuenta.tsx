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
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { CartList } from "@/components/cajero/forms/CartList";
import { ClientSelectModal } from '@/components/cajero/forms/ClientSelectModal';
import { HostessSelectModal } from "@/components/cajero/forms/HostessSelectModal";
import { RoomSelectModal } from '@/components/cajero/forms/RoomSelectModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAccentColor } from '@/hooks/useAccentColor';

import logger from '@/utils/logger';
type CuentaState = {
    loadingInitial: boolean;
    refreshing: boolean;
    anfitrionas: any[];
    habitaciones: any[];
    clientes: any[];
    cajaAbierta: boolean | null;
    cart: any[];
    selectedCliente: any;
    selectedHabitacion: any;
    categories: any[];
    modalOpen: boolean;
    modalCategoria: any;
    modalProducts: any[];
    modalLoading: boolean;
    modalQuantities: { [key: number]: number };
    modalHostessSelections: { [key: number]: (string | number)[] };
    hostessSelectionTarget: { productId: number; isChampagne: boolean; max: number; product?: any } | null;
    hostessSubModalVisible: boolean;
    hostessModalVisible: boolean;
    roomModalVisible: boolean;
    clientModalVisible: boolean;
    activeCartIdx: number | null;
    selectedTime: number;
    timeModalVisible: boolean;
    submitting: boolean;
};

type CuentaAction =
    | { type: 'SET_LOADING_INITIAL'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_INITIAL_DATA'; payload: any }
    | { type: 'SET_CART'; payload: any[] }
    | { type: 'SET_SELECTED_CLIENTE'; payload: any }
    | { type: 'SET_SELECTED_HABITACION'; payload: any }
    | { type: 'SET_MODAL_VISIBLE'; modal: string; visible: boolean }
    | { type: 'OPEN_CATEGORY_MODAL'; category: any; products: any[] }
    | { type: 'SET_MODAL_LOADING'; payload: boolean }
    | { type: 'SET_MODAL_QUANTITY'; productId: number; quantity: number }
    | { type: 'SET_MODAL_HOSTESSES'; productId: number; hostesses: (string | number)[] }
    | { type: 'SET_HOSTESS_TARGET'; target: any }
    | { type: 'SET_ACTIVE_CART_IDX'; payload: number | null }
    | { type: 'SET_SELECTED_TIME'; payload: number }
    | { type: 'SET_SUBMITTING'; payload: boolean };

const initialCuentaState: CuentaState = {
    loadingInitial: true,
    refreshing: false,
    anfitrionas: [],
    habitaciones: [],
    clientes: [],
    cajaAbierta: null,
    cart: [],
    selectedCliente: null,
    selectedHabitacion: null,
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
    selectedTime: 5,
    timeModalVisible: false,
    submitting: false,
};

function cuentaReducer(state: CuentaState, action: CuentaAction): CuentaState {
    switch (action.type) {
        case 'SET_LOADING_INITIAL': return { ...state, loadingInitial: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_INITIAL_DATA': return { ...state, ...action.payload };
        case 'SET_CART': return { ...state, cart: action.payload };
        case 'SET_SELECTED_CLIENTE': return { ...state, selectedCliente: action.payload };
        case 'SET_SELECTED_HABITACION': return { ...state, selectedHabitacion: action.payload };
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
        case 'SET_SELECTED_TIME': return { ...state, selectedTime: action.payload };
        case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
        default: return state;
    }
}

const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    Toast.show({
        type,
        text1: title,
        text2: message,
        visibilityTime: 4000,
    });
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

const getHostessLimit = (prod: any, qty: number) => {
    const price = prod.precio ?? prod.price ?? 0;
    if (isChampagneProduct(prod)) {
        return getChampagneLimit(price) * qty;
    }
    return qty;
};

const buildCommissionPreview = (items: any[], hostesses: any[]) => {
    const totalCommission = items.reduce((acc, item) => acc + (Number(item.comision || 0) * Number(item.cantidad || 0)), 0);
    const distribution = new Map<string, { id: string; name: string; amount: number }>();

    const addAmount = (hostessId: string | number, amount: number) => {
        if (!hostessId || amount <= 0) return;
        const key = String(hostessId);
        const hostess = hostesses.find((item: any) => String(item.id_usuario || item.id) === key);
        const current = distribution.get(key);
        distribution.set(key, {
            id: key,
            name: hostess?.nick || `Anfitriona ${key}`,
            amount: (current?.amount || 0) + amount,
        });
    };

    items.forEach((item) => {
        const selectedHostesses = Array.isArray(item.selectedHostesses) ? item.selectedHostesses.filter(Boolean) : [];
        const itemCommission = Number(item.comision || 0) * Number(item.cantidad || 0);

        if (itemCommission <= 0 || selectedHostesses.length === 0) return;

        if (item.isChampagne) {
            const totalRounded = Math.round(itemCommission);
            const base = Math.floor(totalRounded / selectedHostesses.length);
            const remainder = totalRounded % selectedHostesses.length;

            selectedHostesses.forEach((hostessId: string | number, index: number) => {
                addAmount(hostessId, base + (index === 0 ? remainder : 0));
            });
            return;
        }

        selectedHostesses.forEach((hostessId: string | number) => {
            addAmount(hostessId, itemCommission);
        });
    });

    return {
        totalCommission,
        assignedCommission: Array.from(distribution.values()).reduce((acc, item) => acc + item.amount, 0),
        hostessDistribution: Array.from(distribution.values()).sort((a, b) => b.amount - a.amount),
    };
};

export default function NuevaCuentaScreen() {
    const { accentColor, isDark } = useAccentColor();
    const router = useRouter();

    const [state, dispatch] = useReducer(cuentaReducer, initialCuentaState);
    const {
        loadingInitial, refreshing, anfitrionas, habitaciones, clientes, cajaAbierta,
        cart, selectedCliente, selectedHabitacion, categories, modalOpen, modalCategoria,
        modalProducts, modalLoading, modalQuantities, modalHostessSelections, hostessSelectionTarget,
        hostessSubModalVisible, roomModalVisible, clientModalVisible,
        submitting
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
            const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] = await Promise.all([
                apiClient('/cashregister/status'),
                apiClient('/anfitrionas'),
                apiClient('/rooms'),
                apiClient('/clients'),
                apiClient('/categories'),
            ]);

            const rawHabitaciones = roomsRes.success ? roomsRes.data : [];
            const fetchedData: any = {
                cajaAbierta: cajaRes.success && cajaRes.data.hasOpenCaja,
                anfitrionas: Array.isArray(anfitrionasRes) ? anfitrionasRes : (anfitrionasRes.success ? anfitrionasRes.data : []),
                habitaciones: rawHabitaciones.map((room: any) => ({
                    ...room,
                    nombre: room.nombre ?? room.name ?? `Habitación ${room.id_habitacion ?? room.id ?? ''}`.trim(),
                    precio: room.precio ?? room.price ?? 0,
                    tiempo: room.tiempo ?? room.time ?? 0,
                    estado: room.estado ?? room.status ?? 0,
                    comision_anfitriona: room.comision_anfitriona ?? 0,
                })),
                categories: categoriesRes.success ? (categoriesRes.data || []) : []
            };

            if (Array.isArray(clientsRes)) {
                fetchedData.clientes = clientsRes;
            } else if (clientsRes && clientsRes.success) {
                fetchedData.clientes = clientsRes.data || [];
            }

            dispatch({ type: 'SET_INITIAL_DATA', payload: fetchedData });

            if (!cajaRes.success || !cajaRes.data.hasOpenCaja) {
                showToast('Caja Cerrada', 'Debes abrir una caja antes de registrar consumos.', 'error');
            }
        } catch (error) {
            logger.captureException(error, { context: 'NuevaCuenta:createCuenta' });
            showToast('Error', 'No se pudo cargar la información necesaria.');
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
            } else {
                showToast('Error', 'No se pudieron cargar los productos');
            }
        } catch (error) {
            logger.captureException(error, { context: 'NuevaCuenta:handleOpenCategory' });
        } finally {
            dispatch({ type: 'SET_MODAL_LOADING', payload: false });
        }
    }, []);

    const addProductToCart = useCallback((prod: any) => {
        const id = prod.id || prod.id_producto;
        const totalQty = modalQuantities[id] || 1;
        const selectedHostesses = modalHostessSelections[id] || [];

        const price = prod.precio ?? prod.price ?? 0;
        const comm = prod.comision ?? prod.commission ?? 0;

        const newCart = [...cart];

        const hostessNames = selectedHostesses.length > 0
            ? selectedHostesses.map((hId: number | string) => anfitrionas.find((a: any) => String(a.id_usuario || a.id) === String(hId))?.nick || '').filter(Boolean).join(', ')
            : null;

        const existingItemIndex = newCart.findIndex((item) => {
            const itemId = item.id_producto || item.id;
            const currentH = item.selectedHostesses || [];
            const sortedCurrent = [...currentH].sort().join(',');
            const sortedNew = [...selectedHostesses].sort().join(',');
            return itemId === id && sortedCurrent === sortedNew;
        });

        if (existingItemIndex >= 0) {
            newCart[existingItemIndex].cantidad += totalQty;
            newCart[existingItemIndex].subtotal = price * newCart[existingItemIndex].cantidad;
        } else {
            newCart.push({
                id_producto: id,
                nombre: prod.nombre || prod.name || 'Producto',
                precio: price,
                comision: comm,
                cantidad: totalQty,
                subtotal: price * totalQty,
                selectedHostesses: selectedHostesses,
                hostessNames: hostessNames || null,
                isChampagne: isChampagneProduct(prod),
            });
        }

        dispatch({ type: 'SET_CART', payload: newCart });
        showToast('Agregado', `${prod.nombre || prod.name} sumado a la cuenta`, 'success');
    }, [cart, modalQuantities, modalHostessSelections, anfitrionas]);

    const totals = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
        const totalComision = cart.reduce((acc, item) => acc + item.comision * item.cantidad, 0);
        return { subtotal, totalComision, total: subtotal };
    }, [cart]);

    const commissionPreview = useMemo(
        () => buildCommissionPreview(cart, anfitrionas),
        [cart, anfitrionas]
    );

    const generateCodigo = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleSubmit = useCallback(async () => {
        if (!cajaAbierta) {
            showToast('Error', 'La caja está cerrada.');
            return;
        }
        if (!selectedCliente) {
            showToast('Error', 'Debes seleccionar un cliente.');
            return;
        }
        if (cart.length === 0) {
            showToast('Error', 'La cuenta está vacía.');
            return;
        }

        dispatch({ type: 'SET_SUBMITTING', payload: true });
        try {
            const selectedRoomId =
                selectedHabitacion?.id_habitacion ||
                selectedHabitacion?.id ||
                null;
            const selectedRoomTime = Number(
                selectedHabitacion?.tiempo ??
                selectedHabitacion?.time ??
                0
            );
            const selectedRoomCommission = Number(selectedHabitacion?.comision_anfitriona || 0);

            const cuentaData = {
                codigo: generateCodigo(),
                cliente_id: selectedCliente?.id || selectedCliente?.id_cliente,
                habitacion_id: selectedRoomId,
                tiempo:
                    selectedRoomId
                        ? selectedRoomCommission === 0
                            ? state.selectedTime
                            : selectedRoomTime
                        : 0,
                total_comision: totals.totalComision,
                sub_total: totals.subtotal,
                total: totals.total,
                detalles: cart.map((item) => ({
                    producto_id: item.id_producto || item.id,
                    precio: item.precio,
                    cantidad: item.cantidad,
                    sub_total: item.precio * item.cantidad,
                    comision: item.comision * (item.cantidad || 1),
                    hostesses: item.selectedHostesses,
                    isChampagne: item.isChampagne
                })),
                usuarios: [...new Set(cart.flatMap(item => item.selectedHostesses || []).filter(h => h !== null))]
            };

            const res = await apiClient('/cuentas', {
                method: 'POST',
                body: JSON.stringify(cuentaData),
            });

            if (res.success) {
                showToast('Éxito', 'Cuenta registrada correctamente', 'success');
                setTimeout(() => router.replace('/cajero/cuentas'), 1500);
            } else {
                showToast('Error', res.message || 'No se pudo crear la cuenta');
            }
        } catch (error) {
            logger.captureException(error, { context: 'NuevaCuenta:createCuenta' });
            showToast('Error', 'Ocurrió un error al procesar la cuenta.');
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    }, [cajaAbierta, selectedCliente, selectedHabitacion, cart, totals, router, state.selectedTime]);

    const NuevaCuentaSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <PremiumHeader
                title="Nueva Cuenta"
                subtitle="Cargando información..."
                rightComponent={
                    <View style={[styles.backBtnRight, { opacity: 0.5 }]}>
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        <Text style={styles.backTextRight}>Atrás</Text>
                    </View>
                }
            />
            <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
                <View style={styles.browserContainer}>
                    <Skeleton width={200} height={20} style={{ marginBottom: 16 }} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} width={140} height={64} borderRadius={20} />
                        ))}
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
                    <Skeleton width={150} height={18} style={{ marginBottom: 15 }} />
                    <Skeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 12 }} />
                    <Skeleton width="100%" height={56} borderRadius={16} />
                </View>

                <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                        <Skeleton width={100} height={18} />
                        <Skeleton width={80} height={18} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 15 }}>
                        <Skeleton width={120} height={24} />
                        <Skeleton width={100} height={32} />
                    </View>
                    <Skeleton width="100%" height={60} borderRadius={20} />
                </View>
            </ScrollView>
        </View>
    );

    if (loadingInitial) return <NuevaCuentaSkeleton />;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bg }]}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <PremiumHeader
                title="Nueva Cuenta"
                subtitle="Aperturar cuenta"
                rightComponent={
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backBtnRight}
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        <Text style={styles.backTextRight}>Atrás</Text>
                    </Pressable>
                }
            />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            >
                <View style={styles.browserContainer}>
                    <Text style={[styles.browserTitle, { color: textPrimary }]}>1. Selección de Productos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                        {categories.map((cat) => (
                            <Pressable
                                key={cat.id}
                                style={[styles.categorySmallCard, { backgroundColor: cardBg, borderColor }]}
                                onPress={() => handleOpenCategory(cat)}
                                accessibilityLabel={`Categoría ${cat.name}`}
                                accessibilityRole="button"
                            >
                                <View style={[styles.catIconBox, { backgroundColor: `${accentColor}15` }]}>
                                    <Ionicons name="beer-outline" size={20} color={accentColor} />
                                </View>
                                <Text style={[styles.catSmallName, { color: textPrimary }]}>{cat.name}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {cart.length > 0 && (
                    <CartList
                        items={cart}
                        title="Listado de Consumo"
                        onUpdateQuantity={(idx: number, delta: number) => {
                            const newCart = [...cart];
                            newCart[idx].cantidad = Math.max(1, newCart[idx].cantidad + delta);
                            newCart[idx].subtotal = newCart[idx].precio * newCart[idx].cantidad;
                            dispatch({ type: 'SET_CART', payload: newCart });
                        }}
                        onRemove={(idx: number) => {
                            const newCart = [...cart];
                            newCart.splice(idx, 1);
                            dispatch({ type: 'SET_CART', payload: newCart });
                        }}
                    />
                )}

                <View style={[styles.section, dynamicStyles.section, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: isTablet ? 16 : 13 }]}>2. Datos del Registro</Text>

                    <Pressable
                        style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor }]}
                        onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: true })}
                        accessibilityLabel="Seleccionar cliente"
                        accessibilityRole="button"
                    >
                        <Ionicons name="person" size={20} color={accentColor} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.selectorLabel, { color: textSecondary, fontSize: 10 }]}>CLIENTE</Text>
                            <Text style={[styles.selectorText, { color: textPrimary }]}>
                                {selectedCliente
                                    ? ((selectedCliente.nombre || selectedCliente.name || '') + ' ' + (selectedCliente.apellido || selectedCliente.lastName || selectedCliente.last_name || '')).trim() || 'Cliente Seleccionado'
                                    : 'Seleccionar Cliente'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                    </Pressable>

                    {totals.totalComision > 0 && (
                        <Pressable
                            style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor, marginTop: spacing / 2 }]}
                            onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: true })}
                            accessibilityLabel="Seleccionar habitación"
                            accessibilityRole="button"
                        >
                            <Ionicons name="business" size={20} color="#10B981" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.selectorLabel, { color: textSecondary, fontSize: 10 }]}>HABITACIÓN / ÁREA</Text>
                                <Text style={[styles.selectorText, { color: textPrimary }]}>{selectedHabitacion?.nombre || 'Seleccionar Habitación (Opcional)'}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                        </Pressable>
                    )}

                    {/* Selector de tiempo si hay comision y habitacion seleccionada sin costo fijo */}
                    {totals.totalComision > 0 && selectedHabitacion && (!selectedHabitacion.comision_anfitriona || Number(selectedHabitacion.comision_anfitriona) === 0) && (
                        <Pressable
                            style={[styles.selectorBtn, dynamicStyles.selectorBtn, { borderColor, marginTop: spacing / 2, backgroundColor: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.05)' }]}
                            onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'time', visible: true })}
                        >
                            <Ionicons name="time" size={20} color="#3B82F6" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.selectorLabel, { color: '#3B82F6', fontSize: 10, fontWeight: '700' }]}>DURACIÓN DEL REGISTRO</Text>
                                <Text style={[styles.selectorText, { color: textPrimary }]}>
                                    {state.selectedTime > 0 ? `${state.selectedTime} minutos` : 'Seleccionar duración'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={18} color="#3B82F6" />
                        </Pressable>
                    )}
                </View>

                <View style={[styles.summaryCard, dynamicStyles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Consumo Total</Text>
                        <Text style={[styles.summaryVal, { color: textPrimary }]}>${totals.subtotal.toLocaleString()}</Text>
                    </View>
                    {commissionPreview.totalCommission > 0 && (
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: borderColor }}>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: textSecondary }]}>Comision Productos</Text>
                                <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>${commissionPreview.totalCommission.toLocaleString()}</Text>
                            </View>
                            {commissionPreview.hostessDistribution.length > 0 && (
                                <View style={{ marginTop: 12, gap: 8 }}>
                                    <Text style={[styles.summaryLabel, { color: textSecondary }]}>Distribucion por anfitriona</Text>
                                    {commissionPreview.hostessDistribution.map((item) => (
                                        <View
                                            key={item.id}
                                            style={[
                                                styles.summaryRow,
                                                {
                                                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.10)' : '#FFF7ED',
                                                    borderWidth: 1,
                                                    borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FED7AA',
                                                    borderRadius: 14,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 10,
                                                }
                                            ]}
                                        >
                                            <Text style={[styles.summaryLabel, { color: textPrimary }]}>{item.name}</Text>
                                            <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>${item.amount.toLocaleString()}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                    <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 12 }]}>
                        <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>TOTAL CUENTA</Text>
                        <Text style={[styles.totalValFinal, { color: accentColor }]}>${totals.total.toLocaleString()}</Text>
                    </View>

                    <Pressable
                        style={[styles.submitBtn, dynamicStyles.submitBtn, { backgroundColor: accentColor, shadowColor: accentColor }, submitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                        accessibilityLabel="Registrar cuenta"
                        accessibilityRole="button"
                    >
                        {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Aperturar / Registrar Cuenta</Text>}
                    </Pressable>
                </View>
            </ScrollView>

            <Modal visible={modalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContentWide, { backgroundColor: cardBg }]}>
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

                        {modalLoading ? (
                            <ActivityIndicator color={accentColor} size="large" />
                        ) : (
                            <FlatList
                                data={modalProducts}
                                keyExtractor={(item) => (item.id || item.id_producto).toString()}
                                renderItem={({ item }) => (
                                    <View style={[styles.modalProductRow, { borderBottomColor: borderColor }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.modalProductName, { color: textPrimary }]}>{item.nombre || item.name}</Text>
                                            <Text style={[styles.modalProductPrice, { color: '#10B981' }]}>${(item.precio ?? item.price ?? 0).toLocaleString()}</Text>
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
                                            style={[styles.modalAddBtn, { backgroundColor: accentColor }]}
                                            onPress={() => {
                                                const id = item.id || item.id_producto;
                                                const hasComm = Number(item.comision || item.commission || 0) > 0;

                                                if (hasComm) {
                                                    dispatch({
                                                        type: 'SET_HOSTESS_TARGET',
                                                        target: {
                                                            productId: id,
                                                            product: item,
                                                            max: getHostessLimit(item, modalQuantities[id] || 1),
                                                            isChampagne: isChampagneProduct(item)
                                                        }
                                                    });
                                                } else {
                                                    addProductToCart(item);
                                                }
                                            }}
                                            accessibilityLabel={`Añadir ${item.nombre}`}
                                            accessibilityRole="button"
                                        >
                                            <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
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

            <ClientSelectModal
                visible={clientModalVisible}
                clients={clientes}
                selectedIds={selectedCliente ? [selectedCliente.id_cliente || selectedCliente.id] : []}
                max={1}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: false })}
                onToggle={(id) => {
                    const client = clientes.find(c => String(c.id_cliente || c.id) === String(id));
                    if (client) {
                        dispatch({ type: 'SET_SELECTED_CLIENTE', payload: client });
                        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: false });
                    }
                }}
            />

            <RoomSelectModal
                visible={roomModalVisible}
                rooms={habitaciones}
                selectedRoomId={selectedHabitacion?.id_habitacion || selectedHabitacion?.id}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: false })}
                onSelect={(room) => {
                    dispatch({ type: 'SET_SELECTED_HABITACION', payload: room });
                    dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: false });
                }}
            />

            <HostessSelectModal
                visible={hostessSubModalVisible && hostessSelectionTarget !== null}
                hostesses={anfitrionas
                  .filter((item: any, index: number, self: any[]) => 
                    index === self.findIndex((t: any) => (t.id_usuario || t.id) === (item.id_usuario || item.id))
                  )
                  .map((a: any) => ({
                    id: a.id_usuario || a.id,
                    id_usuario: a.id_usuario || a.id,
                    nick: a.nick,
                    status: a.status || 0,
                    estado_servicio: a.estado_servicio || 0
                  }))}
                selectedIds={hostessSelectionTarget ? (modalHostessSelections[hostessSelectionTarget.productId] || []) : []}
                max={hostessSelectionTarget?.max}
                onToggle={(id) => {
                    if (!hostessSelectionTarget) return;
                    const pid = hostessSelectionTarget.productId;
                    const currentSelected = modalHostessSelections[pid] || [];
                    let newSelected;

                    const strId = String(id);
                    if (currentSelected.some(x => String(x) === strId)) {
                        newSelected = currentSelected.filter(x => String(x) !== strId);
                    } else {
                        if (hostessSelectionTarget.max && currentSelected.length >= hostessSelectionTarget.max) {
                            showToast('Límite', `Máximo ${hostessSelectionTarget.max} anfitrionas por esta cantidad`, 'error');
                            return;
                        }
                        newSelected = [...currentSelected, strId];
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
                        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: false });
                    }
                }}
            />

            {/* Modal de Selección de Tiempo */}
            <Modal visible={state.timeModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Seleccionar Tiempo</Text>
                            <Pressable onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'time', visible: false })}>
                                <Ionicons name="close" size={26} color={textPrimary} />
                            </Pressable>
                        </View>
                        <ScrollView>
                            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.listItem, { borderBottomColor: borderColor }]}
                                    onPress={() => {
                                        dispatch({ type: 'SET_SELECTED_TIME', payload: t });
                                        dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'time', visible: false });
                                    }}
                                >
                                    <Text style={[styles.listItemTitle, { color: textPrimary, flex: 1 }]}>{t} minutos</Text>
                                    {state.selectedTime === t && <Ionicons name="checkmark-circle" size={24} color={accentColor} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, fontWeight: '500', opacity: 0.8 },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(155,155,155,0.1)' },
    backBtnRight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
        gap: 4
    },
    backTextRight: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '900', marginBottom: 15, textTransform: 'uppercase', opacity: 0.6 },
    browserContainer: { marginBottom: 20 },
    browserTitle: { fontSize: 13, fontWeight: '900', marginBottom: 16, textTransform: 'uppercase', opacity: 0.6 },
    categoryScroll: { gap: 12 },
    categorySmallCard: { width: 140, padding: 12, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64 },
    catIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    catSmallName: { fontSize: 12, fontWeight: '800' },
    cartItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
    cartItemInfo: { flex: 1 },
    cartItemName: { fontSize: 16, fontWeight: '700' },
    cartItemPrice: { fontSize: 13, marginTop: 2 },
    cartActions: { justifyContent: 'center' },
    selectorBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(155,155,155,0.03)' },
    selectorText: { fontSize: 14, fontWeight: '700' },
    selectorLabel: { fontWeight: '900', marginBottom: 2, letterSpacing: 0.3 },
    summaryCard: { padding: 24, borderRadius: 32, borderWidth: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 14, fontWeight: '600' },
    summaryVal: { fontSize: 15, fontWeight: '800' },
    totalLabelFinal: { fontSize: 18, fontWeight: '900' },
    totalValFinal: { fontSize: 26, fontWeight: '900' },
    submitBtn: {
        height: 60,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        elevation: 4,
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 }
    },
    submitBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContentWide: { width: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, height: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    modalProductsList: { padding: 16 },
    modalProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    modalProductName: { fontSize: 16, fontWeight: '800' },
    modalProductPrice: { fontSize: 14, fontWeight: '900', marginTop: 4 },
    modalQuantityActions: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    modalQtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    modalQtyText: { fontSize: 16, fontWeight: '700', marginHorizontal: 12 },
    modalAddBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10, elevation: 2, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    confirmModalBtn: {
        height: 56,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        elevation: 3,
        shadowColor: "#E11D48",
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 }
    },
    confirmModalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '85%', width: '100%' },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
    listItemTitle: { fontSize: 16, fontWeight: '700' },
});



