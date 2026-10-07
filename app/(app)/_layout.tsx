import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RegistroAsistenciaModal } from '@/components/shared/RegistroAsistenciaModal';
import { StaffCallOverlay } from '@/components/shared/StaffCallOverlay';
import { useNotificationHandler } from '@/hooks/useNotificationHandler';
import { useAuthStore } from '@/store/authStore';

export default function AppLayout() {
    const user = useAuthStore((state) => state.user);
    const sessionExpired = useAuthStore((state) => state.sessionExpired);
    const clearSessionExpired = useAuthStore((state) => state.clearSessionExpired);
    const logout = useAuthStore((state) => state.logout);
    const refreshUser = useAuthStore((state) => state.refreshUser);
    const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);

    const isStaffMember = user?.role && 
        (user.role.toLowerCase().includes('garzon') || 
         user.role.toLowerCase().includes('anfitriona') ||
         user.role.toLowerCase().includes('barman'));

    
    useEffect(() => {
        if (user && isStaffMember) {
            const checkAndShowModal = async () => {
                try {
                    const modalShownKey = 'asistenciaModalShown';
                    const lastShown = await AsyncStorage.getItem(modalShownKey);
                    const today = new Date().toDateString();
                    
                    if (lastShown !== today) {
                        setShowAsistenciaModal(true);
                        await AsyncStorage.setItem(modalShownKey, today);
                    }
                } catch {
                    setShowAsistenciaModal(true);
                }
            };
            checkAndShowModal();
        }
    }, [user, isStaffMember]);

    const handleAsistenciaRegistered = () => {
        setShowAsistenciaModal(false);
    };

    
    useNotificationHandler();

    // configureNotifications() vive en NotificationProvider (único dueño):
    // llamarlo aquí era duplicado (es idempotente, pero con doble ownership).

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    const handleLogout = async () => {
        clearSessionExpired();
        await logout();
    };

    // "Reintentar" revalida contra /auth/me: si el 401 fue un bache (token
    // rotado, backend reiniciado), la sesión se recupera sin relogin. Si no
    // se recupera, se cierra igual (modo offline/cache sigue disponible y el
    // próximo 401 reabre el modal). Nunca se fuerza logout aquí: sin red el
    // refresh falla aunque los tokens locales sigan siendo válidos.
    const handleContinueWithoutLogout = async () => {
        await refreshUser().catch(() => false);
        clearSessionExpired();
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

            {}
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
                            Por favor, iniciá sesión nuevamente para continuar.
                        </Text>
                        <TouchableOpacity style={styles.btn} onPress={handleLogout}>
                            <Text style={styles.btnText}>Iniciar sesión</Text>
                        </TouchableOpacity>
                            <TouchableOpacity style={styles.btnSecondary} onPress={handleContinueWithoutLogout}>
                                <Text style={styles.btnSecondaryText}>Reintentar sesión</Text>
                            </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {}
            <RegistroAsistenciaModal
                visible={showAsistenciaModal}
                onClose={() => setShowAsistenciaModal(false)}
                onRegistered={handleAsistenciaRegistered}
            />
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
        borderRadius: 9999,
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



