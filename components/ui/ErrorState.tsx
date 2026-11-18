import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';
import { accentTextColor } from '@/utils/color';

export interface ErrorStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    message?: string;
    retryLabel?: string;
    onRetry?: () => void;
    style?: any;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    icon = 'alert-circle-outline',
    title,
    message,
    retryLabel = 'Reintentar',
    onRetry,
    style,
}) => {
    const { isDark, cardBg, textPrimary, textSecondary, accentColor } = useAccentColor();

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
                    <Ionicons name={icon} size={48} color="#EF4444" />
                </View>
                <Text maxFontSizeMultiplier={1.4} style={[styles.title, { color: textPrimary }]}>{title}</Text>
                {message && (
                    <Text maxFontSizeMultiplier={1.4} style={[styles.message, { color: textSecondary }]}>{message}</Text>
                )}
                {retryLabel && onRetry && (
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: accentColor }]}
                        onPress={onRetry}
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
        fontWeight: '700',
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
        fontWeight: '700',
    },
});
