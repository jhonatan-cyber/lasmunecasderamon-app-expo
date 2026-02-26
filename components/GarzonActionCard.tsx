import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface GarzonActionCardProps {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
    disabled?: boolean;
}

export const GarzonActionCard = ({ title, description, icon, color, onPress, disabled }: GarzonActionCardProps) => {
    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            style={({ pressed }) => [
                styles.card,
                {
                    backgroundColor: disabled ? '#9CA3AF' : color,
                    opacity: disabled ? 0.6 : (pressed ? 0.9 : 1)
                }
            ]}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={28} color="#FFF" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 24,
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
        width: 36,
        height: 36,
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
        fontSize: 8,
        fontWeight: '600',
        marginTop: 1,
    },
});
