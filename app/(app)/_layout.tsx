import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StaffCallOverlay } from '../../components/StaffCallOverlay';
import { useNotificationHandler } from '../../hooks/useNotificationHandler';
import { useAuthStore } from '../../store/authStore';
import { configureNotifications } from '../../utils/pushNotifications';

export default function AppLayout() {
    const user = useAuthStore((state) => state.user);

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

    return (
        <>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            />
            <StaffCallOverlay />
        </>
    );
}
