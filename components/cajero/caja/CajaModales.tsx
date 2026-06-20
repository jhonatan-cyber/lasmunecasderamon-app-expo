import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CajaAction } from '@/hooks/useCaja';

interface CajaModalesProps {
    modalVisible: boolean;
    modalType: 'abrir' | 'cerrar' | 'retiro';
    modalConfig: {
        title: string;
        subtitle: string;
        icon: keyof typeof Ionicons.glyphMap;
        color: string;
        btnText: string;
    };
    isDark: boolean;
    textPrimary: string;
    textSecondary: string;
    stats: any;
    monto: string;
    motivoRetiro: string;
    submitting: boolean;
    dispatch: React.Dispatch<CajaAction>;
    handleMontoChange: (text: string) => void;
    handleSubmit: () => Promise<void>;
}

export function CajaModales({
    modalVisible,
    modalType,
    modalConfig,
    isDark,
    textPrimary,
    textSecondary,
    stats,
    monto,
    motivoRetiro,
    submitting,
    dispatch,
    handleMontoChange,
    handleSubmit
}: CajaModalesProps) {
    return (
        <Modal
            animationType="fade"
            transparent
            visible={modalVisible}
            onRequestClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalCard, { backgroundColor: isDark ? '#111827' : '#FFF' }]}>
                    {}
                    <View style={[styles.modalAccent, { backgroundColor: modalConfig.color }]} />

                    <View style={styles.modalBody}>
                        <View style={[styles.modalIconBox, { backgroundColor: `${modalConfig.color}20` }]}>
                            <Ionicons name={modalConfig.icon} size={32} color={modalConfig.color} />
                        </View>
                        
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>
                            {modalConfig.title}
                        </Text>

                        <Text style={[styles.modalSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            {modalConfig.subtitle}
                        </Text>

                        {}
                        {modalType === 'cerrar' && stats && (
                            <View style={[styles.modalBreakdown, { backgroundColor: isDark ? '#11111150' : '#F3F4F6', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Monto Apertura (Base)</Text>
                                    <Text style={[styles.breakdownItemValue, { color: textPrimary }]}>${(stats.monto_apertura || 0).toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Ventas Efectivo (Turno)</Text>
                                    <Text style={[styles.breakdownItemValue, { color: isDark ? '#10B981' : '#059669' }]}>${((stats.total_efectivo || 0) - (stats.monto_apertura || 0)).toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Ventas con Tarjeta</Text>
                                    <Text style={[styles.breakdownItemValue, { color: isDark ? '#3B82F6' : '#2563EB' }]}>${(stats.total_tarjeta || 0).toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Transferencias</Text>
                                    <Text style={[styles.breakdownItemValue, { color: isDark ? '#8B5CF6' : '#7C3AED' }]}>${(stats.total_transferencia || 0).toLocaleString()}</Text>
                                </View>
                                {stats.total_devoluciones > 0 && (
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Devoluciones</Text>
                                        <Text style={[styles.breakdownItemValue, { color: '#EF4444' }]}>-${(stats.total_devoluciones || 0).toLocaleString()}</Text>
                                    </View>
                                )}
                                <View style={[styles.breakdownItem, { borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB', marginTop: 8, paddingTop: 8 }]}>
                                    <Text style={[styles.breakdownItemLabel, { color: textPrimary, fontWeight: '800' }]}>BALANCE TOTAL</Text>
                                    <Text style={[styles.breakdownItemValue, { color: '#E11D48', fontWeight: '900', fontSize: 20 }]}>${(stats.balance_total || 0).toLocaleString()}</Text>
                                </View>
                            </View>
                        )}

                        {}
                        {modalType === 'cerrar' ? (
                            <View style={[styles.inputBox, { borderColor: isDark ? '#374151' : '#E2E8F0', backgroundColor: isDark ? '#0D1117' : '#F8FAFC', justifyContent: 'center' }]}>
                                <Text style={[styles.currencySign, { color: isDark ? '#F9FAFB' : '#111827' }]}>$</Text>
                                <Text style={[styles.input, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                                    {(stats?.balance_total || 0).toLocaleString()}
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.inputBox, { borderColor: isDark ? '#374151' : '#E2E8F0', backgroundColor: isDark ? '#0D1117' : '#F8FAFC' }]}>
                                <Text style={[styles.currencySign, { color: isDark ? '#F9FAFB' : '#111827' }]}>$</Text>
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#F9FAFB' : '#111827' }]}
                                    value={monto}
                                    onChangeText={handleMontoChange}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={isDark ? '#4B5563' : '#CBD5E1'}
                                    autoFocus
                                />
                            </View>
                        )}

                        {}
                        {modalType === 'retiro' && (
                            <View style={[styles.inputBox, { borderColor: isDark ? '#374151' : '#E2E8F0', backgroundColor: isDark ? '#0D1117' : '#F8FAFC', marginBottom: 0 }]}>
                                <Ionicons name="document-text-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[styles.input, { color: isDark ? '#F9FAFB' : '#111827', fontSize: 15 }]}
                                    value={motivoRetiro}
                                    onChangeText={val => dispatch({ type: 'SET_MOTIVO', payload: val })}
                                    placeholder="Motivo del retiro"
                                    placeholderTextColor={isDark ? '#4B5563' : '#CBD5E1'}
                                />
                            </View>
                        )}

                        {}
                        {modalType === 'retiro' && stats && (
                            <View style={[styles.infoBox, { backgroundColor: `${modalConfig.color}12`, marginTop: 16 }]}>
                                <Ionicons name="information-circle-outline" size={18} color={modalConfig.color} />
                                <Text style={{ color: modalConfig.color, fontSize: 13, fontWeight: '700', marginLeft: 8 }}>
                                    Efectivo disponible: ${(stats.total_efectivo || 0).toLocaleString()}
                                </Text>
                            </View>
                        )}

                        {}
                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: isDark ? '#111111' : '#F1F5F9' }]}
                                onPress={() => dispatch({ type: 'CLOSE_MODAL' })}
                                disabled={submitting}
                            >
                                <Text style={[styles.modalBtnCancel, { color: isDark ? '#9CA3AF' : '#475569' }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: modalConfig.color, opacity: submitting ? 0.7 : 1 }]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                <Text style={styles.modalBtnConfirm}>{submitting ? 'Procesando...' : modalConfig.btnText}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end'
    },
    modalCard: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden'
    },
    modalAccent: {
        height: 4,
        width: '100%'
    },
    modalBody: {
        padding: 24,
        paddingBottom: 32
    },
    modalIconBox: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 16
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 6
    },
    modalSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24
    },
    modalBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalBtnCancel: {
        fontSize: 14,
        fontWeight: '700'
    },
    modalBtnConfirm: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFF'
    },
    modalBreakdown: {
        borderRadius: 20,
        padding: 16,
        gap: 10,
        marginBottom: 20,
        borderWidth: 1
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    breakdownItemLabel: {
        fontSize: 13,
        fontWeight: '600'
    },
    breakdownItemValue: {
        fontSize: 13,
        fontWeight: '800'
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        marginBottom: 16
    },
    currencySign: {
        fontSize: 20,
        fontWeight: '800',
        marginRight: 8
    },
    input: {
        flex: 1,
        fontSize: 22,
        fontWeight: '900',
        padding: 0
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12
    },
});
