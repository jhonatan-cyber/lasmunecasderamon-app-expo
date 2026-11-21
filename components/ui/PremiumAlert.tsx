import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MODAL_MAX_WIDTH } from '@/constants/layout';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { readableTextColor } from '@/utils/color';
import { FontFamily } from '@/constants/fonts';
import { IconButton } from '@/components/ui/IconButton';

interface PremiumAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
    onConfirm?: () => void;
    onCancel?: () => void;
    /**
     * Cierre sin ejecutar la acción confirmada. Si no se pasa, se usa
     * `onCancel`. Neither botón de cierre debe llamar a `onConfirm`: con
     * `onRequestClose={onConfirm}` el botón "atrás" de Android ejecutaba la
     * acción (p. ej. anular una venta) en lugar de descartarla.
     */
    onDismiss?: () => void;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
}

export const PremiumAlert: React.FC<PremiumAlertProps> = ({
    visible,
    title,
    message,
    type = 'info',
    onConfirm,
    onCancel,
    onDismiss,
    showCancel = false,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar'
}) => {
    const { isDark, cardBg, surfaceMuted, textPrimary, textSecondary, accentColor } = useAccentColor();
    const { isTablet } = useResponsiveMetrics();

    // Descartar nunca ejecuta la acción confirmada: llama a `onDismiss` y, si
    // no existe, a `onCancel`. Sin ninguno de los dos no hay forma de cerrar,
    // así que la "X" se oculta en vez de quedar como un botón inerte.
    const handleDismiss = useCallback(() => {
        (onDismiss ?? onCancel)?.();
    }, [onDismiss, onCancel]);

    const puedeDescartar = Boolean(onDismiss ?? onCancel);

    // Evita el doble toque: una confirmación (p. ej. pagar nómina) no puede
    // ejecutarse dos veces seguidas. El bloqueo es temporal, no permanente:
    // si la acción falla y el modal sigue abierto (caso real en `pagos` y
    // `anticipos-admin`), el usuario tiene que poder reintentar.
    const confirmando = useRef(false);
    const liberando = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        confirmando.current = false;
        if (liberando.current) {
            clearTimeout(liberando.current);
            liberando.current = null;
        }
    }, [visible]);

    useEffect(
        () => () => {
            if (liberando.current) clearTimeout(liberando.current);
        },
        [],
    );

    const handleConfirm = useCallback(() => {
        if (confirmando.current) return;
        confirmando.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onConfirm?.();
        liberando.current = setTimeout(() => {
            confirmando.current = false;
            liberando.current = null;
        }, 1500);
    }, [onConfirm]);

    const getIcon = () => {
        switch (type) {
            case 'danger': return 'alert-circle';
            case 'success': return 'checkmark-circle';
            case 'warning': return 'warning';
            default: return 'information-circle';
        }
    };

    // Tonos oscurecidos: el blanco sobre los colores originales no llegaba a
    // AA (success 2.5:1, warning 2.2:1, danger 3.8:1).
    const getColor = () => {
        switch (type) {
            case 'danger': return '#B91C1C';
            case 'success': return '#047857';
            case 'warning': return '#B45309';
            default: return accentColor;
        }
    };

    const alertWidth = isTablet ? '60%' : '90%';
    const iconSize = isTablet ? 56 : 40;
    const padding = isTablet ? 32 : 24;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={styles.modalOverlay} accessibilityLabel="Alerta" accessibilityRole="alert" accessibilityLiveRegion="assertive">
                <View
                    style={[styles.alertCard, { backgroundColor: cardBg, width: alertWidth, padding }]}
                    accessibilityViewIsModal
                >

                    {}
                    {puedeDescartar && (
                        <IconButton
                            icon="close"
                            accessibilityLabel="Cerrar alerta"
                            onPress={handleDismiss}
                            color={isDark ? '#9CA3AF' : '#6B7280'}
                            size={32}
                            iconSize={18}
                            backgroundColor={surfaceMuted}
                            style={styles.closeBtn}
                        />
                    )}

                    <View style={[styles.alertIconHeader, { backgroundColor: `${getColor()}20`, width: iconSize + 16, height: iconSize + 16, borderRadius: (iconSize + 16) / 2 }]}>
                        <Ionicons name={getIcon()} size={iconSize} color={getColor()} />
                    </View>

                    <Text maxFontSizeMultiplier={1.4} style={[styles.alertTitle, { color: textPrimary, fontSize: isTablet ? 24 : 20 }]}>{title}</Text>
                    <Text maxFontSizeMultiplier={1.4} style={[styles.alertMessage, { color: textSecondary, fontSize: isTablet ? 17 : 15 }]}>{message}</Text>

                    <View style={styles.alertActions}>
                        {showCancel && (
                            <Pressable
                                onPress={onCancel}
                                style={[styles.alertBtn, { backgroundColor: surfaceMuted, flex: 1, height: isTablet ? 60 : 54 }]}
                                accessibilityRole="button"
                                accessibilityLabel={cancelText}
                            >
                                <Text maxFontSizeMultiplier={1.3} style={[styles.alertBtnText, { color: textPrimary, fontSize: isTablet ? 16 : 14 }]}>{cancelText}</Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={handleConfirm}
                            style={[
                                styles.alertBtn,
                                {
                                    backgroundColor: getColor(),
                                    flex: showCancel ? 1 : 0,
                                    minWidth: showCancel ? 0 : (isTablet ? 160 : 120),
                                    height: isTablet ? 60 : 54
                                }
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={confirmText}
                        >
                            <Text maxFontSizeMultiplier={1.3} style={[styles.alertBtnText, { color: readableTextColor(getColor()), fontSize: isTablet ? 16 : 14 }]}>{confirmText}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertCard: {
        width: '90%',
        maxWidth: MODAL_MAX_WIDTH,
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    alertIconHeader: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    alertTitle: {
        fontSize: 20,
        fontFamily: FontFamily.bold,
        textAlign: 'center',
        marginBottom: 10,
    },
    alertMessage: {
        fontSize: 15,
        fontFamily: FontFamily.regular,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    alertActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center',
    },
    alertBtn: {
        flex: 1,
        height: 54,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    alertBtnText: {
        fontSize: 14,
        fontFamily: FontFamily.semibold,
        textAlign: 'center',
    },
});
