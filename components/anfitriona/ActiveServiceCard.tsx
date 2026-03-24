import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useAccentColor } from '@/hooks/useAccentColor';

interface ActiveServiceCardProps {
    habitacion: string;
    tiempoRestante?: string;
    onPress?: () => void;
}

export const ActiveServiceCard = ({ habitacion, tiempoRestante, onPress }: ActiveServiceCardProps) => {
    const { accentColor } = useAccentColor();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.9, translateY: -20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
        >
            <Pressable onPress={onPress}>
                <LinearGradient
                    colors={[accentColor, `${accentColor}CC`, `${accentColor}99`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.container}
                >
                    <View style={styles.header}>
                        <View style={styles.badge}>
                            <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
                            <Text style={styles.badgeText}>EN PROCESO</Text>
                        </View>
                        <Ionicons name="timer-outline" size={20} color="#FFF" />
                    </View>

                    <View style={styles.content}>
                        <View>
                            <Text style={styles.label}>HABITACIÓN</Text>
                            <Text style={styles.roomNumber}>{habitacion}</Text>
                        </View>
                        {tiempoRestante && (
                            <View style={styles.timerContainer}>
                                <Text style={styles.timerText}>{tiempoRestante}</Text>
                                <Text style={styles.timerSubText}>restantes</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Toca para más detalles</Text>
                        <Ionicons name="chevron-forward" size={16} color="#FFF" />
                    </View>
                </LinearGradient>
            </Pressable>
        </MotiView>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: 16,
        padding: 20,
        borderRadius: 28,
        elevation: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 15,
    },
    label: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    roomNumber: {
        color: '#FFF',
        fontSize: 42,
        fontWeight: '900',
        letterSpacing: -1,
    },
    timerContainer: {
        alignItems: 'flex-end',
    },
    timerText: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '800',
    },
    timerSubText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '700',
        marginTop: -4,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    footerText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
    },
});

