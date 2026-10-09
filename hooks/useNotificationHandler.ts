import type * as NotificationsType from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  triggerNotificationEffects,
} from "@/services/pushNotifications";
import {
    getUserRole,
    getUserRoleName,
    isAdminRole,
    isBarmanRole,
    isGarzonRole,
    isHostessRole,
} from "@/utils/userRole";

import logger from "@/utils/logger";

export function useNotificationHandler() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const notificationListener = useRef<{ remove: () => void } | null>(null);
    const responseListener = useRef<{ remove: () => void } | null>(null);

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
                } else if (isBarmanRole(user)) {
                    router.push("/(app)/barman/servicios");
                }
                break;

            case "order_created":
                if (isAdminRole(user) || role === "cajero") {
                    router.push("/(app)/cajero/ventas");
                } else if (isBarmanRole(user)) {
                    router.push("/(app)/barman/ventas");
                }
                break;

            case "transfer_created":
                if (isBarmanRole(user)) {
                    router.push({
                        pathname: "/(app)/barman/bar",
                        params: { tab: "pendientes" },
                    } as any);
                }
                break;

            case "container_return_pending":
                if (isAdminRole(user) || role === "cajero") {
                    router.push({
                        pathname: "/(app)/envases-pendientes",
                        params: { batchId: String(data?.batchId || "") },
                    } as any);
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

        // En Expo Go estos devuelven null (push desactivado) — no crashea.
        notificationListener.current = addNotificationReceivedListener((notification: NotificationsType.Notification) => {
            const { title, body } = notification.request.content;

            triggerNotificationEffects(title || "", body || "", getUserRoleName(user));
        });

        responseListener.current = addNotificationResponseReceivedListener((response: NotificationsType.NotificationResponse) => {
            const data = response.notification.request.content.data;
            const type = data?.type as string;
            handleNotificationNavigation(type, data);
        });

        return () => {
            try {
                notificationListener.current?.remove();
            } catch { /* no-op */ }
            try {
                responseListener.current?.remove();
            } catch { /* no-op */ }
            notificationListener.current = null;
            responseListener.current = null;
        };
    }, [user, handleNotificationNavigation]);
}
