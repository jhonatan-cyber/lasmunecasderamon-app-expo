import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize } from '@/constants/spacing';
import { readableTextColor } from '@/utils/color';

export interface EmptyStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'diamond-outline',
    title,
    message,
    actionLabel,
    onAction,
    style,
}) => {
    const { isDark, cardBg, textPrimary, textSecondary, accentColor } = useAccentColor();

    return (
        <AnimatedView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 100 }}
        >
            <View style={[styles.container, { backgroundColor: cardBg }, style]}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                    <Ionicons name={icon} size={48} color={textSecondary} />
                </View>
                <Text maxFontSizeMultiplier={1.4} style={[styles.title, { color: textPrimary }]}>{title}</Text>
                {message && (
                    <Text maxFontSizeMultiplier={1.4} style={[styles.message, { color: textSecondary }]}>{message}</Text>
                )}
                {actionLabel && onAction && (
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: accentColor }]}
                        onPress={onAction}
                        accessibilityRole="button"
                        accessibilityLabel={actionLabel}
                    >
                        <Text style={[styles.actionText, { color: readableTextColor(accentColor) }]}>{actionLabel}</Text>
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
        fontWeight: '700',
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
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 9999,
        minWidth: 160,
        alignItems: 'center',
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
});
