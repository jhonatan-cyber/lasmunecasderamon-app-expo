import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/utils/haptics';
import { BorderRadius } from '@/constants/spacing';

interface PremiumFABProps {
    icon: keyof typeof Ionicons.glyphMap;
    /** Acción que ejecuta el botón; un icono solo no alcanza para lectores de pantalla. */
    accessibilityLabel: string;
    onPress: () => void;
    visible?: boolean;
    /** Cuando la pantalla tiene una barra de tabs inferior, el FAB se eleva para no quedar oculto. */
    withTabBar?: boolean;
}

// Altura aproximada del PremiumTabBar (minHeight 60 + padding + safe area).
const TAB_BAR_HEIGHT = 80;

export const PremiumFAB = ({
    icon,
    accessibilityLabel,
    onPress,
    visible = true,
    withTabBar = false,
}: PremiumFABProps) => {
    const { accentColor, accentText, accentGlow } = useAccentColor();
    const insets = useSafeAreaInsets();
    const iconColor = accentText;
    const bottomOffset = withTabBar
        ? Math.max(insets.bottom, 16) + TAB_BAR_HEIGHT + 16
        : Math.max(insets.bottom, 16) + 16;

    if (!visible) return null;

    return (
        <Pressable
            style={[styles.fab, {
                backgroundColor: accentColor,
                bottom: bottomOffset,
                // Sombra de apoyo + halo neón: el botón emite la luz del color.
                boxShadow: `0 4px 10px rgba(0,0,0,0.35), ${accentGlow}`,
            }]}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint="Toque para abrir"
            onPress={() => {
                haptic.confirm();
                onPress();
            }}
        >
            {({ pressed }) => (
                <View style={{ opacity: pressed ? 0.8 : 1 }}>
                    <Ionicons name={icon} size={28} color={iconColor} />
                </View>
            )}
        </Pressable>
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

