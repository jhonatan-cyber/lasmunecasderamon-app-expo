import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { triggerNotificationEffects } from '../utils/pushNotifications';

/**
 * Hook centralizado para manejar notificaciones entrantes y navegación (Deep Linking)
 */
export function useNotificationHandler() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    useEffect(() => {
        if (!user) return;


        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            const { title, body } = notification.request.content;

            triggerNotificationEffects(title || '', body || '', (user.role as any)?.name || user.role);
        });


        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            const type = data?.type as string;
            handleNotificationNavigation(type, data);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [user]);

    const handleNotificationNavigation = (type: string, data: any) => {
        const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
        const role = roleName?.toLowerCase();

        switch (type) {
            case 'new_service_request':
                if (role === 'cajero' || role === 'administrador') {
                    router.push('/(app)/cajero/solicitudes');
                }
                break;

            case 'timer_ended':
                if (role === 'cajero' || role === 'administrador') {
                    router.push('/(app)/cajero/servicios');
                }
                break;

            case 'order_created':
                if (role === 'cajero' || role === 'administrador') {
                    router.push('/(app)/cajero/ventas');
                }
                break;

            case 'service_request_approved':
                if (role === 'garzon') router.push('/(app)/garzon' as any);
                if (role === 'anfitriona') router.push('/(app)/anfitriona' as any);
                break;

            case 'order_processed':
                if (role === 'garzon') router.push('/(app)/garzon' as any);
                break;

            default:
                console.log('⚠️ Tipo de notificación no manejado para navegación:', type);
        }
    };
}
