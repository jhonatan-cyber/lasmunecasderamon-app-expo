import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PremiumFABProps {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    visible?: boolean;
}

export const PremiumFAB = ({ label, icon, onPress, visible = true }: PremiumFABProps) => {
    const { accentColor } = useAccentColor();
    const insets = useSafeAreaInsets();
    
    if (!visible) return null;

    return (
        <TouchableOpacity 
            style={[styles.fab, { backgroundColor: accentColor, bottom: Math.max(insets.bottom, 16) + 16 }]} 
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Ionicons name={icon} size={22} color="#FFFFFF" />
            <Text style={styles.fabText}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    fab: { 
        position: 'absolute', 
        right: 20, 
        bottom: 20, 
        height: 56, 
        paddingHorizontal: 24,
        borderRadius: 28, 
        flexDirection: 'row',
        alignItems: 'center', 
        justifyContent: 'center', 
        elevation: 10, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.35, 
        shadowRadius: 10,
        gap: 8,
        zIndex: 100,
    },
    fabText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
});

