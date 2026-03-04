import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
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
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const isTablet = width >= 768;

    const iconSize = isTablet ? 42 : 26;
    const fontSize = isTablet ? 20 : 12;
    const descSize = isTablet ? 14 : 9;
    const minHeight = isTablet ? 140 : 82;
    const padding = isTablet ? 26 : 14;
    const iconBoxSize = isTablet ? 68 : 42;

    if (isDark) {
        // Modo oscuro: fondo sólido de color (diseño original)
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
                        shadowColor: color,
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
    }

    // Modo claro: fondo blanco con borde y sombra del color
    return (
        <AnimatedButton
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            style={[
                styles.cardLight,
                {
                    opacity: disabled ? 0.5 : 1,
                    minHeight,
                    padding,
                    borderColor: `${color}40`,
                    shadowColor: color,
                }
            ]}
        >
            <View style={styles.content}>
                <View style={[
                    styles.iconContainerLight,
                    {
                        width: iconBoxSize,
                        height: iconBoxSize,
                        borderRadius: isTablet ? 16 : 14,
                        backgroundColor: `${color}15`,
                    }
                ]}>
                    <Ionicons name={icon} size={iconSize} color={color} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.titleLight, { fontSize, color: '#0F172A' }]}>{title}</Text>
                    <Text style={[styles.descriptionLight, { fontSize: descSize, color: '#64748B' }]}>{description}</Text>
                </View>
            </View>
            {/* Acento superior del color */}
            <View style={[styles.accentBar, { backgroundColor: color }]} />
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
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    cardLight: {
        flex: 1,
        borderRadius: 20,
        padding: 14,
        minHeight: 82,
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    accentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
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
    iconContainerLight: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: 10,
    },
    title: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 0.2,
    },
    titleLight: {
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    description: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 9,
        fontWeight: '600',
        marginTop: 1,
    },
    descriptionLight: {
        fontWeight: '600',
        marginTop: 2,
    },
});
