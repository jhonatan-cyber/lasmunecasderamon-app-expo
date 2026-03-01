import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { CartList } from "../../../components/cajero/forms/CartList";
import { ClientSelectModal } from '../../../components/cajero/forms/ClientSelectModal';
import { HostessSelectModal } from "../../../components/cajero/forms/HostessSelectModal";
import { RoomSelectModal } from '../../../components/cajero/forms/RoomSelectModal';
import { useAuthStore } from '../../../store/authStore';

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
    modalHostessSelections: { [key: number]: number[] };
    hostessSelectionTarget: { productId: number; isChampagne: boolean; max: number; product?: any } | null;
    hostessSubModalVisible: boolean;
    hostessModalVisible: boolean;
    roomModalVisible: boolean;
    clientModalVisible: boolean;
    activeCartIdx: number | null;
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
    | { type: 'SET_MODAL_HOSTESSES'; productId: number; hostesses: number[] }
    | { type: 'SET_HOSTESS_TARGET'; target: any }
    | { type: 'SET_ACTIVE_CART_IDX'; payload: number | null }
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
    if (precio >= 140000) return 3;
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

export default function NuevaCuentaScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((state) => state.user);

    const [state, dispatch] = useReducer(cuentaReducer, initialCuentaState);
    const {
        loadingInitial, refreshing, anfitrionas, habitaciones, clientes, cajaAbierta,
        cart, selectedCliente, selectedHabitacion, categories, modalOpen, modalCategoria,
        modalProducts, modalLoading, modalQuantities, modalHostessSelections, hostessSelectionTarget,
        hostessSubModalVisible, roomModalVisible, clientModalVisible,
        activeCartIdx, submitting
    } = state;

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const fetchInitialData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) dispatch({ type: 'SET_LOADING_INITIAL', payload: true });
        try {
            const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] = await Promise.all([
                apiClient('/cashregister/status'),
                apiClient('/users?anfitrionas=1'),
                apiClient('/rooms'),
                apiClient('/clients'),
                apiClient('/categories'),
            ]);

            const fetchedData: any = {
                cajaAbierta: cajaRes.success && cajaRes.data.hasOpenCaja,
                anfitrionas: anfitrionasRes.success ? anfitrionasRes.data : [],
                habitaciones: roomsRes.success ? roomsRes.data : [],
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
            console.error('Error fetching initial data:', error);
            showToast('Error', 'No se pudo cargar la información necesaria.');
        } finally {
            dispatch({ type: 'SET_LOADING_INITIAL', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, [user?.id]);

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
            console.error('Fetch products error:', error);
        } finally {
            dispatch({ type: 'SET_MODAL_LOADING', payload: false });
        }
    }, []);

    const addProductToCart = useCallback((prod: any) => {
        const id = prod.id || prod.id_producto;
        const totalQty = modalQuantities[id] || 1;
        const selectedHostesses = modalHostessSelections[id] || [];
        const hasComm = (prod.comision || prod.commission || 0) > 0;

        const hostessesToProcess = selectedHostesses.length > 0 ? selectedHostesses : [null];
        const baseQty = selectedHostesses.length > 0 ? Math.floor(totalQty / selectedHostesses.length) : totalQty;
        let remainingQty = totalQty;

        const price = prod.precio ?? prod.price ?? 0;
        const comm = prod.comision ?? prod.commission ?? 0;

        const newCart = [...cart];

        hostessesToProcess.forEach((hId, index) => {
            const isLast = index === hostessesToProcess.length - 1;
            const itemQty = isLast ? remainingQty : (baseQty === 0 ? 1 : baseQty);
            remainingQty -= itemQty;

            const itemHostesses = hId ? [hId] : [];
            const hostessNames = hId ? (anfitrionas.find((a: any) => (a.id_usuario || a.id) === hId)?.nick || '') : null;

            const existingItemIndex = newCart.findIndex((item) => {
                const itemId = item.id_producto || item.id;
                const currentH = item.selectedHostesses || [];
                const sortedCurrent = [...currentH].sort().join(',');
                const sortedNew = [...itemHostesses].sort().join(',');
                return itemId === id && sortedCurrent === sortedNew;
            });

            if (existingItemIndex >= 0) {
                newCart[existingItemIndex].cantidad += itemQty;
                newCart[existingItemIndex].subtotal = price * newCart[existingItemIndex].cantidad;
            } else {
                newCart.push({
                    id_producto: id,
                    nombre: prod.nombre || prod.name || 'Producto',
                    precio: price,
                    comision: comm,
                    cantidad: itemQty,
                    subtotal: price * itemQty,
                    selectedHostesses: itemHostesses,
                    hostessNames: hostessNames || null,
                    isChampagne: isChampagneProduct(prod),
                });
            }
        });

        dispatch({ type: 'SET_CART', payload: newCart });
        showToast('Agregado', `${prod.nombre || prod.name} sumado a la cuenta`, 'success');
    }, [cart, modalQuantities, modalHostessSelections, anfitrionas]);

    const totals = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
        const totalComision = cart.reduce((acc, item) => acc + item.comision * item.cantidad, 0);
        return { subtotal, totalComision, total: subtotal };
    }, [cart]);

    const generateCodigo = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'CTA-';
        for (let i = 0; i < 6; i++) {
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
            const cuentaData = {
                codigo: generateCodigo(),
                cliente_id: selectedCliente?.id || selectedCliente?.id_cliente,
                habitacion_id: selectedHabitacion?.id_habitacion || null,
                total_comision: totals.totalComision,
                sub_total: totals.subtotal,
                total: totals.total,
                detalles: cart.map((item) => ({
                    producto_id: item.id_producto,
                    precio: item.precio,
                    cantidad: item.cantidad,
                    sub_total: item.precio * item.cantidad,
                    comision: item.comision * item.cantidad,
                    hostesses: item.selectedHostesses,
                })),
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
            console.error('Submit error:', error);
            showToast('Error', 'Ocurrió un error al procesar la cuenta.');
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    }, [cajaAbierta, selectedCliente, selectedHabitacion, cart, totals, router]);

    if (loadingInitial) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color="#E11D48" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bg }]}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E11D48" />}
            >
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
                                <View style={[styles.catIconBox, { backgroundColor: idx % 2 === 0 ? '#E11D4815' : '#10B98115' }]}>
                                    <Ionicons name="beer-outline" size={20} color={idx % 2 === 0 ? '#E11D48' : '#10B981'} />
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

                <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>2. Datos del Registro</Text>
                    <Pressable
                        style={[styles.selectorBtn, { borderColor }]}
                        onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: true })}
                        accessibilityLabel="Seleccionar cliente"
                        accessibilityRole="button"
                    >
                        <Ionicons name="person-outline" size={22} color="#E11D48" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.selectorLabel, { color: textSecondary }]}>Cliente *</Text>
                            <Text style={[styles.selectorVal, { color: textPrimary }]}>
                                {selectedCliente ? `${selectedCliente.nombre || ''} ${selectedCliente.apellido || ''}` : 'Seleccionar cliente'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                    </Pressable>

                    <Pressable
                        style={[styles.selectorBtn, { borderColor, marginTop: 12 }]}
                        onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'room', visible: true })}
                        accessibilityLabel="Seleccionar habitación"
                        accessibilityRole="button"
                    >
                        <Ionicons name="business-outline" size={22} color="#10B981" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.selectorLabel, { color: textSecondary }]}>Habitación (Opcional)</Text>
                            <Text style={[styles.selectorVal, { color: textPrimary }]}>{selectedHabitacion?.nombre || 'Ninguna'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                    </Pressable>
                </View>

                <View style={[styles.summaryCard, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderTopColor: borderColor }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Consumo Total</Text>
                        <Text style={[styles.summaryVal, { color: textPrimary }]}>${totals.subtotal.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 12 }]}>
                        <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>TOTAL CUENTA</Text>
                        <Text style={styles.totalValFinal}>${totals.total.toLocaleString()}</Text>
                    </View>

                    <Pressable
                        style={[styles.submitBtn, { backgroundColor: '#E11D48' }, submitting && { opacity: 0.7 }]}
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
                            <ActivityIndicator color="#E11D48" size="large" />
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
                                            style={[styles.modalAddBtn, { backgroundColor: '#E11D48' }]}
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
                            style={styles.confirmModalBtn}
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
                    const client = clientes.find(c => (c.id_cliente || c.id) === id);
                    dispatch({ type: 'SET_SELECTED_CLIENTE', payload: client });
                    dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'client', visible: false });
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
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '900', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.6 },
    browserContainer: { marginBottom: 20 },
    browserTitle: { fontSize: 13, fontWeight: '900', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' },
    categoryScroll: { gap: 12 },
    categorySmallCard: { width: 140, padding: 12, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64 },
    catIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    catSmallName: { fontSize: 12, fontWeight: '800' },
    cartItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
    cartItemInfo: { flex: 1 },
    cartItemName: { fontSize: 16, fontWeight: '700' },
    cartItemPrice: { fontSize: 13, marginTop: 2 },
    cartActions: { justifyContent: 'center' },
    selectorBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(155,155,155,0.03)' },
    selectorLabel: { fontSize: 11, fontWeight: '800', marginBottom: 2 },
    selectorVal: { fontSize: 15, fontWeight: '700' },
    summaryCard: { padding: 24, borderRadius: 32, marginTop: 10, borderTopWidth: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
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
    modalProductsList: { padding: 16 },
    modalProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    modalProductName: { fontSize: 16, fontWeight: '800' },
    modalProductPrice: { fontSize: 14, fontWeight: '900', marginTop: 4 },
    modalQuantityActions: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    modalQtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    modalQtyText: { fontSize: 16, fontWeight: '700', marginHorizontal: 12 },
    modalAddBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    confirmModalBtn: { height: 50, borderRadius: 16, backgroundColor: '#E11D48', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    confirmModalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
