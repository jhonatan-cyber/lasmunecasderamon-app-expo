import React, { useEffect } from 'react';
import { AccessibilityRole, AccessibilityValue, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';

export interface ProgressBarProps {
    /** 0-100 progress value. Omit for indeterminate mode. */
    progress?: number;
    color?: string;
    height?: number;
    message?: string;
    style?: StyleProp<ViewStyle>;
    /** Accessibility label for screen readers (e.g., "Cargando servicio") */
    accessibilityLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    color,
    height = 6,
    message,
    style,
    accessibilityLabel,
}) => {
    const { accentColor, surfaceMuted, textSecondary, isDark } = useAccentColor();
    const reducedMotion = useReducedMotion();
    const barColor = color || accentColor;
    const indeterminateTranslateX = useSharedValue(-100);

    // Glow neón en modo oscuro para el fill de la barra
    const neonGlow = isDark ? {
        shadowColor: barColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 3,
    } : {};

    useEffect(() => {
        if (progress === undefined && !reducedMotion) {
            indeterminateTranslateX.value = withRepeat(
                withTiming(200, { duration: 1200 }),
                -1,
                false,
            );
        }
    }, [progress, indeterminateTranslateX, reducedMotion]);

    const indeterminateStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indeterminateTranslateX.value }],
    }));

    const indeterminateScale = useAnimatedStyle(() => {
        const translateX = indeterminateTranslateX.value;
        const widthPercent = interpolate(translateX, [-100, 0, 100, 200], [20, 40, 20, 5]);
        return { width: '100%', transform: [{ scaleX: widthPercent / 100 }] };
    });

    // Accesibilidad: role y value dinámicos para lectores de pantalla
    const accessibilityRole: AccessibilityRole = 'progressbar';
    const accessibilityValue: AccessibilityValue = progress !== undefined
        ? { min: 0, max: 100, now: Math.round(progress), text: `${Math.round(progress)}%` }
        : { min: 0, max: 100, now: 0, text: 'Cargando' };

    return (
        <View
            accessibilityRole={accessibilityRole}
            accessibilityLabel={accessibilityLabel || message || 'Progreso'}
            accessibilityValue={accessibilityValue}
            style={style}
        >
            {message && (
                <Text style={[styles.message, { color: textSecondary }]}>
                    {message}
                </Text>
            )}
            <View style={[
                styles.track,
                {
                    height,
                    borderRadius: BorderRadius.xs,
                    backgroundColor: surfaceMuted,
                },
            ]}>
                <Animated.View
                    style={[
                        styles.fill,
                        {
                            height,
                            borderRadius: BorderRadius.xs,
                            backgroundColor: barColor,
                            width: '100%',
                            ...(progress !== undefined
                                ? { transform: [{ scaleX: progress / 100 }] }
                                : [indeterminateStyle, indeterminateScale]),
                            ...neonGlow,
                        },
                    ]}
                />
            </View>
            {progress !== undefined && (
                <Text style={[styles.percentage, { color: textSecondary }]}>
                    {Math.round(progress)}%
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    track: {
        width: '100%',
        overflow: 'hidden',
    },
    fill: {
        height: 6,
    },
    message: {
        fontSize: FontSize.xs,
        fontFamily: FontFamily.medium,
        marginBottom: 6,
    },
    percentage: {
        fontSize: FontSize.xs,
        fontFamily: FontFamily.semibold,
        marginTop: 4,
        textAlign: 'right',
    },
});
