import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { FontSize, BorderRadius } from '@/constants/spacing';
import { accentTextColor } from '@/utils/color';
import { FontFamily } from '@/constants/fonts';
import { haptic } from '@/utils/haptics';

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
    const { cardBg, surfaceMuted, textPrimary, textSecondary, accentColor, borderColor, isDark } = useAccentColor();
    const reducedMotion = useReducedMotion();

    // Animación de flotar del ícono (desactivado con reducedMotion)
    const floatValue = useSharedValue(0);
    useEffect(() => {
        if (reducedMotion) {
            // Sin animación de flotar cuando el usuario prefiere movimiento reducido.
            floatValue.value = 0;
            return;
        }
        floatValue.value = withRepeat(
            withSequence(
                withTiming(6, { duration: 2000 }),
                withTiming(0, { duration: 2000 }),
            ),
            -1,
            true,
        );
    }, [floatValue, reducedMotion]);

    const floatAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: floatValue.value }],
    }));

    // Glow neón en botón de acción en modo oscuro
    const actionNeonGlow = isDark ? {
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    } : {};

    // Patrón sutil de fondo con líneas diagonales
    const patternBg = {
        opacity: 0.03,
    };

    return (
        <AnimatedView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 100 }}
        >
            <View style={[styles.container, { backgroundColor: cardBg, borderColor }, style]}>
                {/* Patrón de fondo sutil */}
                <View style={[styles.patternOverlay, patternBg]}>
                    {[...Array(6)].map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.patternLine,
                                {
                                    transform: [
                                        { rotate: '45deg' },
                                        { translateY: i * 30 - 60 },
                                    ],
                                    backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                },
                            ]}
                        />
                    ))}
                </View>
                <Animated.View style={[styles.iconContainer, { backgroundColor: surfaceMuted }, floatAnimatedStyle]}>
                    <Ionicons name={icon} size={48} color={textSecondary} />
                </Animated.View>
                <Text maxFontSizeMultiplier={1.5} style={[styles.title, { color: textPrimary }]}>{title}</Text>
                {message && (
                    <Text maxFontSizeMultiplier={1.5} style={[styles.message, { color: textSecondary }]}>{message}</Text>
                )}
                {actionLabel && onAction && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.actionButton,
                            { backgroundColor: accentColor },
                            actionNeonGlow,
                            pressed && { opacity: 0.85 },
                        ]}
                        onPress={() => {
                            haptic.tap();
                            onAction();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={actionLabel}
                        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    >
                        <Text style={[styles.actionText, { color: accentTextColor(accentColor) }]}>{actionLabel}</Text>
                    </Pressable>
                )}
            </View>
        </AnimatedView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 40,
        borderRadius: BorderRadius.xxl,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    patternOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    patternLine: {
        position: 'absolute',
        left: -50,
        right: -50,
        height: 1,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        zIndex: 1,
    },
    title: {
        fontSize: FontSize.lg,
        fontFamily: FontFamily.bold,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.regular,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    actionButton: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: BorderRadius.full,
        minWidth: 160,
        alignItems: 'center',
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: FontSize.sm,
        fontFamily: FontFamily.semibold,
    },
});
