import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { MODAL_MAX_WIDTH } from '@/constants/layout';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { readableTextColor } from '@/utils/color';
import { FontFamily } from '@/constants/fonts';
import { IconButton } from '@/components/ui/IconButton';
import { BorderRadius } from '@/constants/spacing';

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
    const reducedMotion = useReducedMotion();

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
    const alertColor = getColor();

    // Animación de entrada con scale y opacity (spring)
    const alertScale = useSharedValue(0.8);
    const alertOpacity = useSharedValue(0);
    useEffect(() => {
        if (visible) {
            if (reducedMotion) {
                // Sin animación cuando el usuario prefiere movimiento reducido.
                alertScale.value = 1;
                alertOpacity.value = 1;
            } else {
                alertScale.value = withSpring(1, { damping: 12, stiffness: 200 });
                alertOpacity.value = withDelay(50, withTiming(1, { duration: 250 }));
            }
        } else {
            alertScale.value = 0.8;
            alertOpacity.value = 0;
        }
    }, [visible, alertScale, alertOpacity, reducedMotion]);

    // Shake animation en el ícono para tipo danger (desactivado con reducedMotion)
    const shakeRotate = useSharedValue(0);
    useEffect(() => {
        if (visible && type === 'danger' && !reducedMotion) {
            shakeRotate.value = withSequence(
                withTiming(-8, { duration: 80 }),
                withTiming(8, { duration: 160 }),
                withTiming(-6, { duration: 120 }),
                withTiming(6, { duration: 120 }),
                withTiming(0, { duration: 80 }),
            );
        }
    }, [visible, type, shakeRotate, reducedMotion]);

    const alertAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: alertScale.value }],
        opacity: alertOpacity.value,
    }));

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${shakeRotate.value}deg` }],
    }));

    // Glow neón en modo oscuro con el color del tipo
    const neonGlow = isDark ? {
        shadowColor: alertColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        borderColor: `${alertColor}60`,
        borderWidth: 1.5,
    } : {};

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={styles.modalOverlay} accessibilityLabel="Alerta" accessibilityRole="alert" accessibilityLiveRegion="assertive">
                <Animated.View
                    style={[styles.alertCard, { backgroundColor: cardBg, width: alertWidth, padding }, alertAnimatedStyle, neonGlow]}
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

                    <Animated.View style={[iconAnimatedStyle]}>
                        <View style={[styles.alertIconHeader, { backgroundColor: `${alertColor}20`, width: iconSize + 16, height: iconSize + 16, borderRadius: (iconSize + 16) / 2 }]}>
                        <Ionicons name={getIcon()} size={iconSize} color={alertColor} />
                        </View>
                    </Animated.View>

                    <Text maxFontSizeMultiplier={1.4} style={[styles.alertTitle, { color: textPrimary, fontSize: isTablet ? 24 : 20 }]}>{title}</Text>
                    <Text maxFontSizeMultiplier={1.4} style={[styles.alertMessage, { color: textSecondary, fontSize: isTablet ? 17 : 15 }]}>{message}</Text>

                    <View style={styles.alertActions}>
                        {showCancel && (
                            <Pressable
                                onPress={handleDismiss}
                                style={[styles.alertBtn, { backgroundColor: surfaceMuted, flex: 1, height: isTablet ? 60 : 54 }]}
                                accessibilityRole="button"
                                accessibilityLabel={cancelText}
                            >
                                <Text maxFontSizeMultiplier={1.3} style={[styles.alertBtnText, { color: textPrimary, fontSize: isTablet ? 16 : 14 }]}>{cancelText}</Text>
                            </Pressable>
                        )}
                        <View style={isDark ? {
                            shadowColor: alertColor,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4,
                        } : {}}>
                            <Pressable
                                onPress={handleConfirm}
                                style={[
                                    styles.alertBtn,
                                    {
                                        backgroundColor: alertColor,
                                        flex: showCancel ? 1 : 0,
                                        minWidth: showCancel ? 0 : (isTablet ? 160 : 120),
                                        height: isTablet ? 60 : 54
                                    }
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={confirmText}
                            >
                                <Text maxFontSizeMultiplier={1.3} style={[styles.alertBtnText, { color: readableTextColor(alertColor), fontSize: isTablet ? 16 : 14 }]}>{confirmText}</Text>
                            </Pressable>
                        </View>
                    </View>
                </Animated.View>
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
        borderRadius: BorderRadius.card,
        padding: 24,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        overflow: 'hidden',
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
        borderRadius: BorderRadius.full,
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
        borderRadius: BorderRadius.full,
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
