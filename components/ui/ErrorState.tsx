import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';
import { accentTextColor } from '@/utils/color';
import { haptic } from '@/utils/haptics';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius, FontSize } from '@/constants/spacing';

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

/**
 * Paleta de error única para toda la app. Los valores oscuros coinciden con
 * los que ya usaba `EmployeeListError`, para que las bandas de error se vean
 * iguales en ambos modos.
 */
const ERROR_COLORS = {
    light: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: '#B91C1C' },
    dark: { bg: '#1F1414', border: '#7F1D1D', text: '#FCA5A5', icon: '#F87171' },
} as const;

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
    const colors = isDark ? ERROR_COLORS.dark : ERROR_COLORS.light;

    const handleRetry = () => {
        haptic.tap();
        onRetry?.();
    };

    if (variant === 'inline') {
        return (
            <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[
                    styles.inlineContainer,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                    style,
                ]}
            >
                <View style={styles.inlineIconBox}>
                    <Ionicons name={icon} size={20} color={colors.icon} />
                </View>
                <View style={styles.inlineBody}>
                    <Text
                        maxFontSizeMultiplier={1.4}
                        style={[styles.inlineTitle, { color: textPrimary }]}
                    >
                        {title}
                    </Text>
                    {message ? (
                        <Text
                            maxFontSizeMultiplier={1.4}
                            style={[styles.inlineMessage, { color: colors.text }]}
                        >
                            {message}
                        </Text>
                    ) : null}
                </View>
                {onRetry ? (
                    <Pressable
                        style={({ pressed }) => [
                            styles.inlineRetry,
                            { backgroundColor: colors.icon },
                            pressed && styles.pressed,
                        ]}
                        onPress={handleRetry}
                        accessibilityRole="button"
                        accessibilityLabel={retryLabel}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text maxFontSizeMultiplier={1.3} style={styles.inlineRetryText}>
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
                <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2' }]}>
                    <Ionicons name={icon} size={48} color={colors.icon} />
                </View>
                <Text maxFontSizeMultiplier={1.4} style={[styles.title, { color: textPrimary }]}>{title}</Text>
                {message && (
                    <Text maxFontSizeMultiplier={1.4} style={[styles.message, { color: textSecondary }]}>{message}</Text>
                )}
                {retryLabel && onRetry && (
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: accentColor }]}
                        onPress={handleRetry}
                        accessibilityRole="button"
                        accessibilityLabel={retryLabel}
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
        fontSize: 18,
        fontFamily: FontFamily.bold,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
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
        borderRadius: 9999,
        minWidth: 160,
    },
    actionText: {
        fontSize: 14,
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
