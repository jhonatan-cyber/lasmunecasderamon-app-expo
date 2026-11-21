import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, useWindowDimensions, ActivityIndicator } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { eventBus } from '@/utils/eventBus';
import { LazyQRCode } from '@/components/ui/LazyQRCode';
import { AnimatedView } from '@/components/ui/AnimatedView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiClientSafe } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { useAuthStore } from '@/store/authStore';
import { getUserRole, isAdminRole, isCajeroRole } from '@/utils/userRole';

import logger from '@/utils/logger';
export const AttendanceCodeDisplay = () => {
    const [codigo, setCodigo] = useState<string>('');
    const [showQR, setShowQR] = useState(false);
    const [loading, setLoading] = useState(false);
    const user = useAuthStore(state => state.user);
    const { width } = useWindowDimensions();

    const role = getUserRole(user);
    
    const canSeeCode = isAdminRole(user) || isCajeroRole(user);

    const fetchCodigo = useCallback(async () => {
        if (!canSeeCode) return;
        try {
            const res = await apiClientSafe('/code/current', {
                headers: {
                    'x-user-role': role
                }
            });
            if (res.success) {
                setCodigo((res as any).codigo);
            }
        } catch (error) {
            if (error instanceof Error && ['NetworkError', 'TimeoutError', 'UnauthorizedError'].includes(error.name)) {
                logger.warn('[AttendanceCodeDisplay] No se pudo cargar el código de asistencia', {
                    context: 'AttendanceCodeDisplay:fetchCodigo',
                    error: error.message,
                    name: error.name,
                });
                return;
            }

            logger.captureException(error, { context: 'AttendanceCodeDisplay:fetchCodigo' });
        }
    }, [canSeeCode, role]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchCodigo();
        }, 0);
        const subscription = eventBus.addListener('sse_event', (payload: any) => {
            if (payload.type === 'code_changed' && payload.data?.codigo) {
                setCodigo(payload.data.codigo);
            }
        });

        return () => {
            clearTimeout(timer);
            subscription.remove();
        };
    }, [fetchCodigo]);

    const {
        accentColor,
        isDark,
        cardBg,
        textPrimary,
        textSecondary,
        accentOnSurface } = useAccentColor();

    const handleOpenQR = async () => {
        setLoading(true);
        setShowQR(true);
        try {
            await fetchCodigo();
        } finally {
            setLoading(false);
        }
    };

    if (!canSeeCode) return null;

    const bgModal = isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.98)';

    return (
        <>
            <Pressable 
                onPress={handleOpenQR}
                style={({ pressed }) => [
                    styles.badge,
                    // El badge va sobre la página, no sobre el acento: usa el
                    // tinte del acento y el acento como texto legible.
                    { borderColor: accentColor, backgroundColor: `${accentColor}18` },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
                ]}
            >
                <Text style={[styles.label, { color: textSecondary }]}>Código: </Text>
                <Text style={[styles.code, { color: accentOnSurface }]}>{codigo || '****'}</Text>
            </Pressable>

            <Modal
                visible={showQR}
                transparent
                animationType="fade"
                onRequestClose={() => setShowQR(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: bgModal }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowQR(false)} />
                    {showQR && (
                            <AnimatedView
                                from={{ opacity: 0, scale: 0.8, translateY: 50 }}
                                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                transition={{ type: 'spring', damping: 20 }}
                                style={[styles.modalContent, { backgroundColor: cardBg }]}
                            >
                                <Pressable 
                                    style={styles.closeBtn} 
                                    onPress={() => setShowQR(false)}
                                >
                                    <Ionicons name="close" size={28} color={textPrimary} />
                                </Pressable>

                                <View style={styles.qrHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: `${accentColor}20` }]}>
                                        <Ionicons name="qr-code" size={32} color={accentOnSurface} />
                                    </View>
                                    <Text style={[styles.qrTitle, { color: textPrimary }]}>Código de Asistencia</Text>
                                    <Text style={[styles.qrSubtitle, { color: textSecondary }]}>
                                        Pide a tus compañeros que escaneen este código para regitrar su asistencia
                                    </Text>
                                </View>

                                <View style={styles.qrMain}>
                                    <View style={styles.qrWrapper}>
                                        {loading ? (
                                            <ActivityIndicator size="large" color={accentOnSurface} />
                                        ) : codigo ? (
                                            <LazyQRCode
                                                value={codigo}
                                                size={width * 0.7}
                                                color={accentOnSurface}
                                                backgroundColor="white"
                                                quietZone={10}
                                            />
                                        ) : (
                                            <Text style={{ color: textSecondary }}>No hay código activo</Text>
                                        )}
                                    </View>

                                    <View style={[styles.codeBadge, { borderColor: accentColor }]}>
                                        <Text style={[styles.codeLabel, { color: textSecondary }]}>CÓDIGO: </Text>
                                        <Text style={[styles.codeValue, { color: accentOnSurface }]}>{codigo || '----'}</Text>
                                    </View>
                                </View>

                                <View style={styles.qrFooter}>
                                    <Ionicons name="refresh-circle" size={16} color={accentOnSurface} />
                                    <Text style={[styles.footerText, { color: textSecondary }]}>
                                        Se actualiza automáticamente cada mañana
                                    </Text>
                                </View>
                            </AnimatedView>
                        )}
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 2,
    },
    label: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    code: {
        color: '#FFFFFF',
        fontSize: FontSize.lg,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    },
    
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: BorderRadius.full,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
    },
    qrHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    qrTitle: {
        fontSize: FontSize.xl,
        fontWeight: '900',
        marginBottom: 8,
    },
    qrSubtitle: {
        fontSize: FontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    qrMain: {
        alignItems: 'center',
        width: '100%',
    },
    qrWrapper: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 24,
        marginBottom: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 250,
        minWidth: 250,
    },
    codeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: BorderRadius.full,
        borderWidth: 2,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    codeLabel: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        letterSpacing: 1,
    },
    codeValue: {
        fontSize: FontSize.xl,
        fontWeight: '900',
        letterSpacing: 4,
        fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    },
    qrFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 30,
        opacity: 0.8,
    },
    footerText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    }
});

