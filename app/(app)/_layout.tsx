import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { StaffCallOverlay } from '../../components/StaffCallOverlay';
import { useNotificationHandler } from '../../hooks/useNotificationHandler';
import { useAuthStore } from '../../store/authStore';
import { configureNotifications } from '../../utils/pushNotifications';

export default function AppLayout() {
    const user = useAuthStore((state) => state.user);
    const sessionExpired = useAuthStore((state) => state.sessionExpired);
    const clearSessionExpired = useAuthStore((state) => state.clearSessionExpired);
    const logout = useAuthStore((state) => state.logout);

    // Inicializar el manejador central de notificaciones (Navegación, TTS, Haptics)
    useNotificationHandler();

    useEffect(() => {
        if (user) {
            // Configurar comportamiento global (banners, sonidos)
            configureNotifications();
        }
    }, [user?.id]);

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    const handleLogout = async () => {
        clearSessionExpired();
        await logout();
    };

    return (
        <>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            />
            <StaffCallOverlay />

            {/* Modal de sesión expirada - no redirige automáticamente */}
            <Modal
                visible={sessionExpired}
                transparent
                animationType="fade"
                statusBarTranslucent
            >
                <View style={styles.overlay}>
                    <View style={styles.dialog}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.icon}>🔒</Text>
                        </View>
                        <Text style={styles.title}>Sesión expirada</Text>
                        <Text style={styles.message}>
                            Tu sesión ha expirado o el acceso fue revocado.{'\n'}
                            Por favor, inicia sesión nuevamente para continuar.
                        </Text>
                        <TouchableOpacity style={styles.btn} onPress={handleLogout}>
                            <Text style={styles.btnText}>Iniciar sesión</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnSecondary} onPress={clearSessionExpired}>
                            <Text style={styles.btnSecondaryText}>Continuar sin cerrar sesión</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    dialog: {
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 28,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
    icon: {
        fontSize: 32,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
    btn: {
        backgroundColor: '#6c63ff',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 32,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    btnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    btnSecondary: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        width: '100%',
        alignItems: 'center',
    },
    btnSecondaryText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
    },
});
