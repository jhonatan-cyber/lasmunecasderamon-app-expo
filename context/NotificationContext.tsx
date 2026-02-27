import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import EventSource from 'react-native-sse';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { API_URL } from '../api/client';
import { PremiumAlert } from '../components/PremiumAlert';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotificationsAsync } from '../utils/pushNotifications';

interface NotificationContextType {
    // Aquí podemos agregar funciones como registrar para notificaciones push si fuera necesario
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Estilos vibrantes con colores sólidos según el tipo (Estilo Premium Full Color)
const toastConfig: ToastConfig = {
    success: (props) => (
        <BaseToast
            {...props}
            text1NumberOfLines={0}
            text2NumberOfLines={0}
            style={{
                borderLeftColor: '#064E3B', // Verde oscuro para el borde
                backgroundColor: '#10B981', // Emerald vibrante
                borderRadius: 24,
                minHeight: 80,
                width: '92%',
                alignSelf: 'center',
                borderLeftWidth: 10,
                elevation: 15,
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.4,
                shadowRadius: 20,
                paddingVertical: 12,
            }}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            text1Style={{
                fontSize: 18,
                fontWeight: '900',
                color: '#FFFFFF'
            }}
            text2Style={{
                fontSize: 14,
                color: '#ECFDF5',
                fontWeight: '700'
            }}
        />
    ),
    error: (props) => (
        <ErrorToast
            {...props}
            text1NumberOfLines={0}
            text2NumberOfLines={0}
            style={{
                borderLeftColor: '#7F1D1D', // Rojo oscuro para el borde
                backgroundColor: '#EF4444', // Rojo vibrante
                borderRadius: 24,
                minHeight: 80,
                width: '92%',
                alignSelf: 'center',
                borderLeftWidth: 10,
                elevation: 15,
                shadowColor: '#EF4444',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.4,
                shadowRadius: 20,
                paddingVertical: 12,
            }}
            text1Style={{
                fontSize: 18,
                fontWeight: '900',
                color: '#FFFFFF'
            }}
            text2Style={{
                fontSize: 14,
                color: '#FEE2E2',
                fontWeight: '700'
            }}
        />
    ),
    // Un tipo personalizado para pedidos nuevos con estilo full purple
    order: ({ text1, text2 }) => (
        <View style={{
            width: '94%',
            backgroundColor: '#8B5CF6', // Violeta vibrante
            borderRadius: 30,
            padding: 22,
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'center',
            borderLeftWidth: 12,
            borderLeftColor: '#5B21B6', // Púrpura más oscuro
            elevation: 20,
            shadowColor: '#8B5CF6',
            shadowOffset: { width: 0, height: 15 },
            shadowOpacity: 0.5,
            shadowRadius: 25,
        }}>
            <View style={{ marginRight: 18, backgroundColor: 'rgba(255, 255, 255, 0.25)', padding: 12, borderRadius: 18 }}>
                <Text style={{ fontSize: 28 }}>🛍️</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginBottom: 2 }}>{text1}</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#DDD6FE' }}>{text2}</Text>
            </View>
        </View>
    )
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const user = useAuthStore(state => state.user);
    const eventSourceRef = useRef<EventSource | null>(null);
    const [showPermissionModal, setShowPermissionModal] = React.useState(false);

    useEffect(() => {
        const checkPermission = async () => {
            if (Platform.OS === 'web' || !Device.isDevice || !user) return;

            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                setShowPermissionModal(true);
            } else {
                // Si ya tiene permiso, registrar el token normalmente
                registerForPushNotificationsAsync();
            }
        };

        checkPermission();
    }, [user]);

    useEffect(() => {
        // En SDK 53+, las notificaciones remotas no funcionan en Expo Go (Android).
        // Usamos require dinámico para evitar el error al cargar el módulo si estamos en Expo Go.
        const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

        if (isExpoGo) {
            console.warn('[Notifications] Estás ejecutando en Expo Go. Las notificaciones push (remotas) de Android no son compatibles en Expo Go desde el SDK 53. Para soporte completo de notificaciones, usa un "Development Build".');
        }

        const Notifications = require('expo-notifications');

        // Configuración de notificaciones locales (solo para alertas en primer plano)
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        // Solo conectar si el usuario tiene ID
        if (!user?.id) return;

        // Conectar a SSE
        const sseUrl = `${API_URL.replace('/api', '')}/api/notifications/sse`;
        console.log('[SSE] Conectando a:', sseUrl);

        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.addEventListener('open', () => {
            console.log('[SSE] Conexión abierta');
        });

        es.addEventListener('message', (event: any) => {
            if (!event.data) return;
            try {
                const payload = JSON.parse(event.data);
                console.log('[SSE] Evento recibido:', payload.type);
                handleServerEvent(payload);
            } catch (err) {
                console.error('[SSE] Error parseando mensaje:', err);
            }
        });

        es.addEventListener('error', (event) => {
            console.error('[SSE] Error de conexión:', event);
        });

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [user?.id]);

    const handleServerEvent = (payload: any) => {
        switch (payload.type) {
            case 'new_order':
                console.log('[SSE] Nuevo pedido:', payload.data);
                Toast.show({
                    type: 'order',
                    text1: '🔔 ¡Nuevo Pedido!',
                    text2: `${payload.data.codigo} - ${payload.data.cliente}`,
                    visibilityTime: 6000,
                    autoHide: true,
                    topOffset: 50,
                });
                showLocalNotification('Nuevo Pedido', `Se ha creado el pedido ${payload.data.codigo}`);
                break;
            case 'new_service_request':
                console.log('[SSE] Nueva solicitud de servicio:', payload.data);
                Toast.show({
                    type: 'order',
                    text1: '🛎️ Solicitud de Servicio',
                    text2: `ID: ${payload.data.id} - ${payload.data.descripcion || 'Sin descripción'}`,
                    visibilityTime: 5000,
                });
                showLocalNotification('Solicitud de Servicio', `Nueva solicitud: ${payload.data.descripcion}`);
                break;
            case 'timer_started':
                Toast.show({
                    type: 'success',
                    text1: '⏱️ Temporizador Iniciado',
                    text2: `Habitación: ${payload.data.habitacion_numero || payload.data.habitacion_id}`,
                });
                break;
            case 'timer_stopped':
                Toast.show({
                    type: 'error',
                    text1: '🛑 Temporizador Detenido',
                    text2: `La sesión en ${payload.data.habitacion_numero || payload.data.habitacion_id} ha finalizado.`,
                });
                break;
            case 'order_updated':
                if (payload.data.estado === 0) {
                    Toast.show({
                        type: 'success',
                        text1: 'Pedido Procesado',
                        text2: `El pedido ${payload.data.id} ha sido completado.`,
                    });
                }
                break;
            case 'ping':
                // Silencioso
                break;
        }
    };

    const showLocalNotification = async (title: string, body: string) => {
        try {
            const Notifications = require('expo-notifications');
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: { data: 'goes here' },
                },
                trigger: null, // instantánea
            });
        } catch (err) {
            console.warn('[Notifications] Error al programar notificación local:', err);
        }
    };

    return (
        <NotificationContext.Provider value={{}}>
            {children}
            <PremiumAlert
                visible={showPermissionModal}
                title="🔔 Activar Notificaciones"
                message="Para recibir pedidos y actualizaciones de servicios al instante, activa las notificaciones. Esto te permitirá responder mucho más rápido a tus clientes."
                confirmText="Activar Ahora"
                cancelText="Más Tarde"
                showCancel
                onConfirm={async () => {
                    setShowPermissionModal(false);
                    await registerForPushNotificationsAsync();
                }}
                onCancel={() => setShowPermissionModal(false)}
            />
            <Toast config={toastConfig} position="top" topOffset={60} />
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
