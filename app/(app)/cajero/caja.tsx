import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';

export default function CajaScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore(state => state.user);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cajaAbierta, setCajaAbierta] = useState(false);
    const [cajaInfo, setCajaInfo] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const dataRef = useRef<string>('');

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'abrir' | 'cerrar' | 'retiro'>('abrir');
    const [monto, setMonto] = useState('');
    const [motivoRetiro, setMotivoRetiro] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Toast
    const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
        Toast.show({
            type,
            text1: title,
            text2: message,
            visibilityTime: 4000
        });
    };

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const fetchData = useCallback(async (isManual = false) => {
        try {
            const [statusRes, statsRes] = await Promise.all([
                apiClient('/cashregister/status').catch(() => ({ success: false, data: null })),
                apiClient('/cashregister?resumen=1').catch(() => null)
            ]);

            const newData = { status: statusRes?.data, stats: statsRes?.data };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (statusRes.success && statusRes.data) {
                setCajaAbierta(statusRes.data.hasOpenCaja);
                setCajaInfo(statusRes.data.cajaInfo);
            } else {
                setCajaAbierta(false);
                setCajaInfo(null);
            }

            if (statsRes && statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }

            if (isManual) {
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching caja state:', error);
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar la información',
                    visibilityTime: 3000
                });
            } else {
                showToast('Error', 'No se pudo cargar la información de la caja');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

    const handleOpenModal = (type: 'abrir' | 'cerrar' | 'retiro') => {
        setModalType(type);
        setMonto('');
        setMotivoRetiro('');
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        if (!monto || isNaN(Number(monto))) {
            showToast('Error', 'Por favor ingresa un monto válido');
            return;
        }

        const numericMonto = Number(monto);

        if (numericMonto < 0) {
            showToast('Error', 'El monto no puede ser negativo');
            return;
        }

        setSubmitting(true);

        try {
            if (modalType === 'abrir') {
                const res = await apiClient('/cashregister', {
                    method: 'POST',
                    body: JSON.stringify({
                        monto_apertura: numericMonto,
                        usuario_id_apertura: user?.id || 1
                    })
                });

                if (res.success) {
                    showToast('Turno Iniciado', 'Caja abierta correctamente', 'success');
                    setModalVisible(false);
                    fetchData();
                } else {
                    showToast('Error', res.message || 'Error al abrir caja');
                }
            } else if (modalType === 'retiro') {
                if (!motivoRetiro.trim()) {
                    showToast('Error', 'Por favor ingresa un motivo del retiro');
                    setSubmitting(false);
                    return;
                }
                if (!cajaInfo?.id_caja) {
                    showToast('Error', 'No se encontró la ID de la caja');
                    setSubmitting(false);
                    return;
                }

                const res = await apiClient('/cashregister/retiro', {
                    method: 'POST',
                    body: JSON.stringify({
                        id_caja: cajaInfo.id_caja,
                        monto: numericMonto,
                        motivo: motivoRetiro,
                        usuario_id: user?.id || 1
                    })
                });

                if (res.success) {
                    showToast('Retiro Exitoso', `Retiro de $${numericMonto.toLocaleString()} realizado.`, 'success');
                    setModalVisible(false);
                    fetchData();
                } else {
                    showToast('Error', res.message || 'Error al retirar efectivo');
                }
            } else {
                if (!cajaInfo?.id_caja) {
                    showToast('Error', 'No se encontró la ID de la caja a cerrar');
                    setSubmitting(false);
                    return;
                }

                const res = await apiClient('/cashregister', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        id_caja: cajaInfo.id_caja,
                        monto_cierre: numericMonto,
                        usuario_id_cierre: user?.id || 1
                    })
                });

                if (res.success) {
                    showToast('Turno Cerrado', 'Caja cerrada correctamente', 'success');
                    setModalVisible(false);
                    fetchData();
                } else {
                    showToast('Error', res.message || 'Error al cerrar caja');
                }
            }
        } catch (error: any) {
            showToast('Error', error.message || `Error al ${modalType} caja`);
        } finally {
            setSubmitting(false);
        }
    };

    const StatItem = ({ label, value, color = textPrimary }: { label: string, value: number, color?: string }) => (
        <View style={[styles.statItem, { borderBottomColor: borderColor }]}>
            <Text style={[styles.statLabel, { color: textSecondary }]}>{label}</Text>
            <Text style={[styles.statValue, { color }]}>${(value || 0).toLocaleString()}</Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
                >
                    <View style={[styles.statusCard, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.statusHeader}>
                            <View style={[styles.statusIndicator, { backgroundColor: cajaAbierta ? '#10B98120' : '#EF444420' }]}>
                                <View style={[styles.statusDot, { backgroundColor: cajaAbierta ? '#10B981' : '#EF4444' }]} />
                                <Text style={[styles.statusText, { color: cajaAbierta ? '#10B981' : '#EF4444' }]}>
                                    {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                                </Text>
                            </View>
                            {cajaAbierta ? (
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <Pressable
                                        style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                                        onPress={() => handleOpenModal('retiro')}
                                    >
                                        <Text style={styles.actionBtnText}>Retiro</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                                        onPress={() => handleOpenModal('cerrar')}
                                    >
                                        <Text style={styles.actionBtnText}>Cerrar</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <Pressable
                                    style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                                    onPress={() => handleOpenModal('abrir')}
                                >
                                    <Text style={styles.actionBtnText}>Abrir Caja</Text>
                                </Pressable>
                            )}
                        </View>

                        {cajaAbierta && cajaInfo && (
                            <View style={styles.infoBox}>
                                <Text style={[styles.infoText, { color: textSecondary }]}>
                                    Abierta el: {new Date(cajaInfo.fecha_apertura).toLocaleString()}
                                </Text>
                            </View>
                        )}
                    </View>

                    {cajaAbierta && stats && (
                        <View style={[styles.statsCard, { backgroundColor: cardBg, borderColor }]}>
                            <Text style={[styles.statsTitle, { color: textPrimary }]}>Resumen del Turno</Text>
                            <StatItem label="Balance Total Calculado" value={stats.balance_total} color="#8B5CF6" />
                            <StatItem label="Efectivo Esperado" value={stats.total_efectivo} color="#10B981" />
                            <StatItem label="Tarjetas" value={stats.total_tarjeta} color="#3B82F6" />
                            <StatItem label="Transferencias" value={stats.total_transferencia} color="#F59E0B" />
                            <StatItem label="Servicios" value={stats.total_servicios} />
                            <StatItem label="Devoluciones" value={stats.total_devoluciones} color="#EF4444" />
                            <StatItem label="Propinas" value={stats.total_propina} />
                            <StatItem label="Anticipos" value={stats.total_anticipo} />
                            <StatItem label="IVA" value={stats.total_iva} />
                            <StatItem label="Comisiones" value={stats.total_comisiones} />
                        </View>
                    )}
                </ScrollView>
            )}

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.modalHeaderIcon}>
                            <Ionicons
                                name={modalType === 'abrir' ? 'wallet-outline' : modalType === 'retiro' ? 'cash-outline' : 'lock-closed-outline'}
                                size={40}
                                color={modalType === 'abrir' ? '#10B981' : modalType === 'retiro' ? '#F59E0B' : '#EF4444'}
                            />
                        </View>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>
                            {modalType === 'abrir' ? 'Apertura de Turno' : modalType === 'retiro' ? 'Retirar Efectivo' : 'Cierre de Turno'}
                        </Text>
                        <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                            {modalType === 'abrir'
                                ? 'Ingresa el monto de base con el que iniciarás la caja'
                                : modalType === 'retiro'
                                    ? 'Ingresa el monto a retirar de la caja de efectivo'
                                    : 'Ingresa el monto total en efectivo al cierre de la caja'}
                        </Text>

                        <View style={[styles.inputContainer, { borderColor, backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
                            <Text style={[styles.currencySymbol, { color: textPrimary }]}>$</Text>
                            <TextInput
                                style={[styles.input, { color: textPrimary }]}
                                value={monto}
                                onChangeText={setMonto}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={textSecondary}
                                autoFocus
                            />
                        </View>

                        {modalType === 'retiro' && (
                            <>
                                <View style={[styles.inputContainer, { borderColor, backgroundColor: isDark ? '#111827' : '#F9FAFB', marginTop: 12 }]}>
                                    <Ionicons name="document-text-outline" size={20} color={textSecondary} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={[styles.input, { color: textPrimary, paddingLeft: 0, width: '100%' }]}
                                        value={motivoRetiro}
                                        onChangeText={setMotivoRetiro}
                                        placeholder="Motivo del retiro"
                                        placeholderTextColor={textSecondary}
                                    />
                                </View>
                                {stats && (
                                    <View style={[styles.expectedBox, { backgroundColor: '#F59E0B20', marginTop: 16 }]}>
                                        <Ionicons name="wallet-outline" size={24} color="#F59E0B" />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.expectedLabel, { color: '#F59E0B' }]}>Efectivo disponible en caja</Text>
                                            <Text style={[styles.expectedValue, { color: '#F59E0B' }]}>
                                                ${(stats.total_efectivo || 0).toLocaleString()}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}

                        {modalType === 'cerrar' && stats && (
                            <View style={[styles.expectedBox, { backgroundColor: '#10B98120' }]}>
                                <Ionicons name="cash-outline" size={24} color="#10B981" />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.expectedLabel, { color: '#10B981' }]}>Efectivo esperado</Text>
                                    <Text style={[styles.expectedValue, { color: '#10B981' }]}>
                                        ${(stats.total_efectivo || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setModalVisible(false)}
                                disabled={submitting}
                            >
                                <Text style={[styles.cancelBtnText, { color: textPrimary }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.modalBtn,
                                    { backgroundColor: modalType === 'abrir' ? '#10B981' : modalType === 'retiro' ? '#F59E0B' : '#EF4444' },
                                    submitting && { opacity: 0.7 }
                                ]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <View style={styles.btnContentRow}>
                                        <Text style={styles.confirmBtnText}>
                                            {modalType === 'abrir' ? 'Abrir Caja' : modalType === 'retiro' ? 'Realizar Retiro' : 'Cerrar Caja'}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: 16 },
    statusCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 8,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 14, fontWeight: '700' },
    actionBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    infoBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(156, 163, 175, 0.2)' },
    infoText: { fontSize: 13, fontWeight: '500' },
    statsCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 32,
    },
    statsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
    statItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(156, 163, 175, 0.2)',
    },
    statLabel: { fontSize: 14, fontWeight: '500' },
    statValue: { fontSize: 16, fontWeight: '700' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
    },
    modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
    modalSubtitle: { fontSize: 14, fontWeight: '500', marginBottom: 24, textAlign: 'center' },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
        height: 56,
    },
    currencySymbol: { fontSize: 24, fontWeight: '700', marginRight: 8 },
    input: { flex: 1, fontSize: 24, fontWeight: '700', height: '100%' },
    expectedBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    expectedLabel: { fontSize: 13, fontWeight: '600', opacity: 0.8 },
    expectedValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
    modalActions: { flexDirection: 'row', gap: 12 },
    btnContentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtn: { backgroundColor: 'rgba(156, 163, 175, 0.2)' },
    cancelBtnText: { fontSize: 16, fontWeight: '700' },
    confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    modalHeaderIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 16,
    },
    toastContent: {
        width: '85%',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
    },
    toastIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    toastTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
    toastMessage: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    toastBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toastBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
