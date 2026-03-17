import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { apiClient } from '../api/client';
import { useAccentColor } from '../hooks/useAccentColor';
import { useAuthStore } from '../store/authStore';

export function PendingSolicitudesAlert({ isInline = false }: { isInline?: boolean }) {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const { accentColor, isDark, cardBg } = useAccentColor();
    
    const shake = useSharedValue(0);

    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name || '';
    const isCajeroOrAdmin = roleName.toLowerCase() === 'cajero' || roleName.toLowerCase() === 'administrador';

    const triggerShake = () => {
        shake.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
    };

    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shake.value }]
    }));

    const fetchCounts = useCallback(async () => {
        if (!isCajeroOrAdmin) return;
        setLoading(true);
        try {
            const res = await apiClient('/notifications/pending-count');
            if (res.success) {
                const newCount = res.totalCount || 0;
                if (newCount > pendingCount) {
                    triggerShake();
                }
                setPendingCount(newCount);
            }
        } catch (error) {
            console.error('[PendingSolicitudesAlert] Error fetching counts:', error);
        } finally {
            setLoading(false);
        }
    }, [isCajeroOrAdmin, pendingCount]);

    useEffect(() => {
        if (!isCajeroOrAdmin) return;

        fetchCounts();

        const sub = DeviceEventEmitter.addListener('refresh_requests', () => {
            fetchCounts();
        });

        const sseSub = DeviceEventEmitter.addListener('sse_event', (payload) => {
            const types = [
                'new_order', 'new_service_request', 
                'order_deleted', 'service_request_deleted',
                'order_updated', 'sale_created', 'service_request_approved'
            ];
            if (types.includes(payload.type)) {
                if (payload.type.startsWith('new_')) {
                    triggerShake();
                }
                fetchCounts();
            }
        });

        return () => {
            sub.remove();
            sseSub.remove();
        };
    }, [isCajeroOrAdmin, fetchCounts]);

    if (!isCajeroOrAdmin || pendingCount === 0) return null;

    return (
        <Animated.View 
            entering={FadeInDown} 
            exiting={FadeOutDown}
            style={[
                isInline ? styles.inlineContainer : styles.container, 
                { backgroundColor: cardBg, borderColor: accentColor },
                shakeStyle
            ]}
        >
            <MotiView
                from={{ opacity: 0.3, scale: 1 }}
                animate={{ opacity: 0, scale: 1.15 }}
                transition={{
                    type: 'timing',
                    duration: 2000,
                    loop: true,
                    repeatReverse: false,
                }}
                style={[StyleSheet.absoluteFill, { backgroundColor: accentColor, borderRadius: 24 }]}
            />
            
            <Pressable 
                style={styles.content}
                onPress={() => router.push('/cajero/solicitudes')}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name="alert-circle" size={24} color="#E11D48" />
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pendingCount}</Text>
                    </View>
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: isDark ? '#FFF' : '#111827' }]}>
                        SOLICITUDES PENDIENTES
                    </Text>
                    <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Atención requerida: {pendingCount} pedido(s)
                    </Text>
                </View>
                <MotiView
                    from={{ translateX: 0 }}
                    animate={{ translateX: 5 }}
                    transition={{
                        type: 'timing',
                        duration: 1000,
                        loop: true,
                        repeatReverse: true,
                    }}
                >
                    <Ionicons name="chevron-forward" size={20} color={isDark ? '#E11D48' : '#E11D48'} />
                </MotiView>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        borderRadius: 24,
        borderWidth: 1.5,
        elevation: 15,
        shadowColor: '#E11D48',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        overflow: 'hidden',
        zIndex: 1000,
    },
    inlineContainer: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        borderRadius: 24,
        borderWidth: 1.5,
        elevation: 10,
        shadowColor: '#E11D48',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(225, 29, 72, 0.05)',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: `20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#E11D48',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
        opacity: 0.9,
    }
});
