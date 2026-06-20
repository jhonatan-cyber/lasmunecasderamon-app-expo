import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { triggerNotificationEffects } from "@/services/pushNotifications";
import {
    getUserRole,
    getUserRoleName,
    isAdminRole,
    isGarzonRole,
    isHostessRole,
} from "@/utils/userRole";

import logger from "@/utils/logger";

export function useNotificationHandler() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    const handleNotificationNavigation = useCallback((type: string, data: any) => {
        const role = getUserRole(user);

        switch (type) {
            case "new_service_request":
                if (isAdminRole(user) || role === "cajero") {
                    router.push("/(app)/cajero/solicitudes");
                }
                break;

            case "timer_ended":
                if (isAdminRole(user) || role === "cajero") {
                    router.push("/(app)/cajero/servicios");
                }
                break;

            case "order_created":
                if (isAdminRole(user) || role === "cajero") {
                    router.push("/(app)/cajero/ventas");
                }
                break;

            case "service_request_approved":
                if (isGarzonRole(user)) router.push("/(app)/garzon" as any);
                if (isHostessRole(user)) router.push("/(app)/anfitriona" as any);
                break;

            case "order_processed":
                if (isGarzonRole(user)) router.push("/(app)/garzon" as any);
                break;

            default:
                logger.info("⚠️ Tipo de notificación no manejado para navegación", { type });
        }
    }, [router, user]);

    useEffect(() => {
        if (!user) return;

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            const { title, body } = notification.request.content;

            triggerNotificationEffects(title || "", body || "", getUserRoleName(user));
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
    }, [user, handleNotificationNavigation]);
}
