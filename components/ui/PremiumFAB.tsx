import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/utils/haptics';
import { BorderRadius } from '@/constants/spacing';
import { TAB_BAR_HEIGHT } from '@/constants/layout';

interface PremiumFABProps {
    icon: keyof typeof Ionicons.glyphMap;
    /** Acción que ejecuta el botón; un icono solo no alcanza para lectores de pantalla. */
    accessibilityLabel: string;
    onPress: () => void;
    visible?: boolean;
    /** Cuando la pantalla tiene una barra de tabs inferior, el FAB se eleva para no quedar oculto. */
    withTabBar?: boolean;
    /** `true` cuando el botón está bloqueado (ej. caja cerrada). */
    disabled?: boolean;
}

export const PremiumFAB = ({
    icon,
    accessibilityLabel,
    onPress,
    visible = true,
    withTabBar = false,
    disabled = false,
}: PremiumFABProps) => {
    const { accentColor, accentText, accentGlow, isDark } = useAccentColor();
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();
    const iconColor = accentText;
    const bottomOffset = withTabBar
        ? Math.max(insets.bottom, 16) + TAB_BAR_HEIGHT + 16
        : Math.max(insets.bottom, 16) + 16;

    // Animación de entrada con bounce
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            if (reducedMotion) {
                // Sin animación de entrada cuando el usuario prefiere movimiento reducido.
                scale.value = 1;
                opacity.value = 1;
            } else {
                scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
                opacity.value = withDelay(200, withTiming(1, { duration: 300 }));
            }
        }
    }, [visible, scale, opacity, reducedMotion]);

    // Pulso sutil continuo en modo oscuro (desactivado con reducedMotion)
    const pulseScale = useSharedValue(1);
    useEffect(() => {
        if (isDark && !disabled && visible && !reducedMotion) {
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 1500 }),
                    withTiming(1, { duration: 1500 }),
                ),
                -1,
                true,
            );
        } else {
            pulseScale.value = 1;
        }
    }, [isDark, disabled, visible, pulseScale, reducedMotion]);

    // Shake animation cuando está disabled y se toca (desactivado con reducedMotion)
    const shakeValue = useSharedValue(0);
    const triggerShake = () => {
        if (disabled && !reducedMotion) {
            shakeValue.value = withSequence(
                withTiming(-4, { duration: 60 }),
                withTiming(4, { duration: 120 }),
                withTiming(-3, { duration: 120 }),
                withTiming(2, { duration: 120 }),
                withTiming(0, { duration: 120 }),
            );
        }
    };

    const fabAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value * pulseScale.value }],
        opacity: opacity.value,
    }));

    const shakeAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeValue.value }],
    }));

    if (!visible) return null;

    return (
        <Animated.View style={fabAnimatedStyle}>
            <Animated.View style={shakeAnimatedStyle}>
                <Pressable
                    style={[styles.fab, {
                        backgroundColor: accentColor,
                        bottom: bottomOffset,
                        opacity: disabled ? 0.5 : 1,
                        // Sombra de apoyo + halo neón: el botón emite la luz del color.
                        boxShadow: disabled ? 'none' : `0 4px 10px rgba(0,0,0,0.35), ${accentGlow}`,
                    }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${accessibilityLabel}${disabled ? ', bloqueado' : ''}`}
                    accessibilityHint={disabled ? 'No disponible sin caja abierta' : 'Toce para abrir'}
                    accessibilityState={{ disabled }}
                    onPress={() => {
                        if (!disabled) {
                            haptic.confirm();
                            onPress();
                        } else {
                            triggerShake();
                        }
                    }}
                >
                    {({ pressed }) => (
                        <View style={{ opacity: pressed && !disabled ? 0.8 : 1 }}>
                            <Ionicons
                                name={disabled ? 'lock-closed' : icon}
                                size={28}
                                color={iconColor}
                            />
                        </View>
                    )}
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        borderRadius: BorderRadius.full,
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        zIndex: 100,
    },
});

