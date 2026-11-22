import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { accentTextColor } from '@/utils/color';
import { haptic } from '@/utils/haptics';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { Colors } from '@/constants/theme';

export interface ErrorStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    message?: string;
    retryLabel?: string;
    onRetry?: () => void;
    style?: StyleProp<ViewStyle>;
    /**
     * `full` (por defecto) ocupa la pantalla; `inline` es una banda compacta
     * para errores dentro de una lista. Antes cada pantalla pintaba su propia
     * tarjeta de error, con colores distintos y en algunos casos solo para
     * modo claro.
     */
    variant?: 'full' | 'inline';
}


export const ErrorState: React.FC<ErrorStateProps> = ({
    icon = 'alert-circle-outline',
    title,
    message,
    retryLabel = 'Reintentar',
    onRetry,
    style,
    variant = 'full',
}) => {
    const { isDark, cardBg, textPrimary, textSecondary, accentColor } = useAccentColor();
    const reducedMotion = useReducedMotion();
    const theme = isDark ? Colors.dark : Colors.light;
    const errorColor = theme.error;
    const errorLight = theme.errorLight;

    const handleRetry = () => {
        haptic.tap();
        onRetry?.();
    };

    // Animación de flotar en el ícono de error (desactivado con reducedMotion)
    const floatValue = useSharedValue(0);
    useEffect(() => {
        if (reducedMotion) {
            // Sin animación de flotar cuando el usuario prefiere movimiento reducido.
            floatValue.value = 0;
            return;
        }
        floatValue.value = withRepeat(
            withSequence(
                withTiming(6, { duration: 1500 }),
                withTiming(0, { duration: 1500 }),
            ),
            -1,
            true,
        );
    }, [floatValue, reducedMotion]);

    const floatAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: floatValue.value }],
    }));

    // Glow neón en modo oscuro para el ícono
    const iconNeonGlow = isDark ? {
        shadowColor: errorColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    } : {};

    // Glow neón en el botón de acción en modo oscuro
    const buttonNeonGlow = isDark && onRetry ? {
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    } : {};

    if (variant === 'inline') {
        return (
            <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[
                    styles.inlineContainer,
                    { backgroundColor: errorLight, borderColor: errorColor },
                    style,
                ]}
            >
                <View style={[styles.inlineIconBox, { backgroundColor: errorLight }]}>
                    <Ionicons name={icon} size={20} color={errorColor} />
                </View>
                <View style={styles.inlineBody}>
                    <Text
                        maxFontSizeMultiplier={1.5}
                        style={[styles.inlineTitle, { color: textPrimary }]}
                    >
                        {title}
                    </Text>
                    {message ? (
                        <Text
                            maxFontSizeMultiplier={1.5}
                            style={[styles.inlineMessage, { color: errorColor }]}
                        >
                            {message}
                        </Text>
                    ) : null}
                </View>
                {onRetry ? (
                    <Pressable
                        style={({ pressed }) => [
                            styles.inlineRetry,
                            { backgroundColor: errorColor },
                            pressed && { opacity: 0.85 },
                        ]}
                        onPress={handleRetry}
                        accessibilityRole="button"
                        accessibilityLabel={retryLabel}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text maxFontSizeMultiplier={1.5} style={[styles.inlineRetryText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                            {retryLabel}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
    }

    return (
        <AnimatedView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 100 }}
        >
            <View
                accessibilityLiveRegion="polite"
                style={[styles.container, { backgroundColor: cardBg }, style]}
            >
                <Animated.View style={floatAnimatedStyle}>
                    <View style={[styles.iconContainer, { backgroundColor: errorLight, ...iconNeonGlow }]}>
                        <Ionicons name={icon} size={48} color={errorColor} />
                    </View>
                </Animated.View>
                <Text maxFontSizeMultiplier={1.5} style={[styles.title, { color: textPrimary }]}>{title}</Text>
                {message && (
                    <Text maxFontSizeMultiplier={1.5} style={[styles.message, { color: textSecondary }]}>{message}</Text>
                )}
                {retryLabel && onRetry && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.actionButton,
                            { backgroundColor: accentColor },
                            buttonNeonGlow,
                            pressed && { opacity: 0.85 },
                        ]}
                        onPress={handleRetry}
                        accessibilityRole="button"
                        accessibilityLabel={retryLabel}
                        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    >
                        <Ionicons name="refresh" size={18} color={accentTextColor(accentColor)} />
                        <Text style={[styles.actionText, { color: accentTextColor(accentColor) }]}>{retryLabel}</Text>
                    </Pressable>
                )}
            </View>
        </AnimatedView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 40,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        marginHorizontal: 16,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: FontSize.lg,
        fontFamily: FontFamily.bold,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: FontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: BorderRadius.full,
        minWidth: 160,
    },
    actionText: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.bold,
    },

    // Variante inline: banda compacta sobre una lista.
    inlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 16,
        marginTop: 8,
        padding: 12,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    inlineIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineBody: {
        flex: 1,
        gap: 2,
    },
    inlineTitle: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.bold,
    },
    inlineMessage: {
        fontSize: FontSize.xs,
        lineHeight: 18,
    },
    inlineRetry: {
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineRetryText: {
        color: '#FFFFFF',
        fontSize: FontSize.xs,
        fontFamily: FontFamily.bold,
    },
    pressed: {
        opacity: 0.8,
    },
});
