import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { useAuthStore } from '@/store/authStore';

export interface OnboardingStep {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
}

export interface OnboardingTourProps {
    role: 'anfitriona' | 'garzon' | 'cajero' | 'barman';
    visible: boolean;
    onClose: () => void;
}

const onboardingData: Record<string, OnboardingStep[]> = {
    anfitriona: [
        {
            icon: 'bed-outline',
            title: 'Tus Servicios',
            description: 'En la pestaña Servicios verás todos tus servicios activos y finalizados con el estado en tiempo real.',
        },
        {
            icon: 'bar-chart-outline',
            title: 'Analíticas',
            description: 'Revisa tus ganancias, comisiones y rendimiento en la sección de analíticas.',
        },
        {
            icon: 'help-circle-outline',
            title: 'Asistencia Silenciosa',
            description: 'Desde cada servicio activo puedes solicitar tragos, limpieza o enviar una alerta de seguridad.',
        },
    ],
    garzon: [
        {
            icon: 'restaurant-outline',
            title: 'Tus Pedidos',
            description: 'Accede a los pedidos pendientes y gestiona los servicios desde tu pantalla principal.',
        },
        {
            icon: 'cash-outline',
            title: 'Resumen',
            description: 'Consulta tus ganancias del día, propinas y comisiones en el resumen.',
        },
        {
            icon: 'qr-code-outline',
            title: 'Asistencia QR',
            description: 'Usa el escáner QR en el header para registrar tu entrada y salida de turno.',
        },
    ],
    cajero: [
        {
            icon: 'cart-outline',
            title: 'Ventas y Cuentas',
            description: 'Procesa ventas y gestiona cuentas pendientes desde el grid de acciones.',
        },
        {
            icon: 'cash-outline',
            title: 'Control de Caja',
            description: 'Abre y cierra caja, revisa el estado del turno y las pantallas de asistencia.',
        },
        {
            icon: 'notifications-outline',
            title: 'Solicitudes',
            description: 'Las solicitudes pendientes aparecen con un indicador en el icono de notificaciones.',
        },
    ],
    barman: [
        {
            icon: 'beer-outline',
            title: 'Pedidos de Tragos',
            description: 'Visualiza los pedidos de tragos en tiempo real y marca cada uno como completado.',
        },
        {
            icon: 'analytics-outline',
            title: 'Resumen del Turno',
            description: 'Al final del turno, revisa el total de tragos servidos y tu rendimiento.',
        },
        {
            icon: 'qr-code-outline',
            title: 'Asistencia QR',
            description: 'Escanea tu código QR para registrar la entrada y salida de tu turno.',
        },
    ],
};

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ role, visible, onClose }) => {
    const { accentColor, cardBg, surfaceMuted, textPrimary, textSecondary } = useAccentColor();
    const steps = onboardingData[role] || onboardingData.anfitriona;
    const [currentStep, setCurrentStep] = useState(0);
    const fadeOpacity = useSharedValue(0);

    const finishOnboarding = useCallback(async () => {
        useAuthStore.setState((state) => {
            if (state.user) {
                const updatedUser = { ...state.user, hasCompletedOnboarding: true };
                // Persist to AsyncStorage so it survives app restarts
                AsyncStorage.setItem('user', JSON.stringify(updatedUser)).catch(() => {});
                return { user: updatedUser };
            }
            return { user: state.user };
        });
        onClose();
    }, [onClose]);

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            fadeOpacity.set(withTiming(0, { duration: 150 }));
            setTimeout(() => {
                setCurrentStep((s) => s + 1);
                fadeOpacity.set(withTiming(1, { duration: 250 }));
            }, 150);
        } else {
            finishOnboarding();
        }
    }, [currentStep, steps.length, fadeOpacity, finishOnboarding]);

    const contentStyle = useAnimatedStyle(() => ({
        opacity: fadeOpacity.value,
    }));

    React.useEffect(() => {
        if (visible) {
            fadeOpacity.set(withTiming(1, { duration: 300 }));
        }
    }, [visible, fadeOpacity]);

    if (!visible) return null;

    const step = steps[currentStep];

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.card, contentStyle, { backgroundColor: cardBg }]}>
                    <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
                        <Ionicons name={step.icon} size={56} color={accentColor} />
                    </View>

                    <Text style={[styles.title, { color: textPrimary }]}>{step.title}</Text>
                    <Text style={[styles.description, { color: textSecondary }]}>{step.description}</Text>

                    <View style={styles.dotsContainer}>
                        {steps.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: i === currentStep ? accentColor : surfaceMuted,
                                        width: i === currentStep ? 24 : 8,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    <View style={styles.actions}>
                        <Pressable
                            style={[styles.skipBtn, { backgroundColor: surfaceMuted }]}
                            onPress={finishOnboarding}
                            accessibilityRole="button"
                            accessibilityLabel="Saltar recorrido"
                        >
                            <Text style={[styles.skipText, { color: textSecondary }]}>Saltar</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.nextBtn, { backgroundColor: accentColor }]}
                            onPress={handleNext}
                            accessibilityRole="button"
                            accessibilityLabel={currentStep < steps.length - 1 ? 'Siguiente paso' : 'Comenzar'}
                        >
                            <Text style={styles.nextText}>
                                {currentStep < steps.length - 1 ? 'Siguiente' : 'Comenzar'}
                            </Text>
                            <Ionicons
                                name={currentStep < steps.length - 1 ? 'arrow-forward' : 'checkmark'}
                                size={FontSize.md}
                                color="#FFFFFF"
                            />
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '88%',
        maxWidth: 400,
        borderRadius: BorderRadius.xxl,
        padding: 32,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: FontSize.sm,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 32,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    skipBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: BorderRadius.button,
        alignItems: 'center',
    },
    skipText: {
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    nextBtn: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: BorderRadius.button,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    nextText: {
        color: '#FFFFFF',
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
});
