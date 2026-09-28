import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { showToast } from '@/utils/toast-lazy';
import { apiClientSafe } from '@/api/client';
import { useConfigValue } from '@/hooks/useConfigValue';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { getHostessLimit } from '@/hooks/utils/cuentaUtils';
import { CartItem, Product, Anfitriona, Room } from '@/components/shared/ProductCard';
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS } from '@/services/mirror';
import { getOutbox } from '@/services/outbox';
import logger from '@/utils/logger';

export interface Client {
    id: string;
    id_cliente?: string;
    name: string;
    nombre?: string;
    lastName: string;
    apellido?: string;
}

export function useGarzonProductos() {
    const router = useRouter();
    const { categoryId, categoryName } = useLocalSearchParams<{ categoryId: string; categoryName: string }>();
    const user = useAuthStore((state) => state.user);

    
    const [products, setProducts] = useState<Product[]>([]);
    const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    /** `true` si lo que se está viendo viene del espejo local. */
    const [fromCache, setFromCache] = useState(false);
    const dataRef = useRef<string>('');

    
    const [clientModalVisible, setClientModalVisible] = useState(false);
    const [clearCartAlertVisible, setClearCartAlertVisible] = useState(false);
    const [activeConfigItem, setActiveConfigItem] = useState<{ productId: string, type: 'hostess' | 'room' } | null>(null);

    
    const {
        cart,
        addToCart,
        removeFromCart,
        updateItemHostesses,
        updateItemRoom,
        tipEnabled,
        setTipEnabled,
        setTipPercentage,
        clearCart,
        getTipAmount,
        getTotal,
        buildOrderPayload
    } = useCartStore();

    const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));

    useEffect(() => {
        setTipPercentage(propinaPct);
    }, [propinaPct, setTipPercentage]);

    /**
     * Lectura con espejo: red primero y, si no hay, lo último guardado en el
     * dispositivo. El catálogo de un turno atrás sigue sirviendo para tomar el
     * pedido; la hora de la última sincronización se muestra en pantalla.
     */
    const readThroughMirror = useCallback(
        (key: string, endpoint: string, signal?: AbortSignal) =>
            getMirror().readThroughDetailed<any>(key, () => apiClientSafe(endpoint, { signal }), {
                maxAgeMs: MIRROR_MAX_AGE_MS.catalogo,
            }),
        []
    );

    const fetchData = useCallback(async (isManual = false, signal?: AbortSignal) => {
        try {
            setError('');
            const [prodRes, anfRes, roomRes, clientRes] = await Promise.allSettled([
                readThroughMirror(
                    MIRROR_KEYS.productsByCategory(String(categoryId)),
                    `/products?category_id=${categoryId}`,
                    signal
                ),
                readThroughMirror(MIRROR_KEYS.anfitrionas, '/anfitrionas', signal),
                readThroughMirror(MIRROR_KEYS.roomsAvailable, '/rooms?status=1', signal),
                readThroughMirror(MIRROR_KEYS.clients, '/clients', signal),
            ]);

            const prodData = prodRes.status === 'fulfilled' ? prodRes.value.data : null;
            const anfData = anfRes.status === 'fulfilled' ? anfRes.value.data : null;
            const roomData = roomRes.status === 'fulfilled' ? roomRes.value.data : null;
            const clientData = clientRes.status === 'fulfilled' ? clientRes.value.data : null;

            setFromCache(
                [prodRes, anfRes, roomRes, clientRes].some(
                    resultado => resultado.status === 'fulfilled' && resultado.value.fromCache
                )
            );

            logger.debug('Anfitrionas response', { data: anfData });

            const newData = { 
                products: (prodData as any)?.data, 
                anfitrionas: (anfData as any)?.data || (Array.isArray(anfData) ? anfData : null), 
                rooms: (roomData as any)?.data, 
                clients: (clientData as any)?.data || clientData 
            };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if ((prodData as any)?.success) {
                const active = ((prodData as any).data || []).filter((p: Product) => p.status === 1);
                setProducts(active);
            }
            if ((anfData as any)?.success) {
                setAnfitrionas((anfData as any).data || []);
            } else if (Array.isArray(anfData)) {
                setAnfitrionas(anfData);
            }
            if ((roomData as any)?.success) setRooms((roomData as any).data || []);
            
            if (Array.isArray(clientData)) {
                setClients(clientData);
            } else if ((clientData as any)?.success) {
                setClients((clientData as any).data || []);
            }

            if (isManual) {
                showToast({
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
                showToast({
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
    }, [categoryId, readThroughMirror]);

    useEffect(() => {
        const ac = new AbortController();
        fetchData(false, ac.signal);
        return () => ac.abort();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    const tipAmount = getTipAmount();
    const cartTotal = getTotal();

    const getMaxHostesses = (item: CartItem) => {
        return getHostessLimit(item.product, item.quantity);
    };

    const submitOrder = async () => {
        if (cart.length === 0) return;
        if (!user) return;

        
        for (const item of cart) {
            const hasCommission = (item.product.commission || 0) > 0;
            if (hasCommission && item.selectedHostesses.length === 0) {
                showToast({
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

            
            const buildResult = buildOrderPayload({
                meseroId: user.id,
                codigo,
                clienteId: selectedClientId,
                device_date: new Date().toISOString(),
            });

            if (!buildResult.success) {
                showToast({
                    type: 'error',
                    text1: 'Datos inválidos',
                    text2: buildResult.errors.join('; '),
                });
                setSubmitting(false);
                return;
            }

            const orderData = buildResult.data;

            logger.debug('[DEBUG] Enviando pedido', { orderData });

            // El pedido se encola SIEMPRE (una sola ruta de código, haya red o
            // no). El id de la intención viaja como clave de idempotencia, así
            // que un reintento tras un corte no duplica el pedido.
            const intent = await getOutbox().enqueueAndSend({
                type: 'order.create',
                payload: orderData,
                label: `Pedido ${codigo} · ${cart.reduce((acc, item) => acc + item.quantity, 0)} ítem(s)`,
            });

            if (intent.status === 'aplicada') {
                showToast({
                    type: 'success',
                    text1: 'Pedido Enviado',
                    text2: 'El pedido ha sido registrado correctamente',
                });
                clearCart();
                router.back();
                return;
            }

            if (intent.status === 'fallida') {
                throw new Error(intent.lastError || 'El servidor rechazó el pedido');
            }

            // Quedó pendiente: el trabajo está guardado y sale al volver la red.
            showToast({
                type: 'info',
                text1: 'Pedido guardado en el dispositivo',
                text2: 'Se enviará automáticamente cuando vuelva la conexión',
                visibilityTime: 4000,
            });
            clearCart();
            router.back();

        } catch (err: any) {
            showToast({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Error de conexión',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return {
        
        categoryName,

        
        products,
        anfitrionas,
        rooms,
        clients,
        selectedClientId,
        setSelectedClientId,
        loading,
        refreshing,
        submitting,
        error,
        fromCache,

        
        clientModalVisible,
        setClientModalVisible,
        clearCartAlertVisible,
        setClearCartAlertVisible,
        activeConfigItem,
        setActiveConfigItem,

        
        cart,
        addToCart,
        removeFromCart,
        updateItemHostesses,
        updateItemRoom,
        tipEnabled,
        setTipEnabled,
        clearCart,
        tipAmount,
        cartTotal,
        propinaPct,

        
        onRefresh,
        getMaxHostesses,
        submitOrder,
    };
}
