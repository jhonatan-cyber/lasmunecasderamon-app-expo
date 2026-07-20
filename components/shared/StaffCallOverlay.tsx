import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { eventBus } from '@/utils/eventBus';
import {
    ActivityIndicator,

    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { showToast } from '@/utils/toast-lazy';
import { apiClientSafe } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuthStore } from '@/store/authStore';
import { triggerNotificationEffects } from '@/services/pushNotifications';
import { getUserRole, isAdminRole, isCajeroRole, isGarzonRole, isHostessRole } from '@/utils/userRole';

import logger from '@/utils/logger';

interface PendingNotificationsResponse {
    success: boolean;
    notifications?: StaffCall[];
    data?: StaffCall[];
    message?: string;
}

interface StaffCall {
    id: number | string;
    anfitriona_id: number | string;
    anfitriona_nombre: string;
    anfitriona_nick: string;
    roomName: string;
    assistanceType: string;
    message?: string;
    timestamp: string;
    habitacion_nombre?: string; 
    anfitriona_nick_api?: string; 
}

export function StaffCallOverlay() {
    const user = useAuthStore((state) => state.user);
    const [pendingCalls, setPendingCalls] = useState<StaffCall[]>([]);
    const [accepting, setAccepting] = useState<number | string | null>(null);
    const { accentColor, isDark, cardBg } = useAccentColor();
    const safeRole = getUserRole(user);

    const isStaff = isGarzonRole(user) || isCajeroRole(user) || isAdminRole(user);
    const isHostess = isHostessRole(user);

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
            const res = await apiClientSafe('/notifications/pending');
            const pendingData = res as unknown as PendingNotificationsResponse;
            if (pendingData.success) {
                const pending = Array.isArray(pendingData.notifications) ? pendingData.notifications : Array.isArray(pendingData.data) ? pendingData.data : [];
                const mapped = pending.map(mapPendingCall);
                setPendingCalls(mapped);
            }
        } catch (error) {
            logger.captureException(error, { context: 'StaffCallOverlay:fetchPending' });
        }
    }, [isStaff, mapPendingCall]);

    useEffect(() => {
        if (!isStaff && !isHostess) {
            const timer = setTimeout(() => setPendingCalls([]), 0);
            return () => clearTimeout(timer);
        }

        const timers: (ReturnType<typeof setTimeout>)[] = [];
        if (isStaff) {
            const timer = setTimeout(() => {
                void fetchPending();
            }, 0);
            timers.push(timer);
        }

        
        const subscription = eventBus.addListener("sse_event", (payload: any) => {
            if (!payload) return;

            
            if ((payload.type === 'staff_call' || payload.type === 'assistance_request') && isStaff) {
                const callData = payload.type === 'assistance_request'
                    ? mapPendingCall(payload.data)
                    : payload.data;
                setPendingCalls(prev => {
                    
                    if (prev.find(c => c.id === callData.id)) return prev;

                    
                    const hostessName = callData.anfitriona_nick || 'Anfitriona';
                    const location = callData.roomName !== 'N/A' ? `en la habitación ${callData.roomName}` : 'en el salón';
                    const typeNormalized = (callData.assistanceType || '').toLowerCase().includes('general') ? 'atención' : (callData.assistanceType || '');
                    const voiceMessage = `Solicitud de asistencia. La anfitriona ${hostessName} se encuentra ${location} y solicita ${typeNormalized}.`;

                    triggerNotificationEffects("Solicitud de Personal", voiceMessage, safeRole, true);

                    return [callData, ...prev];
                });
            }

            
            else if (payload.type === 'staff_call_accepted') {
                if (isStaff) {
                    setPendingCalls(prev => prev.filter(c => c.id !== payload.data.id));
                }

                if (isHostess && payload.data.anfitriona_id === user?.id) {
                    logger.debug('[StaffCallOverlay] Asistencia aceptada por:', payload.data.atendido_por_nombre);
                }
            }
        });

        return () => {
            timers.forEach(clearTimeout);
            subscription.remove();
        };
    }, [isStaff, isHostess, fetchPending, mapPendingCall, safeRole, user?.id, user?.role]);

    const handleAccept = async (id: number | string) => {
        setAccepting(id);
        try {
            const now = new Date();
            const atendidoPorNombre =
                user?.name ||
                user?.username ||
                `${user?.name || ''} ${user?.lastName || ''}`.trim() ||
                'Staff';

            const res = await apiClientSafe('/notifications/assistance/accept', {
                method: 'POST',
                body: JSON.stringify({
                    id,
                    estado: 'atendido',
                    atendido_por_id: user?.id,
                    atendido_por_nombre: atendidoPorNombre,
                    fecha_atencion: now.toISOString().slice(0, 10),
                    hora_atencion: now.toTimeString().slice(0, 8),
                    atendido_en: now.toISOString(),
                })
            });

            if (res.success) {
                showToast({
                    type: 'success',
                    text1: 'Llamado atendido',
                    text2: `${atendidoPorNombre} • ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                });
                setPendingCalls(prev => prev.filter(c => c.id !== id));
            } else {
                showToast({ type: 'error', text1: 'Atención', text2: res.message });
                setPendingCalls(prev => prev.filter(c => c.id !== id));
            }
        } catch (error: any) {
            showToast({ type: 'error', text1: 'Error', text2: error.message });
            setPendingCalls(prev => prev.filter(c => c.id !== id));
        } finally {
            setAccepting(null);
        }
    };
    if ((!isStaff && !isHostess) || (isStaff && pendingCalls.length === 0) || (isHostess)) {
        
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
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
    }
});



