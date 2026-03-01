import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AnimatedButton } from './AnimatedButton';

interface GarzonActionCardProps {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
    disabled?: boolean;
}

export const GarzonActionCard = ({ title, description, icon, color, onPress, disabled }: GarzonActionCardProps) => {
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const iconSize = isTablet ? 32 : 24;
    const fontSize = isTablet ? 14 : 12;
    const descSize = isTablet ? 11 : 9;
    const minHeight = isTablet ? 100 : 80;
    const padding = isTablet ? 20 : 16;
    const iconBoxSize = isTablet ? 48 : 40;

    return (
        <AnimatedButton
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            style={[
                styles.card,
                {
                    backgroundColor: disabled ? '#9CA3AF' : color,
                    opacity: disabled ? 0.6 : 1,
                    minHeight,
                    padding,
                }
            ]}
        >
            <View style={styles.content}>
                <View style={[styles.iconContainer, { width: iconBoxSize, height: iconBoxSize, borderRadius: isTablet ? 14 : 12 }]}>
                    <Ionicons name={icon} size={iconSize} color="#FFF" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { fontSize }]}>{title}</Text>
                    <Text style={[styles.description, { fontSize: descSize }]}>{description}</Text>
                </View>
            </View>
        </AnimatedButton>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 20,
        padding: 16,
        minHeight: 80,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: 8,
    },
    title: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 0.2,
    },
    description: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 9,
        fontWeight: '600',
        marginTop: 1,
    },
});
