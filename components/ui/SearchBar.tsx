import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
    const { isDark, cardBg, textPrimary, textSecondary, borderColor, accentColor } = useAccentColor();
    const [focused, setFocused] = useState(false);
    const [internalText, setInternalText] = useState(value);
    const [prevValue, setPrevValue] = useState(value);
    const borderScale = useSharedValue(1);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Ajuste durante el render (patrón recomendado por React) para reflejar
    // cambios del valor externo sin un efecto con setState.
    if (value !== prevValue) {
        setPrevValue(value);
        setInternalText(value);
    }

    const animatedBorderStyle = useAnimatedStyle(() => ({
        borderWidth: 2,
        transform: [{ scale: borderScale.value }],
    }));

    const handleFocus = () => {
        setFocused(true);
        borderScale.set(withTiming(1.02, { duration: 200 }));
    };

    const handleBlur = () => {
        setFocused(false);
        borderScale.set(withTiming(1, { duration: 200 }));
    };

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
        setInternalText('');
        if (onChangeText) onChangeText('');
        if (onClear) onClear();
    }, [onChangeText, onClear]);

    return (
        <Animated.View style={[animatedBorderStyle, style]}>
            <View style={[
                styles.container,
                {
                    backgroundColor: cardBg,
                    borderColor: focused ? accentColor : borderColor,
                },
            ]}>
                <Ionicons
                    name="search"
                    size={FontSize.md}
                    color={focused ? accentColor : textSecondary}
                    style={styles.icon}
                />
                <TextInput
                    style={[styles.input, { color: textPrimary, flex: 1 }]}
                    placeholder={placeholder}
                    placeholderTextColor={textSecondary}
                    value={internalText}
                    onChangeText={handleTextChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    autoFocus={autoFocus}
                    accessibilityLabel="Barra de búsqueda"
                    accessibilityHint="Escriba para filtrar resultados"
                    returnKeyType="search"
                />
                {internalText.length > 0 && (
                    <Pressable
                        onPress={handleClear}
                        style={[styles.clearBtn, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
                        accessibilityRole="button"
                        accessibilityLabel="Limpiar búsqueda"
                    >
                        <Ionicons name="close-circle" size={FontSize.md} color={textSecondary} />
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: BorderRadius.button,
        borderWidth: 2,
        gap: 10,
    },
    icon: {
        marginLeft: 4,
    },
    input: {
        fontSize: FontSize.sm,
        fontWeight: '500',
        minHeight: 22,
    },
    clearBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
