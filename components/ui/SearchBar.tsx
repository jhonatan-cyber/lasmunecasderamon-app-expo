import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { haptic } from '@/utils/haptics';
import { IconButton } from '@/components/ui/IconButton';
import { withAlpha } from '@/utils/color';

export interface SearchBarProps {
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    onClear?: () => void;
    autoFocus?: boolean;
    style?: any;
    /** Debounce in ms for onChangeText callbacks (default 300). Set 0 to disable. */
    debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    placeholder = 'Buscar...',
    value = '',
    onChangeText,
    onClear,
    autoFocus = false,
    style,
    debounceMs = 300,
}) => {
    const { cardBg, surfaceMuted, textPrimary, textSecondary, borderColor, accentColor, isDark } = useAccentColor();
    const reducedMotion = useReducedMotion();
    const [internalText, setInternalText] = useState(value);
    const [prevValue, setPrevValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Animación del ícono de búsqueda al enfocar
    const iconScale = useSharedValue(1);
    useEffect(() => {
        if (reducedMotion) {
            // Sin animación de escala cuando el usuario prefiere movimiento reducido.
            iconScale.value = isFocused ? 1.15 : 1;
        } else {
            iconScale.value = withSpring(isFocused ? 1.15 : 1, { damping: 12, stiffness: 200 });
        }
    }, [isFocused, iconScale, reducedMotion]);

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }));

    // Glow neón en modo oscuro cuando está enfocado
    const neonGlow = isDark && isFocused ? {
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
        borderColor: accentColor,
    } : {};

    // Ajuste durante el render (patrón recomendado por React) para reflejar
    // cambios del valor externo sin un efecto con setState.
    if (value !== prevValue) {
        setPrevValue(value);
        setInternalText(value);
    }


    const handleTextChange = useCallback((text: string) => {
        setInternalText(text);
        if (debounceMs <= 0) {
            onChangeText?.(text);
            return;
        }
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            onChangeText?.(text);
        }, debounceMs);
    }, [onChangeText, debounceMs]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    const handleClear = useCallback(() => {
        haptic.tap();
        setInternalText('');
        if (onChangeText) onChangeText('');
        if (onClear) onClear();
    }, [onChangeText, onClear]);

    return (
        <View style={[style]}>
            <View style={[
                styles.container,
                {
                    backgroundColor: cardBg,
                    borderColor: isFocused ? accentColor : borderColor,
                    borderWidth: isFocused ? 1.5 : 1,
                    ...neonGlow,
                },
            ]}>
                <Animated.View style={iconAnimatedStyle}>
                    <Ionicons
                        name="search"
                        size={FontSize.md}
                        color={isFocused ? accentColor : textSecondary}
                        style={styles.icon}
                    />
                </Animated.View>
                <TextInput
                    style={[styles.input, { color: textPrimary, flex: 1 }]}
                    placeholder={placeholder}
                    placeholderTextColor={textSecondary}
                    value={internalText}
                    onChangeText={handleTextChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoFocus={autoFocus}
                    accessibilityLabel="Barra de búsqueda"
                    accessibilityHint="Escriba para filtrar resultados"
                    returnKeyType="search"
                />
                {internalText.length > 0 && (
                    <IconButton
                        icon="close-circle"
                        accessibilityLabel="Limpiar búsqueda"
                        onPress={handleClear}
                        color={textSecondary}
                        size={28}
                        iconSize={FontSize.md}
                        backgroundColor={surfaceMuted}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        gap: 10,
    },
    icon: {
        marginLeft: 4,
    },
    input: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.medium,
        minHeight: 22,
    },
});