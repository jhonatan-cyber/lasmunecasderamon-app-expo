import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { BorderRadius } from '@/constants/spacing';
import { MODAL_MAX_WIDTH } from '@/constants/layout';
import { FontFamily } from '@/constants/fonts';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CajaAction } from '@/hooks/useCaja';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { CajaStats } from '@/types/caja';
import { formatearMonto, parseMonto } from '@/utils/cajaFormat';

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
    textPrimary: string;
    textSecondary: string;
    stats: CajaStats | null;
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
    const { cardBg, surfaceMuted, borderColor, accentOnSurface } = useAccentColor();
    const { isTablet, isLandscape, height } = useResponsiveMetrics();

    // Apertura admite $0 (turno sin efectivo base); retiro exige monto positivo.
    const montoValido = modalType === 'cerrar'
        || (monto.trim() !== '' && (modalType === 'abrir' || parseMonto(monto) > 0));
    const motivoValido = modalType !== 'retiro' || motivoRetiro.trim() !== '';
    const confirmarDeshabilitado = submitting || !montoValido || !motivoValido;

    const efectivoDisponible = Number(
        stats?.efectivo_en_caja ?? stats?.total_efectivo ?? 0
    );

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
                style={[
                    styles.modalOverlay,
                    isTablet && styles.overlayCentrado,
                    { padding: isTablet ? 20 : 0 },
                ]}
            >
                <View
                    style={[
                        styles.modalCard,
                        { backgroundColor: cardBg, maxHeight: height * 0.9 },
                        isTablet && styles.modalCardCentrado,
                    ]}
                >
                    <View style={[styles.modalAccent, { backgroundColor: modalConfig.color }]} />

                    <ScrollView
                        style={styles.modalScroll}
                        contentContainerStyle={[
                            styles.modalBody,
                            isLandscape && styles.modalBodyCompacto,
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={[styles.modalIconBox, { backgroundColor: `${modalConfig.color}20` }]}>
                            <Ionicons name={modalConfig.icon} size={32} color={modalConfig.color} />
                        </View>

                        <Text style={[styles.modalTitle, { color: textPrimary }]}>
                            {modalConfig.title}
                        </Text>

                        <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                            {modalConfig.subtitle}
                        </Text>

                        {modalType === 'cerrar' && stats && (
                            <View style={[styles.modalBreakdown, { backgroundColor: surfaceMuted, borderColor }]}>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Monto Apertura (Base)</Text>
                                    <Text style={[styles.breakdownItemValue, { color: textPrimary }]}>{formatearMonto(stats.monto_apertura)}</Text>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Ventas Efectivo (Turno)</Text>
                                    <Text style={[styles.breakdownItemValue, { color: accentOnSurface }]}>
                                        {formatearMonto((stats.total_efectivo ?? 0) - (stats.monto_apertura ?? 0))}
                                    </Text>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Ventas con Tarjeta</Text>
                                    <Text style={[styles.breakdownItemValue, { color: accentOnSurface }]}>{formatearMonto(stats.total_tarjeta)}</Text>
                                </View>
                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Transferencias</Text>
                                    <Text style={[styles.breakdownItemValue, { color: accentOnSurface }]}>{formatearMonto(stats.total_transferencia)}</Text>
                                </View>
                                {(stats.total_devoluciones ?? 0) > 0 && (
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Devoluciones</Text>
                                        <Text style={[styles.breakdownItemValue, { color: accentOnSurface }]}>-{formatearMonto(stats.total_devoluciones)}</Text>
                                    </View>
                                )}
                                {(stats.prepago_pendiente_clientes ?? 0) > 0 && (
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownItemLabel, { color: textSecondary }]}>Saldos clientes (no están en caja)</Text>
                                        <Text style={[styles.breakdownItemValue, { color: accentOnSurface }]}>-{formatearMonto(stats.prepago_pendiente_clientes)}</Text>
                                    </View>
                                )}
                                <View style={[styles.breakdownItem, { borderTopWidth: 1, borderTopColor: borderColor, marginTop: 8, paddingTop: 8 }]}>
                                    <Text style={[styles.breakdownItemLabel, { color: textPrimary, fontFamily: FontFamily.extrabold }]}>MONTO DE CIERRE</Text>
                                    <Text style={[styles.breakdownItemValue, { color: accentOnSurface, fontFamily: FontFamily.black, fontSize: 20 }]}>
                                        {formatearMonto(stats.monto_cierre_previsto ?? stats.balance_total)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {modalType === 'cerrar' ? (
                            <View style={[styles.inputBox, { borderColor, backgroundColor: surfaceMuted, justifyContent: 'center' }]}>
                                <Text style={[styles.currencySign, { color: textPrimary }]}>$</Text>
                                <Text style={[styles.input, { color: textPrimary }]} accessibilityLabel="Monto de cierre">
                                    {formatearMonto(stats?.monto_cierre_previsto ?? stats?.balance_total)}
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
                                    maxLength={15}
                                    placeholder="0"
                                    placeholderTextColor={textSecondary}
                                    accessibilityLabel="Monto"
                                    autoFocus
                                />
                            </View>
                        )}

                        {modalType === 'retiro' && (
                            <View style={[styles.inputBox, { borderColor, backgroundColor: surfaceMuted, marginBottom: 0 }]}>
                                <Ionicons name="document-text-outline" size={18} color={textSecondary} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[styles.input, { color: textPrimary, fontSize: 15 }]}
                                    value={motivoRetiro}
                                    onChangeText={val => dispatch({ type: 'SET_MOTIVO', payload: val })}
                                    placeholder="Motivo del retiro"
                                    placeholderTextColor={textSecondary}
                                    accessibilityLabel="Motivo del retiro"
                                />
                            </View>
                        )}

                        {modalType === 'cerrar' && (
                            <View
                                style={[styles.infoBox, { backgroundColor: `${modalConfig.color}12` }]}
                                accessibilityRole="alert"
                            >
                                <Ionicons name="shield-checkmark-outline" size={18} color={modalConfig.color} />
                                <Text style={{ color: modalConfig.color, fontSize: 12, fontFamily: FontFamily.bold, marginLeft: 8, flex: 1 }}>
                                    Se envía el pedido por WhatsApp al administrador. La caja sigue abierta hasta que autorice.
                                </Text>
                            </View>
                        )}

                        {modalType === 'retiro' && stats && (
                            <View
                                style={[styles.infoBox, { backgroundColor: `${modalConfig.color}12`, marginTop: 16 }]}
                                accessibilityRole="alert"
                            >
                                <Ionicons name="information-circle-outline" size={18} color={modalConfig.color} />
                                <Text style={{ color: modalConfig.color, fontSize: 13, fontFamily: FontFamily.bold, marginLeft: 8 }}>
                                    Efectivo disponible: {formatearMonto(efectivoDisponible)}
                                </Text>
                            </View>
                        )}

                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: surfaceMuted }]}
                                onPress={() => dispatch({ type: 'CLOSE_MODAL' })}
                                disabled={submitting}
                            >
                                <Text style={[styles.modalBtnCancel, { color: textSecondary }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, {
                                    backgroundColor: modalConfig.color,
                                    opacity: confirmarDeshabilitado ? 0.5 : 1,
                                }]}
                                onPress={handleSubmit}
                                disabled={confirmarDeshabilitado}
                                accessibilityState={{ disabled: confirmarDeshabilitado }}
                            >
                                <Text style={styles.modalBtnConfirm}>
                                    {submitting ? 'Procesando...' : modalConfig.btnText}
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
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
    overlayCentrado: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden'
    },
    modalCardCentrado: {
        maxWidth: MODAL_MAX_WIDTH,
        borderRadius: 24,
    },
    modalScroll: {
        width: '100%',
    },
    modalAccent: {
        height: 4,
        width: '100%'
    },
    modalBody: {
        padding: 24,
        paddingBottom: 32
    },
    modalBodyCompacto: {
        paddingVertical: 16,
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
        fontFamily: FontFamily.black,
        textAlign: 'center',
        marginBottom: 6
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: FontFamily.medium,
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
        fontFamily: FontFamily.bold
    },
    modalBtnConfirm: {
        fontSize: 14,
        fontFamily: FontFamily.extrabold,
        color: '#FFF'
    },
    modalBreakdown: {
        borderRadius: BorderRadius.card,
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
        fontFamily: FontFamily.semibold
    },
    breakdownItemValue: {
        fontSize: 13,
        fontFamily: FontFamily.extrabold
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
        fontFamily: FontFamily.extrabold,
        marginRight: 8
    },
    input: {
        flex: 1,
        fontSize: 22,
        fontFamily: FontFamily.black,
        padding: 0
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: BorderRadius.full
    },
});
