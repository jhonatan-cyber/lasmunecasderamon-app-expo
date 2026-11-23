import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, HitSlop, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { haptic } from '@/utils/haptics';

interface ActiveServiceCardProps {
    habitacion: string;
    tiempoRestante?: string;
    onPress?: () => void;
}

export const ActiveServiceCard = ({ habitacion, tiempoRestante, onPress }: ActiveServiceCardProps) => {
    const { accentColor } = useAccentColor();
    const [pulseAnim] = useState(() => new Animated.Value(1));

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
        <AnimatedView
            from={{ opacity: 0, scale: 0.9, translateY: -20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
        >
            <Pressable
                onPress={() => {
                  haptic.tap();
                  onPress && onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Servicio activo en habitación ${habitacion}`}
                accessibilityHint="Toque para ver más detalles"
                hitSlop={HitSlop.sm}
            >
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
        </AnimatedView>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: 16,
        padding: 20,
        borderRadius: BorderRadius.full,
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
        borderRadius: BorderRadius.full,
        gap: 6,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.black,
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
        fontSize: FontSize.xs,
        fontFamily: FontFamily.extrabold,
        letterSpacing: 1,
    },
    roomNumber: {
        color: '#FFF',
        fontSize: FontSize.xl,
        fontFamily: FontFamily.black,
        letterSpacing: -1,
    },
    timerContainer: {
        alignItems: 'flex-end',
    },
    timerText: {
        color: '#FFF',
        fontSize: FontSize.xl,
        fontFamily: FontFamily.extrabold,
    },
    timerSubText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.bold,
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
        fontSize: FontSize.xs,
        fontFamily: FontFamily.semibold,
    },
});

