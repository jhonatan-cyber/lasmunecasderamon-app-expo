import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
    useColorScheme,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { CartList } from "../../../components/cajero/forms/CartList";
import { HostessSelectModal } from "../../../components/cajero/forms/HostessSelectModal";
import { useAccentColor } from '../../../hooks/useAccentColor';

type CuentaState = {
    loadingInitial: boolean;
    refreshing: boolean;
    anfitrionas: any[];
    categories: any[];
    cart: any[];
    modalOpen: boolean;
    modalCategoria: any;
    modalProducts: any[];
    modalLoading: boolean;
    modalQuantities: { [key: number]: number };
    modalHostessSelections: { [key: number]: number[] };
    hostessSelectionTarget: { productId: number; isChampagne: boolean; max: number; product?: any } | null;
    hostessSubModalVisible: boolean;
    submitting: boolean;
    extraTiempo: number;
    timeModalVisible: boolean;
    cuentaDetalle: any;
};

type CuentaAction =
    | { type: 'SET_LOADING_INITIAL'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_INITIAL_DATA'; payload: any }
    | { type: 'SET_CART'; payload: any[] }
    | { type: 'SET_MODAL_VISIBLE'; modal: string; visible: boolean }
    | { type: 'OPEN_CATEGORY_MODAL'; category: any; products: any[] }
    | { type: 'SET_MODAL_LOADING'; payload: boolean }
    | { type: 'SET_MODAL_QUANTITY'; productId: number; quantity: number }
    | { type: 'SET_MODAL_HOSTESSES'; productId: number; hostesses: number[] }
    | { type: 'SET_HOSTESS_TARGET'; target: any }
    | { type: 'SET_SUBMITTING'; payload: boolean }
    | { type: 'SET_EXTRA_TIEMPO'; payload: number }
    | { type: 'SET_TIME_MODAL_VISIBLE'; payload: boolean };

const initialCuentaState: CuentaState = {
    loadingInitial: true,
    refreshing: false,
    anfitrionas: [],
    categories: [],
    cart: [],
    modalOpen: false,
    modalCategoria: null,
    modalProducts: [],
    modalLoading: false,
    modalQuantities: {},
    modalHostessSelections: {},
    hostessSelectionTarget: null,
    hostessSubModalVisible: false,
    submitting: false,
    extraTiempo: 0,
    timeModalVisible: false,
    cuentaDetalle: null,
};

function cuentaReducer(state: CuentaState, action: CuentaAction): CuentaState {
    switch (action.type) {
        case 'SET_LOADING_INITIAL': return { ...state, loadingInitial: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_INITIAL_DATA': return { ...state, ...action.payload };
        case 'SET_CART': return { ...state, cart: action.payload };
        case 'SET_MODAL_VISIBLE':
            return { ...state, modalOpen: action.visible };
        case 'OPEN_CATEGORY_MODAL':
            return { ...state, modalOpen: true, modalCategoria: action.category, modalProducts: action.products, modalQuantities: {}, modalHostessSelections: {} };
        case 'SET_MODAL_LOADING': return { ...state, modalLoading: action.payload };
        case 'SET_MODAL_QUANTITY':
            return { ...state, modalQuantities: { ...state.modalQuantities, [action.productId]: action.quantity } };
        case 'SET_MODAL_HOSTESSES':
            return { ...state, modalHostessSelections: { ...state.modalHostessSelections, [action.productId]: action.hostesses } };
        case 'SET_HOSTESS_TARGET':
            return { ...state, hostessSelectionTarget: action.target, hostessSubModalVisible: !!action.target };
        case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
        case 'SET_EXTRA_TIEMPO': return { ...state, extraTiempo: action.payload };
        case 'SET_TIME_MODAL_VISIBLE': return { ...state, timeModalVisible: action.payload };
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

export default function AgregarCuentaScreen() {
    const { accentColor, gradientColors, isDark } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    const cuentaOriginal = useMemo(() => {
        if (params.cuenta && typeof params.cuenta === 'string') {
            try {
                return JSON.parse(params.cuenta);
            } catch (e) {
                return null;
            }
        }
        return null;
    }, [params.cuenta]);

    const [state, dispatch] = useReducer(cuentaReducer, initialCuentaState);
    const {
        loadingInitial, refreshing, anfitrionas, categories, modalOpen, modalCategoria,
        modalProducts, modalLoading, modalQuantities, modalHostessSelections, hostessSelectionTarget,
        hostessSubModalVisible, cart, submitting, extraTiempo, timeModalVisible, cuentaDetalle
    } = state;

    const hasRoom = !!(cuentaOriginal?.habitacion_id);
    // IDs de anfitrionas ya asignadas a la cuenta (para pre-selección)
    const accountHostessIds: number[] = (cuentaDetalle?.usuarios || []).map((u: any) => u.usuario_id || u.id_usuario).filter(Boolean);

    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const bg = isDark ? '#0F0D2E' : '#F3F4F6';
    const cardBg = isDark ? '#1E1B4B' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB';

    const spacing = isTablet ? 24 : 16;
    const borderRadius = isTablet ? 28 : 24;

    const dynamicStyles = {
        scrollContent: { padding: spacing, paddingBottom: 100 },
        section: { padding: spacing, borderRadius: borderRadius, marginBottom: spacing },
        summaryCard: { padding: spacing + 8, borderRadius: borderRadius + 4 },
        submitBtn: { height: isTablet ? 70 : 60, borderRadius: isTablet ? 24 : 20 },
    };

    const fetchInitialData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) dispatch({ type: 'SET_LOADING_INITIAL', payload: true });
        try {
            const requests: Promise<any>[] = [
                apiClient('/users?anfitrionas=1'),
                apiClient('/categories'),
            ];
            // También fetched el detalle completo de la cuenta para obtener los usuarios asignados
            if (cuentaOriginal?.id_cuenta) {
                requests.push(apiClient(`/cuentas/${cuentaOriginal.id_cuenta}`));
            }

            const [anfitrionasRes, categoriesRes, cuentaDetalleRes] = await Promise.all(requests);

            dispatch({
                type: 'SET_INITIAL_DATA', payload: {
                    anfitrionas: anfitrionasRes.success ? anfitrionasRes.data : [],
                    categories: categoriesRes.success ? (categoriesRes.data || []) : [],
                    cuentaDetalle: cuentaDetalleRes || null,
                }
            });

        } catch (error) {
            console.error('Error fetching initial data:', error);
            showToast('Error', 'No se pudo cargar la información necesaria.');
        } finally {
            dispatch({ type: 'SET_LOADING_INITIAL', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, [cuentaOriginal?.id_cuenta]);

    useEffect(() => {
        fetchInitialData();
        if (!cuentaOriginal) {
            showToast('Error', 'No se recibió la información de la cuenta');
            router.back();
        }
    }, [fetchInitialData, cuentaOriginal]);

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
            console.error('Fetch products error:', error);
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
            ? selectedHostesses.map((hId: number) => anfitrionas.find((a: any) => (a.id_usuario || a.id) === hId)?.nick || '').filter(Boolean).join(', ')
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
        return { subtotal, total: subtotal + (cuentaOriginal?.total || 0) };
    }, [cart, cuentaOriginal]);

    const handleSubmit = useCallback(async () => {
        if (cart.length === 0) {
            showToast('Error', 'No has agregado nuevos productos.');
            return;
        }

        dispatch({ type: 'SET_SUBMITTING', payload: true });
        try {
            // Unir anfitrionas de la cuenta original (desde detalle completo) con las nuevas
            // Usamos cuentaDetalle porque cuentaOriginal (del listado) no trae el array de usuarios
            const originalUserIds = (cuentaDetalle?.usuarios || [])
                .map((u: any) => u.usuario_id || u.id_usuario)
                .filter(Boolean) as number[];
            const mergedHostessIds = new Set<number>(originalUserIds);

            cart.forEach(item => {
                if (item.selectedHostesses && Array.isArray(item.selectedHostesses)) {
                    item.selectedHostesses.forEach((hId: number) => {
                        if (hId) mergedHostessIds.add(hId);
                    });
                }
            });

            const cuentaData: any = {
                detalles: cart.map((item) => ({
                    producto_id: item.id_producto || item.id,
                    precio: item.precio,
                    cantidad: item.cantidad,
                    sub_total: item.precio * item.cantidad,
                    comision: item.comision * (item.cantidad || 1),
                    hostesses: item.selectedHostesses || [],
                    isChampagne: item.isChampagne
                })),
                usuarios: Array.from(mergedHostessIds)
            };

            // Si hay tiempo extra y la cuenta tiene habitación, adjuntarlo
            if (extraTiempo > 0 && hasRoom) {
                cuentaData.extraTiempo = extraTiempo;
            }

            const res = await apiClient(`/cuentas/${cuentaOriginal.id_cuenta}`, {
                method: 'PUT',
                body: JSON.stringify(cuentaData),
            });

            if (res.success) {
                showToast('Éxito', 'Productos agregados correctamente', 'success');
                setTimeout(() => router.back(), 1500);
            } else {
                showToast('Error', res.message || 'No se pudo actualizar la cuenta');
            }
        } catch (error) {
            console.error('Submit error:', error);
            showToast('Error', 'Ocurrió un error al procesar la cuenta.');
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    }, [cart, cuentaOriginal, router, extraTiempo, hasRoom, cuentaDetalle]);

    if (loadingInitial) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color={accentColor} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bg }]}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'dark' : 'light'} />

            {/* Header premium con gradiente */}
            <LinearGradient
                colors={gradientColors as any}
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + (isTablet ? 20 : 10),
                        paddingBottom: 25,
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
                    },
                ]}
            >
                <View style={styles.headerTop}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backBtn}
                    >
                        <Ionicons name="arrow-back" size={isTablet ? 30 : 24} color={isDark ? "#111827" : "#FFFFFF"} />
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={[styles.headerTitle, { color: isDark ? "#111827" : "#FFFFFF" }, isTablet && { fontSize: 28 }]}>
                            Agregar Productos
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: isDark ? "#6B7280" : "rgba(255,255,255,0.8)" }, isTablet && { fontSize: 17 }]}>
                            Cuenta {cuentaOriginal?.codigo}
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            >
                <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor }]}>
                    <Ionicons name="information-circle-outline" size={24} color="#3B82F6" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: textPrimary, fontSize: 13, fontWeight: "600" }}>Estás agregando a la cuenta {cuentaOriginal?.codigo}</Text>
                        <Text style={{ color: textSecondary, fontSize: 12 }}>Cliente: {cuentaOriginal?.cliente_nombre || 'Sin cliente'}</Text>
                    </View>
                </View>

                {/* Selector de tiempo extra (solo si tiene habitación) */}
                {hasRoom && (
                    <Pressable
                        style={[styles.tiempoChip, { backgroundColor: extraTiempo > 0 ? '#3B82F610' : cardBg, borderColor: extraTiempo > 0 ? '#3B82F6' : borderColor }]}
                        onPress={() => dispatch({ type: 'SET_TIME_MODAL_VISIBLE', payload: true })}
                    >
                        <Ionicons name="timer-outline" size={18} color={extraTiempo > 0 ? '#3B82F6' : textSecondary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.tiempoChipLabel, { color: textSecondary }]}>TIEMPO EXTRA HABITACIÓN</Text>
                            <Text style={[styles.tiempoChipValue, { color: extraTiempo > 0 ? '#3B82F6' : textPrimary }]}>
                                {extraTiempo > 0 ? `+ ${extraTiempo} minutos` : 'Sin tiempo extra'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={16} color={extraTiempo > 0 ? '#3B82F6' : textSecondary} />
                    </Pressable>
                )}

                <View style={styles.browserContainer}>
                    <Text style={[styles.browserTitle, { color: textPrimary }]}>1. Selección de Productos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                        {categories.map((cat, idx) => (
                            <Pressable
                                key={cat.id}
                                style={[styles.categorySmallCard, { backgroundColor: cardBg, borderColor }]}
                                onPress={() => handleOpenCategory(cat)}
                                accessibilityLabel={`Categoría ${cat.name}`}
                                accessibilityRole="button"
                            >
                                <View style={[styles.catIconBox, { backgroundColor: idx % 2 === 0 ? `${accentColor}15` : '#10B98115' }]}>
                                    <Ionicons name="beer-outline" size={20} color={idx % 2 === 0 ? accentColor : '#10B981'} />
                                </View>
                                <Text style={[styles.catSmallName, { color: textPrimary }]}>{cat.name}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {cart.length > 0 ? (
                    <CartList
                        items={cart}
                        title="Nuevos Consumos"
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
                ) : (
                    <View style={[styles.emptyCartBox, { backgroundColor: cardBg, borderColor }]}>
                        <Text style={[styles.emptyCartText, { color: textSecondary }]}>No se han agregado nuevos consumos</Text>
                    </View>
                )}

                <View style={[styles.summaryCard, dynamicStyles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Total Original</Text>
                        <Text style={[styles.summaryVal, { color: textPrimary }]}>${(cuentaOriginal?.total || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Nuevos Consumos</Text>
                        <Text style={[styles.summaryVal, { color: '#E11D48' }]}>+ ${totals.subtotal.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 12 }]}>
                        <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>NUEVO TOTAL</Text>
                        <Text style={[styles.totalValFinal, { color: accentColor }]}>${totals.total.toLocaleString()}</Text>
                    </View>

                    <Pressable
                        style={[styles.submitBtn, { backgroundColor: cart.length > 0 ? accentColor : '#9CA3AF' }, submitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={submitting || cart.length === 0}
                        accessibilityLabel="Agregar productos"
                        accessibilityRole="button"
                    >
                        {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Agregar a Cuenta</Text>}
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
                                                    const max = getHostessLimit(item, modalQuantities[id] || 1);

                                                    // Pre-seleccionar anfitrionas de la cuenta si el producto aún no tiene selección
                                                    const currentSelections = modalHostessSelections[id] || [];
                                                    if (currentSelections.length === 0 && accountHostessIds.length > 0) {
                                                        const preSelected = accountHostessIds.slice(0, max);
                                                        dispatch({ type: 'SET_MODAL_HOSTESSES', productId: id, hostesses: preSelected });
                                                    }

                                                    dispatch({
                                                        type: 'SET_HOSTESS_TARGET',
                                                        target: {
                                                            productId: id,
                                                            product: item,
                                                            max,
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

            {/* Modal selección de tiempo extra */}
            <Modal visible={timeModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContentWide, { backgroundColor: cardBg, height: 'auto', maxHeight: '60%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Tiempo Extra</Text>
                            <Pressable onPress={() => dispatch({ type: 'SET_TIME_MODAL_VISIBLE', payload: false })}>
                                <Ionicons name="close" size={26} color={textPrimary} />
                            </Pressable>
                        </View>
                        <Text style={{ color: textSecondary, fontSize: 13, marginBottom: 16, fontWeight: '600' }}>
                            Selecciona cuántos minutos agregar a la habitación
                        </Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Opción sin tiempo extra */}
                            <Pressable
                                style={[styles.timeOption, { borderColor: extraTiempo === 0 ? '#3B82F6' : borderColor, backgroundColor: extraTiempo === 0 ? '#3B82F610' : 'transparent' }]}
                                onPress={() => {
                                    dispatch({ type: 'SET_EXTRA_TIEMPO', payload: 0 });
                                    dispatch({ type: 'SET_TIME_MODAL_VISIBLE', payload: false });
                                }}
                            >
                                <Text style={[styles.timeOptionText, { color: extraTiempo === 0 ? '#3B82F6' : textPrimary }]}>Sin tiempo extra</Text>
                                {extraTiempo === 0 && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
                            </Pressable>
                            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((t) => (
                                <Pressable
                                    key={t}
                                    style={[styles.timeOption, { borderColor: extraTiempo === t ? '#3B82F6' : borderColor, backgroundColor: extraTiempo === t ? '#3B82F610' : 'transparent' }]}
                                    onPress={() => {
                                        dispatch({ type: 'SET_EXTRA_TIEMPO', payload: t });
                                        dispatch({ type: 'SET_TIME_MODAL_VISIBLE', payload: false });
                                    }}
                                >
                                    <Text style={[styles.timeOptionText, { color: extraTiempo === t ? '#3B82F6' : textPrimary }]}>+ {t} minutos</Text>
                                    {extraTiempo === t && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <HostessSelectModal
                visible={hostessSubModalVisible && hostessSelectionTarget !== null}
                hostesses={anfitrionas.map((a: any) => ({
                    id: a.id_usuario || a.id,
                    id_usuario: a.id_usuario || a.id,
                    nick: a.nick,
                    status: a.status || 0
                }))}
                selectedIds={hostessSelectionTarget ? (modalHostessSelections[hostessSelectionTarget.productId] || []) : []}
                max={hostessSelectionTarget?.max}
                onToggle={(id) => {
                    if (!hostessSelectionTarget) return;
                    const pid = hostessSelectionTarget.productId;
                    const currentSelected = modalHostessSelections[pid] || [];
                    let newSelected;

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
    header: { paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, fontWeight: '500', opacity: 0.8 },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(155,155,155,0.1)' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
    browserContainer: { marginBottom: 20 },
    browserTitle: { fontSize: 13, fontWeight: '900', marginBottom: 16, textTransform: 'uppercase', opacity: 0.6 },
    categoryScroll: { gap: 12 },
    categorySmallCard: { width: 140, padding: 12, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64 },
    catIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    catSmallName: { fontSize: 12, fontWeight: '800' },
    emptyCartBox: { padding: 20, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyCartText: { fontSize: 14, fontWeight: '600' },
    summaryCard: { padding: 24, borderRadius: 32, borderWidth: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 14, fontWeight: '600' },
    summaryVal: { fontSize: 15, fontWeight: '800' },
    totalLabelFinal: { fontSize: 18, fontWeight: '900' },
    totalValFinal: { fontSize: 26, fontWeight: '900', color: '#E11D48' },
    submitBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContentWide: { width: '95%', alignSelf: 'center', borderRadius: 32, padding: 20, height: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    modalProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    modalProductName: { fontSize: 16, fontWeight: '800' },
    modalProductPrice: { fontSize: 14, fontWeight: '900', marginTop: 4 },
    modalQuantityActions: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    modalQtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    modalQtyText: { fontSize: 16, fontWeight: '700', marginHorizontal: 12 },
    modalAddBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    confirmModalBtn: { height: 50, borderRadius: 16, backgroundColor: '#E11D48', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    confirmModalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    tiempoChip: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 20,
    },
    tiempoChipLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    tiempoChipValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
    timeOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8,
    },
    timeOptionText: { fontSize: 15, fontWeight: '700' },
});
