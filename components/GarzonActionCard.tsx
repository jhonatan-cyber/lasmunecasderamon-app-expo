import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAccentColor } from '../hooks/useAccentColor';
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
    const { isDark } = useAccentColor();
    const isTablet = width >= 768;

    const iconSize = isTablet ? 38 : 28;
    const fontSize = isTablet ? 22 : 14;
    const descSize = isTablet ? 14 : 10;
    const minHeight = isTablet ? 160 : 100;
    const padding = isTablet ? 24 : 16;

    // Premium Floating Design
    const cardBg = isDark ? '#1E1B4B' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';

    return (
        <AnimatedButton
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            style={[
                styles.cardContainer,
                {
                    backgroundColor: disabled ? (isDark ? '#374151' : '#F3F4F6') : cardBg,
                    minHeight,
                    padding,
                    shadowColor: color,
                    shadowOpacity: isDark ? 0.3 : 0.15,
                    opacity: disabled ? 0.6 : 1,
                }
            ]}
        >
            <View style={styles.topRow}>
                <LinearGradient
                    colors={[`${color}40`, `${color}10`]}
                    style={[styles.iconBox, { width: isTablet ? 70 : 50, height: isTablet ? 70 : 50, borderRadius: isTablet ? 20 : 16 }]}
                >
                    <Ionicons name={icon} size={iconSize} color={color} />
                </LinearGradient>
            </View>
            
            <View style={styles.infoBox}>
                <Text style={[styles.mainTitle, { fontSize, color: textPrimary }]} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={[styles.subDescription, { fontSize: descSize, color: textSecondary }]} numberOfLines={2}>
                    {description}
                </Text>
            </View>

            {/* Subtle light indicator */}
            {!disabled && <View style={[styles.sideIndicator, { backgroundColor: color }]} />}
        </AnimatedButton>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        borderRadius: 28,
        justifyContent: 'space-between',
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        elevation: 10,
        position: 'relative',
        overflow: 'hidden',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconBox: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBox: {
        marginTop: 12,
    },
    mainTitle: {
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subDescription: {
        fontWeight: '600',
        marginTop: 4,
        lineHeight: 14,
    },
    sideIndicator: {
        position: 'absolute',
        top: 15,
        right: 15,
        width: 6,
        height: 6,
        borderRadius: 3,
    }
});
