import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
    Pressable,
    StyleSheet,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { MIN_TOUCH_TARGET } from '@/constants/spacing';

export { MIN_TOUCH_TARGET };

/**
 * `hitSlop` por lado necesario para que un círculo visualmente menor alcance
 * 44pt efectivos. Un botón de 40 no puede crecer sin romper el layout, así que
 * se amplía el área táctil en vez del dibujo.
 */
export function getIconButtonHitSlop(size: number): number {
    return size >= MIN_TOUCH_TARGET ? 0 : Math.ceil((MIN_TOUCH_TARGET - size) / 2);
}

export interface IconButtonProps {
    icon: keyof typeof Ionicons.glyphMap;
    /** Acción concreta; un icono solo no alcanza para lectores de pantalla. */
    accessibilityLabel: string;
    onPress: () => void;
    color: string;
    /** Diámetro visual. Por defecto 44. */
    size?: number;
    iconSize?: number;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    disabled?: boolean;
    accessibilityHint?: string;
    /** Contenido superpuesto, por ejemplo un contador de notificaciones. */
    badge?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

/**
 * Botón de icono con etiqueta obligatoria y área táctil de al menos 44pt.
 * Reemplaza los `Pressable` de 28-38 px que se repetían en headers, modales y
 * calendarios.
 */
export function IconButton({
    icon,
    accessibilityLabel,
    onPress,
    color,
    size = MIN_TOUCH_TARGET,
    iconSize,
    backgroundColor,
    borderColor,
    borderWidth = 0,
    disabled = false,
    accessibilityHint,
    badge,
    style,
}: IconButtonProps) {
    const hitSlop = getIconButtonHitSlop(size);
    const { isDark, accentColor } = useAccentColor();

    // Glow neón en modo oscuro
    const neonGlow = isDark && !disabled ? {
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    } : {};

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled }}
            hitSlop={
                hitSlop > 0
                    ? { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }
                    : undefined
            }
            style={({ pressed }) => [
                styles.base,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor,
                    borderColor,
                    borderWidth,
                    opacity: pressed ? 0.7 : disabled ? 0.5 : 1,
                    transform: pressed ? [{ scale: 1.15 }] : [],
                    ...neonGlow,
                },
                style,
            ]}
        >
            <Ionicons
                name={icon}
                size={iconSize ?? Math.round(size / 2)}
                color={color}
            />
            {badge}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
