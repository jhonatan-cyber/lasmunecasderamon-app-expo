import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { BorderRadius } from '@/constants/spacing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CajaAction } from '@/hooks/useCaja';
import { useAccentColor } from '@/hooks/useAccentColor';

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
    const { cardBg, surfaceMuted, borderColor, accentColor, accentOnSurface } = useAccentColor();

    return (
        <Modal
            avoidKeyboard={false}
            animationType="fade"
            transparent
            visible={modalVisible}
            onRequestClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
                    {}
                    <View style={[styles.modalAccent, { backgroundColor: modalConfig.color }]} />

                    <View style={styles.modalBody}>
                        <View style={[styles.modalIconBox, { backgroundColor: `${modalConfig.color}20` }]}>
                            <Ionicons name={modalConfig.icon} size={32} color={modalConfig.color} />
                        </View>
                        
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>
                            {modalConfig.title}
                        </Text>

                        <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                            {modalConfig.subtitle}
                        </Text>

                        {}
                        {modalType === 'cerrar' && stats && (
                            <View style={[styles.modalBreakdown, { backgroundColor: surfaceMuted, borderColor }]}>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Monto Apertura (Base)</Text>
                                    <Text style={[styles.breakdownItemValue, { color: textPrimary }]}>${(stats.monto_apertura || 0).toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Ventas Efectivo (Turno)</Text>
                                    <Text style={[styles.breakdownItemValue, { color: accentOnSurface }]}>${((stats.total_efectivo || 0) - (stats.monto_apertura || 0)).toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Ventas con Tarjeta</Text>
                                    <Text style={[styles.breakdownItemValue, { color: accentOnSurface }]}>${(stats.total_tarjeta || 0).toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Transferencias</Text>
                                    <Text style={[styles.breakdownItemValue, { color: accentOnSurface }]}>${(stats.total_transferencia || 0).toLocaleString()}</Text>
                                </View>
                                {stats.total_devoluciones > 0 && (
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Devoluciones</Text>
                                        <Text style={[styles.breakdownItemValue, { color: accentColor }]}>-${(stats.total_devoluciones || 0).toLocaleString()}</Text>
                                    </View>
                                )}
                                {(stats.prepago_pendiente_clientes || 0) > 0 && (
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Saldos clientes (no están en caja)</Text>
                                        <Text style={[styles.breakdownItemValue, { color: accentColor }]}>-${(stats.prepago_pendiente_clientes || 0).toLocaleString()}</Text>
                                    </View>
                                )}
                                <View style={[styles.breakdownItem, { borderTopWidth: 1, borderTopColor: borderColor, marginTop: 8, paddingTop: 8 }]}>
                                    <Text style={[styles.breakdownItemLabel, { color: textPrimary, fontWeight: '800' }]}>MONTO DE CIERRE</Text>
                                    <Text style={[styles.breakdownItemValue, { color: accentColor, fontWeight: '900', fontSize: 20 }]}>${(stats.monto_cierre_previsto ?? stats.balance_total ?? 0).toLocaleString()}</Text>
                                </View>
                            </View>
                        )}

                        {}
                        {modalType === 'cerrar' ? (
                            <View style={[styles.inputBox, { borderColor, backgroundColor: surfaceMuted, justifyContent: 'center' }]}>
                                <Text style={[styles.currencySign, { color: textPrimary }]}>$</Text>
                                <Text style={[styles.input, { color: textPrimary }]}>
                                    {(stats?.monto_cierre_previsto ?? stats?.balance_total ?? 0).toLocaleString()}
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.inputBox, { borderColor, backgroundColor: surfaceMuted }]}>
                                <Text style={[styles.currencySign, { color: textPrimary }]}>$</Text>
                                <TextInput
                                    style={[styles.input, { color: textPrimary }]}
                                    value={monto}
                                    onChangeText={handleMontoChange}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={textSecondary}
                                    autoFocus
                                />
                            </View>
                        )}

                        {}
                        {modalType === 'retiro' && (
                            <View style={[styles.inputBox, { borderColor, backgroundColor: surfaceMuted, marginBottom: 0 }]}>
                                <Ionicons name="document-text-outline" size={18} color={textSecondary} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[styles.input, { color: textPrimary, fontSize: 15 }]}
                                    value={motivoRetiro}
                                    onChangeText={val => dispatch({ type: 'SET_MOTIVO', payload: val })}
                                    placeholder="Motivo del retiro"
                                    placeholderTextColor={textSecondary}
                                />
                            </View>
                        )}

                        {}
                        {modalType === 'cerrar' && (
                            <View style={[styles.infoBox, { backgroundColor: `${modalConfig.color}12` }]}>
                                <Ionicons name="shield-checkmark-outline" size={18} color={modalConfig.color} />
                                <Text style={{ color: modalConfig.color, fontSize: 12, fontWeight: '700', marginLeft: 8, flex: 1 }}>
                                    Se envía el pedido por WhatsApp al administrador. La caja sigue abierta hasta que autorice.
                                </Text>
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
                                style={[styles.modalBtn, { backgroundColor: surfaceMuted }]}
                                onPress={() => dispatch({ type: 'CLOSE_MODAL' })}
                                disabled={submitting}
                            >
                                <Text style={[styles.modalBtnCancel, { color: textSecondary }]}>Cancelar</Text>
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
        borderRadius: BorderRadius.full,
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
        borderRadius: BorderRadius.full,
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
        borderRadius: BorderRadius.full,
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
        borderRadius: BorderRadius.full,
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
        borderRadius: BorderRadius.full
    },
});
