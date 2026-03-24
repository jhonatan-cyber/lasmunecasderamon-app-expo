import { Ionicons } from "@expo/vector-icons";
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { apiClient } from '@/api/client';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumFAB } from '@/components/ui/PremiumFAB';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAccentColor } from '@/hooks/useAccentColor';
import { PaymentMethod, PaymentMethodSelect } from '@/components/cajero/forms/PaymentMethodSelect';

const FlashList = ShopifyFlashList as any;

interface Client {
    id: string | number;
    run?: string;
    name: string;
    lastName: string;
    phone?: string;
    saldo: number;
    deuda: number;
    status?: number;
}

export default function ClientesScreen() {
    const { accentColor, isDark } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const textPrimary = isDark ? "#FFFFFF" : "#111827";
    const textSecondary = isDark ? "#9CA3AF" : "#6B7280";

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState("");

    // Modals state
    const [clientModalVisible, setClientModalVisible] = useState(false);
    const [loadModalVisible, setLoadModalVisible] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [loadingAmount, setLoadingAmount] = useState("");
    const [loadMetodoPago, setLoadMetodoPago] = useState<PaymentMethod>('efectivo');
    const [submitting, setSubmitting] = useState(false);
    
    // History states
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);

    // Mixed payment loading states
    const [primaryMethod, setPrimaryMethod] = useState<PaymentMethod>('efectivo');
    const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethod>('transferencia');
    const [primaryAmount, setPrimaryAmount] = useState("");
    const [secondaryAmount, setSecondaryAmount] = useState("");

    // Form state
    const [formName, setFormName] = useState("");
    const [formLastName, setFormLastName] = useState("");
    const [formRun, setFormRun] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [refreshingHistory, setRefreshingHistory] = useState(false);

    const fetchClients = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await apiClient('/clients');
            if (Array.isArray(res)) {
                setClients(res);
            } else if (res?.success) {
                setClients(res.data || []);
            }
        } catch (error: any) {
            console.error("Error fetching clients:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudieron descargar los clientes' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchClients(true);
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
        // Ordenar alfabéticamente por nombre
        return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [clients, search]);

    const totals = useMemo(() => {
        return filteredClients.reduce((acc, client) => {
            acc.totalSaldo += Number(client.saldo || 0);
            acc.totalDeuda += Number(client.deuda || 0);
            return acc;
        }, { totalSaldo: 0, totalDeuda: 0 });
    }, [filteredClients]);

    const handleOpenAdd = () => {
        setEditingClient(null);
        setFormName("");
        setFormLastName("");
        setFormRun("");
        setFormPhone("");
        setClientModalVisible(true);
    };

    const handleOpenEdit = (client: Client) => {
        setEditingClient(client);
        setFormName(client.name || "");
        setFormLastName(client.lastName || "");
        setFormRun(client.run || "");
        setFormPhone(client.phone || "");
        setClientModalVisible(true);
    };

    const handleSaveClient = async () => {
        if (!formName || !formLastName) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Nombre y apellido son obligatorios' });
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

            const method = editingClient ? 'PUT' : 'POST';
            const res = await apiClient('/clients', {
                method,
                body: JSON.stringify(payload)
            });

            if (res.success || res.id || (method === 'PUT' && res.message)) {
                Toast.show({ type: 'success', text1: 'Éxito', text2: editingClient ? 'Cliente actualizado' : 'Cliente creado' });
                setClientModalVisible(false);
                fetchClients(true);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: res.message || 'Error al guardar' });
            }
        } catch (error: any) {
            console.error("Error saving client:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Error de conexión' });
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
            const res = await apiClient(`/clients/history?cliente_id=${clientId}&_t=${Date.now()}`);
            if (res.success && Array.isArray(res.data)) {
                setHistoryData(res.data);
            } else if (Array.isArray(res)) {
                setHistoryData(res);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
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
        return Number(cleanValue).toLocaleString('de-DE'); // 'de-DE' uses dots for thousands
    };

    const unformatCurrency = (value: string) => {
        return value.replace(/\./g, "");
    };

    const handleLoadBalance = async () => {
        const rawAmount = unformatCurrency(loadingAmount);
        if (!editingClient || !rawAmount || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Ingrese un monto válido' });
            return;
        }

        if (loadMetodoPago === 'mixto') {
            const pAmount = Number(unformatCurrency(primaryAmount)) || 0;
            const sAmount = Number(unformatCurrency(secondaryAmount)) || 0;
            if (pAmount + sAmount !== Number(rawAmount)) {
                Toast.show({ type: 'error', text1: 'Error', text2: `Los montos no coinciden con el total ($${Number(rawAmount).toLocaleString()})` });
                return;
            }
        }

        setSubmitting(true);
        try {
            const body: any = {
                cliente_id: editingClient.id,
                monto: Number(rawAmount),
                tipo: 'CARGA',
                metodo_pago: loadMetodoPago,
                motivo: 'Carga de saldo prepago (Módulo Clientes)'
            };

            if (loadMetodoPago === 'mixto') {
                body.pago_mixto = {
                    metodo_primario: primaryMethod,
                    monto_primario: Number(unformatCurrency(primaryAmount)),
                    metodo_secundario: secondaryMethod,
                    monto_secundario: Number(unformatCurrency(secondaryAmount))
                };
            }

            const res = await apiClient('/clients/prepago', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (res.success) {
                Toast.show({ type: 'success', text1: 'Éxito', text2: 'Saldo cargado correctamente' });
                setLoadModalVisible(false);
                await fetchClients(true);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: res.message || 'Error al cargar saldo' });
            }
        } catch (error: any) {
            console.error("Error loading balance:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Error de conexión' });
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
                            const res = await apiClient(`/clients?id=${client.id}`, { method: 'DELETE' });
                            if (res.success || res.message) {
                                Toast.show({ type: 'success', text1: 'Eliminado', text2: 'Cliente eliminado correctamente' });
                                fetchClients(true);
                            }
                        } catch (error: any) {
                            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo eliminar' });
                        }
                    }
                }
            ]
        );
    };

    const renderClientCard = ({ item }: { item: Client }) => {
        const bg = isDark ? "#1A1A1A" : "#FFFFFF";
        const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

        return (
            <View style={[styles.clientCard, { backgroundColor: bg, borderColor }]}>
                <View style={styles.cardHeader}>
                    {/* Main Content Area */}
                    <View style={styles.clientInfoMain}>
                        <View style={styles.textContainer}>
                            <Text style={[styles.clientName, { color: textPrimary }]} numberOfLines={1}>
                                {item.name} {item.lastName}
                            </Text>
                            
                            <View style={styles.metadataArea}>
                                <View style={styles.infoRowSmall}>
                                    <Ionicons name="card-outline" size={13} color={textSecondary} />
                                    <Text style={[styles.clientSub, { color: textSecondary }]} numberOfLines={1}>
                                        {item.run || "Sin RUN"}
                                    </Text>
                                </View>
                                <View style={styles.infoRowSmall}>
                                    <Ionicons name="call-outline" size={13} color={textSecondary} />
                                    <Text style={[styles.clientSub, { color: textSecondary }]} numberOfLines={1}>
                                        {item.phone || "Sin Teléfono"}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.statusArea}>
                            <View style={[styles.balancePill, { backgroundColor: item.saldo > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(155,155,155,0.05)', borderColor: item.saldo > 0 ? '#10B98130' : 'transparent' }]}>
                                <Ionicons name="wallet-outline" size={14} color={item.saldo > 0 ? '#10B981' : textSecondary} />
                                <View>
                                    <Text style={styles.pillLabel}>SALDO</Text>
                                    <Text style={[styles.balanceValue, { color: item.saldo > 0 ? '#10B981' : textPrimary }]}>
                                        ${(Number(item.saldo) || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.balancePill, { 
                                backgroundColor: Number(item.deuda) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(155,155,155,0.05)', 
                                borderColor: Number(item.deuda) > 0 ? 'rgba(239, 68, 68, 0.2)' : 'transparent' 
                            }]}>
                                <Ionicons 
                                    name="alert-circle-outline" 
                                    size={14} 
                                    color={Number(item.deuda) > 0 ? '#EF4444' : textSecondary} 
                                />
                                <View>
                                    <Text style={[styles.pillLabel, { color: Number(item.deuda) > 0 ? '#EF4444' : textSecondary }]}>DEUDA</Text>
                                    <Text style={[styles.balanceValue, { color: Number(item.deuda) > 0 ? '#EF4444' : textPrimary }]}>
                                        ${(Number(item.deuda) || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.cardActionsSidebar}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}
                            onPress={() => handleOpenHistory(item)}
                        >
                            <Ionicons name="eye-outline" size={22} color="#A855F7" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => handleOpenLoad(item)}
                        >
                            <Ionicons name="wallet" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                            onPress={() => handleOpenEdit(item)}
                        >
                            <Ionicons name="create-outline" size={22} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                            onPress={() => confirmDelete(item)}
                        >
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000000" : "#F3F4F6" }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? "light" : "dark"} />

            <PremiumHeader
                title="Clientes"
                subtitle="Gestión de prepago y datos"
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                        <TouchableOpacity onPress={() => fetchClients(true)} style={styles.backBtnRight}>
                            <Ionicons name="refresh" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
                            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                            <Text style={styles.backTextHeader}>Atrás</Text>
                        </Pressable>
                    </View>
                }
            />

            <View style={styles.content}>
                <View style={[styles.searchOuter, { backgroundColor: isDark ? "#111111" : "#FFFFFF" }]}>
                    <View style={[styles.searchContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
                        <Ionicons name="search" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <TextInput
                            style={[styles.searchInput, { color: isDark ? "#FFFFFF" : "#111827" }]}
                            placeholder="Buscar cliente por nombre, RUN o teléfono..."
                            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <Pressable onPress={() => setSearch("")}>
                                <Ionicons name="close-circle" size={18} color={isDark ? "#4B5563" : "#9CA3AF"} />
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.summaryContainer}>
                        <View style={[styles.summaryPill, { backgroundColor: '#10B98110' }]}>
                             <Ionicons name="wallet-outline" size={14} color="#10B981" />
                             <Text style={styles.summaryLabel}>TOTAL SALDO</Text>
                             <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                                ${Number(totals.totalSaldo || 0).toLocaleString()}
                             </Text>
                        </View>
                        <View style={[styles.summaryPill, { backgroundColor: '#EF444410' }]}>
                             <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                             <Text style={styles.summaryLabel}>TOTAL DEUDA</Text>
                             <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                                ${Number(totals.totalDeuda || 0).toLocaleString()}
                             </Text>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <View style={{ padding: 16 }}>
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} width="100%" height={120} borderRadius={24} style={{ marginBottom: 16 }} />
                        ))}
                    </View>
                ) : (
                    <FlashList
                        data={filteredClients}
                        renderItem={renderClientCard}
                        keyExtractor={(item: Client) => String(item.id)}
                        estimatedItemSize={180}
                        numColumns={2}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchClients(true)} tintColor={accentColor} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={64} color={isDark ? "#1F2937" : "#E5E7EB"} />
                                <Text style={[styles.emptyText, { color: isDark ? "#4B5563" : "#9CA3AF" }]}>
                                    {search ? "No se encontraron clientes" : "No hay clientes registrados"}
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>

            <PremiumFAB
                label="NUEVO CLIENTE"
                icon="person-add"
                onPress={() => setClientModalVisible(true)}
                visible={!clientModalVisible && !loadModalVisible && !historyModalVisible}
            />


            {/* Modal de Registro/Edición */}
            <Modal visible={clientModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, {
                        backgroundColor: isDark ? "#111111" : "#FFFFFF",
                        paddingBottom: Math.max(insets.bottom, 20) + 10
                    }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDark ? "#FFFFFF" : "#111827" }]}>
                                {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                            </Text>
                            <Pressable onPress={() => setClientModalVisible(false)}>
                                <Ionicons name="close" size={26} color={isDark ? "#FFFFFF" : "#111827"} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>NOMBRE *</Text>
                                <TextInput
                                    style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                    value={formName}
                                    onChangeText={setFormName}
                                    placeholder="Ej: Juan"
                                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>APELLIDO *</Text>
                                <TextInput
                                    style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                    value={formLastName}
                                    onChangeText={setFormLastName}
                                    placeholder="Ej: Pérez"
                                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>RUN</Text>
                                <TextInput
                                    style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                    value={formRun}
                                    onChangeText={setFormRun}
                                    placeholder="Ej: 12.345.678-9"
                                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>TELÉFONO</Text>
                                <TextInput
                                    style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                    value={formPhone}
                                    onChangeText={setFormPhone}
                                    placeholder="Ej: +569 1234 5678"
                                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                    keyboardType="phone-pad"
                                />
                            </View>

                             {/* Fin de campos del formulario */}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: accentColor }, submitting && { opacity: 0.7 }]}
                            onPress={handleSaveClient}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#FFF" /> : (
                                <Text style={styles.saveBtnText}>{editingClient ? "ACTUALIZAR" : "CREAR CLIENTE"}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Modal de Carga de Saldo */}
            <Modal visible={loadModalVisible} animationType="fade" transparent>
                <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                    <View style={[styles.modalContent, {
                        backgroundColor: isDark ? "#111111" : "#FFFFFF",
                        height: 'auto',
                        paddingBottom: Math.max(insets.bottom, 20) + 20
                    }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: isDark ? "#FFFFFF" : "#111827" }]}>Cargar Saldo</Text>
                                <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontWeight: '700' }}>
                                    {editingClient?.name} {editingClient?.lastName}
                                </Text>
                            </View>
                            <Pressable onPress={() => setLoadModalVisible(false)}>
                                <Ionicons name="close" size={26} color={isDark ? "#FFFFFF" : "#111827"} />
                            </Pressable>
                        </View>

                        <View style={{ gap: 20 }}>
                            <View>
                                <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>MONTO A CARGAR</Text>
                                <TextInput
                                    style={[styles.input, {
                                        color: isDark ? "#FFFFFF" : "#111827",
                                        borderColor: isDark ? "#374151" : "#E5E7EB",
                                        fontSize: 24,
                                        fontWeight: '800',
                                        height: 60,
                                        textAlign: 'center'
                                    }]}
                                    value={loadingAmount}
                                    onChangeText={(text) => setLoadingAmount(formatCurrency(text))}
                                    placeholder="0"
                                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                    keyboardType="numeric"
                                    autoFocus
                                />
                            </View>

                             <PaymentMethodSelect
                                selectedMethod={loadMetodoPago}
                                onSelect={(val) => setLoadMetodoPago(val as PaymentMethod)}
                                showPrepago={false}
                                showMixto={true}
                            />

                            {loadMetodoPago === 'mixto' && (
                                <View style={styles.mixedInputs}>
                                    <View style={styles.mixedHeader}>
                                        <Ionicons name="shuffle-outline" size={18} color={accentColor} />
                                        <Text style={[styles.mixedTitle, { color: accentColor }]}>Distribución de Pago</Text>
                                    </View>
                                    
                                    <View style={styles.mixedRow}>
                                        <View style={{ flex: 1.5 }}>
                                            <PaymentMethodSelect
                                                selectedMethod={primaryMethod}
                                                onSelect={(val) => setPrimaryMethod(val)}
                                                showPrepago={false}
                                                showMixto={false}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <TextInput
                                                style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                                value={primaryAmount}
                                                onChangeText={(text) => {
                                                    const formatted = formatCurrency(text);
                                                    setPrimaryAmount(formatted);
                                                    // Auto-calc secondary
                                                    const total = Number(unformatCurrency(loadingAmount)) || 0;
                                                    const pVal = Number(unformatCurrency(formatted)) || 0;
                                                    if (total > pVal) setSecondaryAmount(formatCurrency((total - pVal).toString()));
                                                    else setSecondaryAmount("0");
                                                }}
                                                placeholder="$ 0"
                                                placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.mixedRow}>
                                        <View style={{ flex: 1.5 }}>
                                            <PaymentMethodSelect
                                                selectedMethod={secondaryMethod}
                                                onSelect={(val) => setSecondaryMethod(val)}
                                                showPrepago={false}
                                                showMixto={false}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <TextInput
                                                style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                                value={secondaryAmount}
                                                onChangeText={(text) => {
                                                    const formatted = formatCurrency(text);
                                                    setSecondaryAmount(formatted);
                                                    // Auto-calc primary
                                                    const total = Number(unformatCurrency(loadingAmount)) || 0;
                                                    const sVal = Number(unformatCurrency(formatted)) || 0;
                                                    if (total > sVal) setPrimaryAmount(formatCurrency((total - sVal).toString()));
                                                    else setPrimaryAmount("0");
                                                }}
                                                placeholder="$ 0"
                                                placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: accentColor, height: 60, borderRadius: 20 }, submitting && { opacity: 0.7 }]}
                                onPress={handleLoadBalance}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#FFF" /> : (
                                    <Text style={styles.saveBtnText}>CONFIRMAR CARGA</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Modal de Historial */}
            <Modal visible={historyModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, {
                        backgroundColor: isDark ? "#111111" : "#FFFFFF",
                        height: '83%',
                        paddingBottom: Math.max(insets.bottom, 20)
                    }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: isDark ? "#FFFFFF" : "#111827" }]}>Historial de Cuenta</Text>
                                <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontWeight: '700' }}>
                                    {editingClient?.name} {editingClient?.lastName}
                                </Text>
                            </View>
                            <Pressable onPress={() => setHistoryModalVisible(false)}>
                                <Ionicons name="close" size={26} color={isDark ? "#FFFFFF" : "#111827"} />
                            </Pressable>
                        </View>

                        {historyLoading ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={accentColor} />
                                <Text style={{ marginTop: 10, color: textSecondary }}>Cargando movimientos...</Text>
                            </View>
                        ) : (
                            <ScrollView 
                                showsVerticalScrollIndicator={false} 
                                contentContainerStyle={{ paddingBottom: 20 }}
                                refreshControl={
                                    <RefreshControl 
                                        refreshing={refreshingHistory} 
                                        onRefresh={() => {
                                            if (editingClient) {
                                                setRefreshingHistory(true);
                                                fetchHistory(editingClient.id);
                                            }
                                        }} 
                                        tintColor={accentColor} 
                                    />
                                }
                            >
                                {/* Resumen de totales */}
                                {historyData.length > 0 && (() => {
                                    const totalServicios = historyData.filter((i: any) => i.category === 'SERVICIO').reduce((a: number, i: any) => a + Number(i.monto || 0), 0);
                                    const totalConsumo = historyData.filter((i: any) => i.category === 'CONSUMO').reduce((a: number, i: any) => a + Number(i.monto || 0), 0);
                                    const totalCargas = historyData.filter((i: any) => i.category === 'CARGA').reduce((a: number, i: any) => a + Number(i.monto || 0), 0);
                                    return (
                                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                            <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)', borderWidth: 1, borderColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }}>
                                                <Ionicons name="bed-outline" size={16} color="#3B82F6" />
                                                <Text style={{ fontSize: 7, fontWeight: '900', color: '#3B82F6', letterSpacing: 0.5, marginTop: 4, textTransform: 'uppercase' }}>Servicios</Text>
                                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#3B82F6', marginTop: 2 }}>${totalServicios.toLocaleString('es-CL')}</Text>
                                            </View>
                                            <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }}>
                                                <Ionicons name="cart-outline" size={16} color="#F59E0B" />
                                                <Text style={{ fontSize: 7, fontWeight: '900', color: '#F59E0B', letterSpacing: 0.5, marginTop: 4, textTransform: 'uppercase' }}>Consumo</Text>
                                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#F59E0B', marginTop: 2 }}>${totalConsumo.toLocaleString('es-CL')}</Text>
                                            </View>
                                            <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)', borderWidth: 1, borderColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }}>
                                                <Ionicons name="arrow-up-circle-outline" size={16} color="#10B981" />
                                                <Text style={{ fontSize: 7, fontWeight: '900', color: '#10B981', letterSpacing: 0.5, marginTop: 4, textTransform: 'uppercase' }}>Cargado</Text>
                                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#10B981', marginTop: 2 }}>${totalCargas.toLocaleString('es-CL')}</Text>
                                            </View>
                                        </View>
                                    );
                                })()}

                                {historyData.length === 0 ? (
                                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(155,155,155,0.05)' : 'rgba(155,155,155,0.08)', justifyContent: 'center', alignItems: 'center' }}>
                                            <Ionicons name="receipt-outline" size={36} color={isDark ? "#374151" : "#D1D5DB"} />
                                        </View>
                                        <Text style={{ color: textSecondary, marginTop: 14, fontSize: 15, fontWeight: '700' }}>Sin movimientos</Text>
                                        <Text style={{ color: textSecondary, marginTop: 4, fontSize: 12, opacity: 0.7 }}>Aún no hay actividad registrada</Text>
                                    </View>
                                ) : (
                                    historyData.map((item: any, index: number) => {
                                        const isCarga = item.category === 'CARGA';
                                        const isServicio = item.category === 'SERVICIO';
                                        const isConsumo = item.category === 'CONSUMO';
                                        const iconColor = isCarga ? '#10B981' : isServicio ? '#3B82F6' : '#F59E0B';
                                        const iconBg = isCarga ? 'rgba(16,185,129,0.12)' : isServicio ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)';
                                        const iconName = isCarga ? 'arrow-up-circle' : isServicio ? 'bed' : 'cart';
                                        const categoryLabel = isCarga ? 'Carga de Saldo' : isServicio ? 'Servicio' : 'Consumo';
                                        const cardBg = isDark
                                            ? 'rgba(255,255,255,0.03)'
                                            : 'rgba(0,0,0,0.015)';
                                        const cardBorder = isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.04)';
                                        
                                        return (
                                            <View key={`${item.id}-${index}`} style={{
                                                backgroundColor: cardBg,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: cardBorder,
                                                padding: 16,
                                                marginBottom: 12,
                                                overflow: 'hidden',
                                            }}>
                                                {/* Header: Icono + Categoría + Monto */}
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                    <View style={{
                                                        width: 44, height: 44, borderRadius: 14,
                                                        backgroundColor: iconBg,
                                                        justifyContent: 'center', alignItems: 'center',
                                                    }}>
                                                        <Ionicons name={iconName as any} size={22} color={iconColor} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#FFFFFF' : '#111827', letterSpacing: -0.2 }}>
                                                                    {categoryLabel}
                                                                </Text>
                                                                <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary, marginTop: 1 }}>
                                                                    {new Date(item.fecha_crea).toLocaleString('es-CL', { 
                                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                                        hour: '2-digit', minute: '2-digit'
                                                                    })}
                                                                </Text>
                                                            </View>
                                                            <View style={{ 
                                                                backgroundColor: isCarga ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
                                                            }}>
                                                                <Text style={{ fontSize: 15, fontWeight: '900', color: isCarga ? '#10B981' : '#EF4444' }}>
                                                                    {isCarga ? '+' : '-'}${(Number(item.monto || 0)).toLocaleString('es-CL')}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* Detalle de Servicio */}
                                                {isServicio && item.detalle && (
                                                    <View style={{ 
                                                        marginTop: 12, padding: 12, borderRadius: 14,
                                                        backgroundColor: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)',
                                                        borderWidth: 1, borderColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
                                                    }}>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                                                            {item.detalle.habitacion && (
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                    <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                                                        <Ionicons name="bed-outline" size={14} color="#3B82F6" />
                                                                    </View>
                                                                    <View>
                                                                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: 0.5 }}>Habitación</Text>
                                                                        <Text style={{ fontSize: 13, fontWeight: '900', color: textPrimary }}>{item.detalle.habitacion}</Text>
                                                                    </View>
                                                                </View>
                                                            )}
                                                            {item.detalle.tiempo && (
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                    <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                                                        <Ionicons name="timer-outline" size={14} color="#3B82F6" />
                                                                    </View>
                                                                    <View>
                                                                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: 0.5 }}>Duración</Text>
                                                                        <Text style={{ fontSize: 13, fontWeight: '900', color: textPrimary }}>{item.detalle.tiempo} min</Text>
                                                                    </View>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {Array.isArray(item.detalle.anfitrionas) && item.detalle.anfitrionas.length > 0 && (
                                                            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                                                    <Ionicons name="people-outline" size={14} color="#3B82F6" />
                                                                </View>
                                                                {item.detalle.anfitrionas.map((name: string, i: number) => (
                                                                    <View key={i} style={{ backgroundColor: 'rgba(59,130,246,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#3B82F6' }}>{name}</Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        )}
                                                    </View>
                                                )}

                                                {/* Detalle de Consumo / Venta */}
                                                {isConsumo && item.detalle && (
                                                    <View style={{ marginTop: 12 }}>
                                                        {Array.isArray(item.detalle.productos) && item.detalle.productos.length > 0 && (
                                                            <View style={{ 
                                                                padding: 12, borderRadius: 14,
                                                                backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
                                                                borderWidth: 1, borderColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
                                                            }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                                                                    <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                                                        <Ionicons name="fast-food-outline" size={12} color="#F59E0B" />
                                                                    </View>
                                                                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Productos</Text>
                                                                </View>
                                                                {item.detalle.productos.map((p: any, idx: number) => (
                                                                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, gap: 6 }}>
                                                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' }} />
                                                                        <Text style={{ fontSize: 13, color: textPrimary, fontWeight: '700' }}>
                                                                            {p.cantidad || 1}x {p.nombre || 'Producto'}
                                                                        </Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        )}
                                                        {Array.isArray(item.detalle.anfitrionas) && item.detalle.anfitrionas.length > 0 && (
                                                            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                                                    <Ionicons name="people-outline" size={14} color="#F59E0B" />
                                                                </View>
                                                                {item.detalle.anfitrionas.map((name: string, i: number) => (
                                                                    <View key={i} style={{ backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#F59E0B' }}>{name}</Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        )}
                                                    </View>
                                                )}

                                                {/* Footer: Método de pago */}
                                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                                    <View style={{
                                                        flexDirection: 'row', alignItems: 'center', gap: 5,
                                                        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                                    }}>
                                                        <Ionicons 
                                                            name={(
                                                                item.metodo_pago === 'efectivo' ? 'cash-outline' :
                                                                item.metodo_pago === 'tarjeta' ? 'card-outline' :
                                                                item.metodo_pago === 'transferencia' ? 'swap-horizontal-outline' :
                                                                item.metodo_pago === 'prepago' ? 'wallet-outline' :
                                                                item.metodo_pago === 'mixto' ? 'layers-outline' : 'wallet-outline'
                                                            ) as any} 
                                                            size={12} 
                                                            color={textSecondary} 
                                                        />
                                                        <Text style={{ fontSize: 10, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                                                            {item.metodo_pago || 'pago'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: accentColor, marginTop: 10 }]}
                            onPress={() => setHistoryModalVisible(false)}
                        >
                            <Text style={[styles.saveBtnText, { color: '#FFFFFF' }]}>CERRAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    searchOuter: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(155,155,155,0.05)' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48, borderRadius: 14 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, fontWeight: '600' },
    listContent: { padding: 12, paddingBottom: 100 },
    clientCard: { 
        flex: 1, 
        padding: 10,
        paddingRight: 6,
        borderRadius: 20, 
        borderWidth: 1, 
        marginBottom: 12, 
        marginHorizontal: 6,
        elevation: 2, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 10 
    },
    cardHeader: { flexDirection: 'row', alignItems: 'stretch', flex: 1 },
    clientInfoMain: { flex: 1, paddingRight: 4 },
    textContainer: { flex: 1, justifyContent: 'flex-start' },
    metadataArea: { marginTop: 8, gap: 4 },
    infoRowSmall: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    clientName: { fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
    clientSub: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', opacity: 0.8 },
    statusArea: { marginTop: 12, gap: 8 },
    balancePill: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        alignSelf: 'stretch', 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderRadius: 14, 
        gap: 10,
        borderWidth: 1,
    },
    pillLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginBottom: -2, opacity: 0.7 },
    balanceValue: { fontSize: 15, fontWeight: '900' },
    cardActionsSidebar: { 
        paddingLeft: 12, 
        borderLeftWidth: 1, 
        borderLeftColor: 'rgba(155,155,155,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14
    },
    actionBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 15, fontWeight: '700', marginTop: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    formGroup: { marginBottom: 15 },
    formLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
    input: { height: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, fontSize: 14, fontWeight: '700', backgroundColor: 'rgba(155,155,155,0.03)' },
    saveBtn: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
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
    mixedInputs: { gap: 12, backgroundColor: 'rgba(155,155,155,0.05)', padding: 16, borderRadius: 20 },
    mixedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    mixedTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    mixedRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    historyItem: { 
        flexDirection: 'row', 
        padding: 15, 
        borderLeftWidth: 4, 
        backgroundColor: 'rgba(155,155,155,0.03)', 
        borderRadius: 12, 
        marginBottom: 10,
        gap: 15,
        alignItems: 'center'
    },
    historyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(155,155,155,0.05)', justifyContent: 'center', alignItems: 'center' },
    historyType: { fontSize: 16, fontWeight: '800' },
    historyAmount: { fontSize: 18, fontWeight: '900' },
    historyDate: { fontSize: 13, fontWeight: '700', marginTop: 2 },
    miniPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    summaryContainer: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        gap: 12, 
        marginTop: 15 
    },
    summaryPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
        gap: 8,
        justifyContent: 'center'
    },
    summaryLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, opacity: 0.7 },
    summaryValue: { fontSize: 14, fontWeight: '900' }
});
