import React from 'react';
import { ActivityIndicator, PressableProps, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { haptic } from '@/utils/haptics';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { accentTextColor } from '@/utils/color';

interface LoadingButtonProps extends Omit<PressableProps, 'style' | 'onPress'> {
    /** Texto del botón cuando no está cargando */
    label: string;
    /** Acción al presionar */
    onPress: () => void;
    /** Si está cargando, deshabilita el botón y muestra spinner */
    loading?: boolean;
    /** Estilo personalizado del contenedor */
    style?: StyleProp<ViewStyle>;
    /** Texto del spinner para accesibilidad */
    loadingLabel?: string;
}

/**
 * Botón que combina AnimatedButton con estado de carga y deshabilitación automática.
 * Muestra un ActivityIndicator dentro del botón mientras `loading` es true.
 */
export function LoadingButton({
    label,
    onPress,
    loading = false,
    style,
    loadingLabel = 'Cargando',
    ...props
}: LoadingButtonProps) {
    const { accentColor, isDark } = useAccentColor();

    // Glow neón en modo oscuro cuando está cargando
    const neonGlow = isDark && loading ? {
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    } : {};

    return (
        <AnimatedButton
            onPress={() => { haptic.tap(); onPress(); }}
            disabled={loading || props.disabled}
            accessibilityLabel={loading ? `${loadingLabel}: ${label}` : props.accessibilityLabel || label}
            style={[styles.button, { backgroundColor: accentColor }, neonGlow, style]}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={accentTextColor(accentColor)} />
            ) : (
                <Text style={[styles.text, { color: accentTextColor(accentColor) }]}>{label}</Text>
            )}
        </AnimatedButton>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 50,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 120,
    },
    text: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.bold,
        letterSpacing: 0.5,
    },
});
