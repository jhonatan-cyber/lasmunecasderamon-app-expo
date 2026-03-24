import React, { useEffect, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { useTimer } from "@/context/TimerContext";
import { PremiumAlert } from '@/components/ui/PremiumAlert';

export function GlobalTimerAlert() {
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: "info" | "success" | "warning" | "danger";
    }>({
        visible: false,
        title: "",
        message: "",
        type: "success",
    });

    const lastNotifiedId = useRef<number | null>(null);
    const { refreshTimers } = useTimer();

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener("refresh_sales", (data?: any) => {
            // Si es automático, mostrar el modal de aviso
            if (data?.automatic && data?.roomName) {
                // Evitar duplicados para el mismo ID de servicio
                if (data.servicioId && lastNotifiedId.current === data.servicioId) {
                    return;
                }
                lastNotifiedId.current = data.servicioId || null;

                setAlertConfig({
                    visible: true,
                    title: "Tiempo Agotado",
                    message: `El tiempo de la habitación ${data.roomName} ha terminado. El servicio ha finalizado.`,
                    type: "success",
                });
            }
        });
        return () => sub.remove();
    }, []);

    const handleConfirm = async () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        // Emitir eventos para actualizar las listas en cualquier pantalla
        DeviceEventEmitter.emit("timer_alert_closed");
        await refreshTimers();
    };

    return (
        <PremiumAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onConfirm={handleConfirm}
            showCancel={false}
            confirmText="Aceptar"
        />
    );
}


