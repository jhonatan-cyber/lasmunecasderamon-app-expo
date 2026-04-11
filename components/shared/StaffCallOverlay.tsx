import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import EventSource from 'react-native-sse';
import Toast from 'react-native-toast-message';
import { API_URL, apiClient } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuthStore } from '@/store/authStore';
import { triggerNotificationEffects } from '@/services/pushNotifications';

interface StaffCall {
    id: number | string;
    anfitriona_id: number | string;
    anfitriona_nombre: string;
    anfitriona_nick: string;
    roomName: string;
    assistanceType: string;
    message?: string;
    timestamp: string;
    habitacion_nombre?: string; // from API GET
    anfitriona_nick_api?: string; // from API GET
}

export function StaffCallOverlay() {
    const user = useAuthStore((state) => state.user);
    const [pendingCalls, setPendingCalls] = useState<StaffCall[]>([]);
    const [accepting, setAccepting] = useState<number | string | null>(null);
    const { accentColor, isDark, cardBg } = useAccentColor();
    const sseRef = useRef<EventSource | null>(null);

    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name || '';
    const safeRole = roleName.toLowerCase();

    const isStaff = safeRole === 'garzon' || safeRole === 'cajero' || safeRole === 'administrador';
    const isHostess = safeRole === 'anfitriona';

    const mapPendingCall = useCallback((item: any): StaffCall => {
        let parsedData: any = {};
        const rawData = item?.data ?? item?.datos;

        if (typeof rawData === 'string') {
            try {
                parsedData = JSON.parse(rawData);
            } catch {
                parsedData = {};
            }
        } else if (rawData && typeof rawData === 'object') {
            parsedData = rawData;
        }

        return {
            id: item.id ?? item.id_notificacion,
            anfitriona_id: item.anfitriona_id ?? item.usuario_id ?? parsedData.anfitriona_id ?? '',
            anfitriona_nombre: item.anfitriona_nombre ?? item.titulo ?? 'Anfitriona',
            anfitriona_nick: item.anfitriona_nick ?? parsedData.anfitriona_nick ?? item.titulo ?? 'Anfitriona',
            roomName: item.habitacion_nombre ?? parsedData.roomName ?? 'N/A',
            assistanceType: item.tipo ?? parsedData.type ?? 'Asistencia',
            message: item.mensaje ?? parsedData.message,
            timestamp: item.fecha_crea ?? item.timestamp ?? new Date().toISOString(),
        };
    }, []);

    const fetchPending = useCallback(async () => {
        if (!isStaff) return;
        try {
            const res = await apiClient('/notifications/pending');
            if (res.success) {
                const pending = Array.isArray(res.notifications) ? res.notifications : Array.isArray(res.data) ? res.data : [];
                const mapped = pending.map(mapPendingCall);
                setPendingCalls(mapped);
            }
        } catch (error) {
            console.error('[StaffCallOverlay] Error fetching pending:', error);
        }
    }, [isStaff, mapPendingCall]);

    useEffect(() => {
        if (!isStaff && !isHostess) {
            setPendingCalls([]);
            if (sseRef.current) {
                sseRef.current.close();
                sseRef.current = null;
            }
            return;
        }

        if (isStaff) {
            fetchPending();
        }

        // Connect to SSE
        const sse = new EventSource(`${API_URL}/notifications/sse`);
        sseRef.current = sse;

        sse.addEventListener('message', (event) => {
            if (!event.data) return;
            try {
                const payload = JSON.parse(event.data);

                // Caso 1: Nuevo llamado (Solo para Staff)
                if ((payload.type === 'staff_call' || payload.type === 'assistance_request') && isStaff) {
                    const callData = payload.type === 'assistance_request'
                        ? mapPendingCall(payload.data)
                        : payload.data;
                    setPendingCalls(prev => {
                        // Evitar duplicados
                        if (prev.find(c => c.id === callData.id)) return prev;

                        // Efectos de sonido y vibración con prioridad
                        const hostessName = callData.anfitriona_nick || 'Anfitriona';
                        const location = callData.roomName !== 'N/A' ? `en la habitación ${callData.roomName}` : 'en el salón';
                        const typeNormalized = (callData.assistanceType || '').toLowerCase().includes('general') ? 'atención' : (callData.assistanceType || '');
                        const voiceMessage = `Solicitud de asistencia. La anfitriona ${hostessName} se encuentra ${location} y solicita ${typeNormalized}.`;

                        const userRole = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name || '';
                        triggerNotificationEffects("Solicitud de Personal", voiceMessage, userRole, true);

                        return [callData, ...prev];
                    });
                }

                // Caso 2: Llamado aceptado (Staff y Anfitrionas)
                else if (payload.type === 'staff_call_accepted') {
                    if (isStaff) {
                        setPendingCalls(prev => prev.filter(c => c.id !== payload.data.id));
                    }

                    if (isHostess && payload.data.anfitriona_id === user?.id) {
                        // Solo registramos en consola, sin notificar al usuario en UI
                        console.log('[StaffCallOverlay] Asistencia aceptada por:', payload.data.atendido_por_nombre);
                    }
                }
            } catch (e) {
                console.error('[StaffCallOverlay] SSE parse error:', e);
            }
        });

        sse.addEventListener('error', (e) => {
            console.warn('[StaffCallOverlay] SSE Error:', e);
        });

        return () => {
            sse.close();
        };
    }, [isStaff, isHostess, fetchPending, mapPendingCall, user?.id, user?.role]);

    const handleAccept = async (id: number | string) => {
        setAccepting(id);
        try {
            const res = await apiClient('/notifications/assistance/accept', {
                method: 'POST',
                body: JSON.stringify({ id })
            });

            if (res.success) {
                Toast.show({ type: 'success', text1: 'Llamado Aceptado', text2: 'Dirígete a atender' });
                setPendingCalls(prev => prev.filter(c => c.id !== id));
            } else {
                Toast.show({ type: 'error', text1: 'Atención', text2: res.message });
                setPendingCalls(prev => prev.filter(c => c.id !== id));
            }
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        } finally {
            setAccepting(null);
        }
    };

    if ((!isStaff && !isHostess) || (isStaff && pendingCalls.length === 0) || (isHostess)) {
        // Las anfitrionas no ven las tarjetas, solo escuchan los eventos.
        if (isHostess || pendingCalls.length === 0) return null;
    }

    return (
        <View style={styles.container}>
            {pendingCalls.map((call, index) => (
                <Animated.View
                    key={call.id}
                    entering={FadeInUp}
                    exiting={FadeOutUp}
                    style={[
                        styles.card,
                        {
                            backgroundColor: cardBg,
                            borderColor: '#E11D48',
                            zIndex: 1000 - index
                        }
                    ]}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.iconBox}>
                            <Ionicons name="notifications" size={20} color="#E11D48" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>
                                SOLICITUD DE PERSONAL
                            </Text>
                            <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {call.anfitriona_nick} • {call.roomName !== 'N/A' ? `Hab: ${call.roomName}` : 'Salón'}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.typeText, { color: isDark ? '#FFF' : '#333' }]}>
                        {call.assistanceType}{call.message ? `: ${call.message}` : ''}
                    </Text>

                    <Pressable
                        style={({ pressed }) => [
                            styles.btn,
                            {
                                backgroundColor: accentColor,
                                opacity: (pressed || accepting === call.id) ? 0.7 : 1
                            }
                        ]}
                        onPress={() => handleAccept(call.id)}
                        disabled={accepting !== null}
                    >
                        {accepting === call.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.btnText}>ACEPTAR Y ATENDER</Text>
                        )}
                    </Pressable>
                </Animated.View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        zIndex: 9999,
        gap: 10
    },
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 2,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: `20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
    },
    typeText: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 15,
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 8,
        borderRadius: 8,
    },
    btn: {
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
    }
});


