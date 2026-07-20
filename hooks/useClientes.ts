import { useCallback, useState, useMemo } from 'react';
import { Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { showToast } from '@/utils/toast-lazy';
import { useAccentColor } from '@/hooks/useAccentColor';
import { clientesService } from '@/services';
import type { PrepagoPayload } from '@/services/clientes';
import { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';
import logger from '@/utils/logger';

export interface Client {
    id: string | number;
    run?: string;
    name: string;
    lastName: string;
    phone?: string;
    saldo: number;
    deuda: number;
    status?: number;
}

export function useClientes() {
    const theme = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState("");

    
    const [clientModalVisible, setClientModalVisible] = useState(false);
    const [loadModalVisible, setLoadModalVisible] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [loadingAmount, setLoadingAmount] = useState("");
    const [loadMetodoPago, setLoadMetodoPago] = useState<PaymentMethod>('efectivo');
    const [submitting, setSubmitting] = useState(false);
    
    
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [refreshingHistory, setRefreshingHistory] = useState(false);

    
    const [primaryMethod, setPrimaryMethod] = useState<PaymentMethod>('efectivo');
    const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethod>('transferencia');
    const [primaryAmount, setPrimaryAmount] = useState("");
    const [secondaryAmount, setSecondaryAmount] = useState("");

    
    const [formName, setFormName] = useState("");
    const [formLastName, setFormLastName] = useState("");
    const [formRun, setFormRun] = useState("");
    const [formPhone, setFormPhone] = useState("");

    const fetchClients = useCallback(async (showRefreshing = false, signal?: AbortSignal) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await clientesService.list(signal);
            const listData = res as unknown as { success: boolean; data: Client[] };
            if (Array.isArray(res)) {
                setClients(res as Client[]);
            } else if (listData.success) {
                setClients(listData.data || []);
            }
        } catch (error: any) {
            logger.captureException(error, { context: 'Clientes:fetchClients' });
            showToast({ type: 'error', text1: 'Error', text2: error.message || 'No se pudieron descargar los clientes' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const ac = new AbortController();
            fetchClients(true, ac.signal);
            return () => ac.abort();
        }, [fetchClients])
    );

    const filteredClients = useMemo(() => {
        let list = [...clients];
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(c =>
                (c.name?.toLowerCase().includes(s)) ||
                (c.lastName?.toLowerCase().includes(s)) ||
                (c.run?.toLowerCase().includes(s)) ||
                (c.phone?.toLowerCase().includes(s))
            );
        }
        return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [clients, search]);

    const totals = useMemo(() => {
        return filteredClients.reduce((acc, client) => {
            acc.totalSaldo += Number(client.saldo || 0);
            acc.totalDeuda += Number(client.deuda || 0);
            return acc;
        }, { totalSaldo: 0, totalDeuda: 0 });
    }, [filteredClients]);

    const handleOpenEdit = (client: Client) => {
        setEditingClient(client);
        setFormName(client.name || "");
        setFormLastName(client.lastName || "");
        setFormRun(client.run || "");
        setFormPhone(client.phone || "");
        setClientModalVisible(true);
    };

    const handleOpenNew = () => {
        setEditingClient(null);
        setFormName("");
        setFormLastName("");
        setFormRun("");
        setFormPhone("");
        setClientModalVisible(true);
    };

    const handleSaveClient = async () => {
        if (!formName || !formLastName) {
            showToast({ type: 'error', text1: 'Error', text2: 'Nombre y apellido son obligatorios' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                id: editingClient?.id,
                name: formName,
                lastName: formLastName,
                run: formRun,
                phone: formPhone
            };

            const res = editingClient
                ? await clientesService.update(editingClient.id, payload)
                : await clientesService.create(payload);

            const saveRes = res as unknown as { success: boolean; id?: string | number; message?: string };
            if (saveRes.success || saveRes.id || (editingClient && saveRes.message)) {
                showToast({ type: 'success', text1: 'Éxito', text2: editingClient ? 'Cliente actualizado' : 'Cliente creado' });
                setClientModalVisible(false);
                fetchClients(true);
            } else {
                showToast({ type: 'error', text1: 'Error', text2: saveRes.message || 'Error al guardar' });
            }
        } catch (error: any) {
            logger.captureException(error, { context: 'Clientes:saveClient' });
            showToast({ type: 'error', text1: 'Error', text2: error.message || 'Error de conexión' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenLoad = (client: Client) => {
        setEditingClient(client);
        setLoadingAmount("");
        setLoadMetodoPago('efectivo');
        setPrimaryAmount("");
        setSecondaryAmount("");
        setLoadModalVisible(true);
    };

    const fetchHistory = async (clientId: string | number) => {
        try {
            const res = await clientesService.getHistory(clientId);
            const historyRes = res as unknown as { success: boolean; data: any[] };
            if (historyRes.success && Array.isArray(historyRes.data)) {
                setHistoryData(historyRes.data);
            } else if (Array.isArray(res)) {
                setHistoryData(res);
            }
        } catch (error) {
            logger.captureException(error, { context: 'Clientes:fetchHistory' });
        } finally {
            setHistoryLoading(false);
            setRefreshingHistory(false);
        }
    };

    const handleOpenHistory = async (client: Client) => {
        setEditingClient(client);
        setHistoryModalVisible(true);
        setHistoryLoading(true);
        setHistoryData([]);
        fetchHistory(client.id);
    }; 
    
    const formatCurrency = (value: string) => {
        const cleanValue = value.replace(/\D/g, "");
        if (!cleanValue) return "";
        return Number(cleanValue).toLocaleString('de-DE');
    };

    const unformatCurrency = (value: string) => {
        return value.replace(/\./g, "");
    };

    const handleLoadBalance = async () => {
        const rawAmount = unformatCurrency(loadingAmount);
        if (!editingClient || !rawAmount || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
            showToast({ type: 'error', text1: 'Error', text2: 'Ingrese un monto válido' });
            return;
        }

        if (loadMetodoPago === 'mixto') {
            const pAmount = Number(unformatCurrency(primaryAmount)) || 0;
            const sAmount = Number(unformatCurrency(secondaryAmount)) || 0;
            if (pAmount + sAmount !== Number(rawAmount)) {
                showToast({ type: 'error', text1: 'Error', text2: `Los montos no coinciden con el total ($${Number(rawAmount).toLocaleString()})` });
                return;
            }
        }

        setSubmitting(true);
        try {
            const body: PrepagoPayload = {
                cliente_id: editingClient.id,
                monto: Number(rawAmount),
                tipo: 'CARGA',
                metodo_pago: loadMetodoPago,
                motivo: 'Carga de saldo prepago (Módulo Clientes)'
            };

            if (loadMetodoPago === 'mixto') {
                body.pagos_mixtos = [
                    { metodo: primaryMethod, monto: Number(unformatCurrency(primaryAmount)) },
                    { metodo: secondaryMethod, monto: Number(unformatCurrency(secondaryAmount)) }
                ];
            }

            const res = await clientesService.prepago(body);
            const prepagoRes = res as unknown as { success: boolean; message?: string };

            if (prepagoRes.success) {
                showToast({ type: 'success', text1: 'Éxito', text2: 'Saldo cargado correctamente' });
                setLoadModalVisible(false);
                await fetchClients(true);
            } else {
                showToast({ type: 'error', text1: 'Error', text2: prepagoRes.message || 'Error al cargar saldo' });
            }
        } catch (error: any) {
            logger.captureException(error, { context: 'Clientes:loadBalance' });
            showToast({ type: 'error', text1: 'Error', text2: error.message || 'Error de conexión' });
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = (client: Client) => {
        Alert.alert(
            "Eliminar Cliente",
            `¿Está seguro que desea eliminar a ${client.name} ${client.lastName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await clientesService.delete(client.id);
                            const delRes = res as unknown as { success: boolean; message?: string };
                            if (delRes.success || delRes.message) {
                                showToast({ type: 'success', text1: 'Eliminado', text2: 'Cliente eliminado correctamente' });
                                fetchClients(true);
                            }
                        } catch (error: any) {
                            showToast({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo eliminar' });
                        }
                    }
                }
            ]
        );
    };

    return {
        ...theme,
        router,
        insets,
        isTablet,
        loading,
        refreshing,
        clients,
        search,
        setSearch,
        clientModalVisible,
        setClientModalVisible,
        loadModalVisible,
        setLoadModalVisible,
        editingClient,
        loadingAmount,
        setLoadingAmount,
        loadMetodoPago,
        setLoadMetodoPago,
        submitting,
        historyModalVisible,
        setHistoryModalVisible,
        historyLoading,
        historyData,
        refreshingHistory,
        setRefreshingHistory,
        primaryMethod,
        setPrimaryMethod,
        secondaryMethod,
        setSecondaryMethod,
        primaryAmount,
        setPrimaryAmount,
        secondaryAmount,
        setSecondaryAmount,
        formName,
        setFormName,
        formLastName,
        setFormLastName,
        formRun,
        setFormRun,
        formPhone,
        setFormPhone,
        fetchClients,
        filteredClients,
        totals,
        handleOpenEdit,
        handleOpenNew,
        handleSaveClient,
        handleOpenLoad,
        fetchHistory,
        handleOpenHistory,
        formatCurrency,
        unformatCurrency,
        handleLoadBalance,
        confirmDelete
    };
}
