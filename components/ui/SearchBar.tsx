import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';

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
    const { isDark, cardBg, textPrimary, textSecondary } = useAccentColor();
    const [internalText, setInternalText] = useState(value);
    const [prevValue, setPrevValue] = useState(value);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
                },
            ]}>
                <Ionicons
                    name="search"
                    size={FontSize.md}
                    color={textSecondary}
                    style={styles.icon}
                />
                <TextInput
                    style={[styles.input, { color: textPrimary, flex: 1 }]}
                    placeholder={placeholder}
                    placeholderTextColor={textSecondary}
                    value={internalText}
                    onChangeText={handleTextChange}
                    onFocus={() => {}}
                    onBlur={() => {}}
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: BorderRadius.button,
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
    clearBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
});