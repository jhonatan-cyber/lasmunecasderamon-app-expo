import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Stack, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RegistroAsistenciaModal } from '@/components/shared/RegistroAsistenciaModal';
import { StaffCallOverlay } from '@/components/shared/StaffCallOverlay';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { useNotificationHandler } from '@/hooks/useNotificationHandler';
import { useAuthStore } from '@/store/authStore';
import { accentTextColor } from '@/utils/color';
import {
    RUTA_PANTALLA_ASISTENCIA,
    esRutaPantallaAsistencia,
    useModoPantallaStore,
} from '@/store/modoPantallaStore';

export default function AppLayout() {
    const user = useAuthStore((state) => state.user);
    const sessionExpired = useAuthStore((state) => state.sessionExpired);
    const clearSessionExpired = useAuthStore((state) => state.clearSessionExpired);
    const logout = useAuthStore((state) => state.logout);
    const refreshUser = useAuthStore((state) => state.refreshUser);
    const enModoPantalla = useModoPantallaStore((state) => state.activo);
    const segmentos = useSegments();
    const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);

    const { isDark, bg, cardBg, textPrimary, textSecondary, accentColor } = useAccentColor();
    const accentText = accentTextColor(accentColor);

    const isStaffMember = user?.role &&
        (user.role.toLowerCase().includes('garzon') ||
            user.role.toLowerCase().includes('anfitriona') ||
            user.role.toLowerCase().includes('barman'));

    // El registro de asistencia solo aparece sobre el inicio del rol, no encima
    // de una pantalla operativa abierta por deep link.
    const rutas = segmentos as string[];
    const enInicio = rutas.includes('(tabs)') && rutas[rutas.length - 1] === 'index';

    useEffect(() => {
        // El tour de bienvenida tiene prioridad: no apilamos dos modales al entrar.
        if (!user || !isStaffMember || !enInicio || !user.hasCompletedOnboarding) return;
        let active = true;

        const checkAndShowModal = async () => {
            try {
                const modalShownKey = 'asistenciaModalShown';
                const lastShown = await AsyncStorage.getItem(modalShownKey);
                const today = new Date().toDateString();

                if (lastShown !== today && active) {
                    setShowAsistenciaModal(true);
                    await AsyncStorage.setItem(modalShownKey, today);
                }
            } catch {
                if (active) setShowAsistenciaModal(true);
            }
        };
        void checkAndShowModal();

        return () => {
            active = false;
        };
    }, [user, isStaffMember, enInicio]);

    const handleAsistenciaRegistered = () => {
        setShowAsistenciaModal(false);
    };

    useNotificationHandler();
    useCajaAbierta();
    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    if (enModoPantalla && !esRutaPantallaAsistencia(segmentos)) {
        return <Redirect href={RUTA_PANTALLA_ASISTENCIA} />;
    }

    const handleLogout = async () => {
        clearSessionExpired();
        await logout();
    };

    const handleContinueWithoutLogout = async () => {
        await refreshUser().catch(() => false);
        clearSessionExpired();
    };

    return (
        <>
            {/* En horizontal, el notch ocupa los laterales: contenemos el área
                segura para que ninguna pantalla quede debajo. */}
            <SafeAreaView
                edges={['left', 'right']}
                style={[styles.safeArea, { backgroundColor: bg }]}
            >
                <Stack
                    screenOptions={{
                        headerShown: false,
                        animation: 'slide_from_right',
                        // La app sigue la orientación del dispositivo (vertical u horizontal).
                        orientation: 'default',
                    }}
                >
                    <Stack.Screen name="barman" options={{ headerShown: false }} />
                    <Stack.Screen name="garzon" options={{ headerShown: false }} />
                    <Stack.Screen name="cajero" options={{ headerShown: false }} />
                    <Stack.Screen name="anfitriona" options={{ headerShown: false }} />
                    <Stack.Screen name="diagnostico" options={{ headerShown: false }} />
                    <Stack.Screen name="envases-pendientes" options={{ headerShown: false }} />
                </Stack>
            </SafeAreaView>
            {!enModoPantalla && <StaffCallOverlay />}

            <Modal
                visible={sessionExpired}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={handleContinueWithoutLogout}
            >
                <View style={styles.overlay}>
                    <View
                        style={[
                            styles.dialog,
                            {
                                backgroundColor: cardBg,
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                            },
                        ]}
                        accessibilityViewIsModal
                        accessibilityRole="alert"
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="lock-closed" size={30} color="#EF4444" />
                        </View>
                        <Text maxFontSizeMultiplier={1.4} style={[styles.title, { color: textPrimary }]}>
                            Sesión expirada
                        </Text>
                        <Text maxFontSizeMultiplier={1.4} style={[styles.message, { color: textSecondary }]}>
                            Tu sesión ha expirado o el acceso fue revocado.{'\n'}
                            Por favor, iniciá sesión nuevamente para continuar.
                        </Text>
                        <Pressable
                            style={[styles.btn, { backgroundColor: accentColor }]}
                            onPress={handleLogout}
                            accessibilityRole="button"
                            accessibilityLabel="Iniciar sesión de nuevo"
                        >
                            <Text maxFontSizeMultiplier={1.3} style={[styles.btnText, { color: accentText }]}>
                                Iniciar sesión
                            </Text>
                        </Pressable>
                        <Pressable
                            style={styles.btnSecondary}
                            onPress={handleContinueWithoutLogout}
                            accessibilityRole="button"
                            accessibilityLabel="Reintentar sesión"
                        >
                            <Text maxFontSizeMultiplier={1.3} style={[styles.btnSecondaryText, { color: textSecondary }]}>
                                Reintentar sesión
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <RegistroAsistenciaModal
                visible={showAsistenciaModal}
                onClose={() => setShowAsistenciaModal(false)}
                onRegistered={handleAsistenciaRegistered}
            />
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    dialog: {
        borderRadius: 24,
        padding: 28,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        borderWidth: 1,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(239,68,68,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
    btn: {
        borderRadius: 9999,
        minHeight: 52,
        justifyContent: 'center',
        paddingHorizontal: 32,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    btnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    btnSecondary: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 16,
        width: '100%',
        alignItems: 'center',
    },
    btnSecondaryText: {
        fontSize: 13,
    },
});
