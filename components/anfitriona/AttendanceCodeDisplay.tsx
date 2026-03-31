import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, DeviceEventEmitter, Pressable, Modal, useWindowDimensions, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuthStore } from '@/store/authStore';

export const AttendanceCodeDisplay = () => {
    const [codigo, setCodigo] = useState<string>('');
    const [showQR, setShowQR] = useState(false);
    const [loading, setLoading] = useState(false);
    const user = useAuthStore(state => state.user);
    const { width } = useWindowDimensions();

    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name || '';
    const role = roleName.toLowerCase();
    // Mostrar el código QR a administradores y cajeros
    const canSeeCode = role.includes('administrador') || role.includes('cajero');

    const fetchCodigo = useCallback(async () => {
        if (!canSeeCode) return;
        try {
            const res = await apiClient('/codigo/actual', {
                headers: {
                    'x-user-role': role
                }
            });
            if (res.success) {
                setCodigo(res.codigo);
            }
        } catch (error) {
            console.error('Error fetching attendance code:', error);
        }
    }, [canSeeCode, role]);

    useEffect(() => {
        fetchCodigo();
        
        const subscription = DeviceEventEmitter.addListener('sse_event', (payload: any) => {
            if (payload.type === 'code_changed' && payload.data?.codigo) {
                setCodigo(payload.data.codigo);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [fetchCodigo]);

    const { accentColor, isDark } = useAccentColor();

    const handleOpenQR = async () => {
        setLoading(true);
        setShowQR(true);
        await fetchCodigo();
        setLoading(false);
    };

    if (!canSeeCode) return null;

    const bgModal = isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.98)';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <>
            <Pressable 
                onPress={handleOpenQR}
                style={({ pressed }) => [
                    styles.badge, 
                    { borderColor: accentColor },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
                ]}
            >
                <Text style={styles.label}>Código: </Text>
                <Text style={styles.code}>{codigo || '****'}</Text>
            </Pressable>

            <Modal
                visible={showQR}
                transparent
                animationType="fade"
                onRequestClose={() => setShowQR(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: bgModal }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowQR(false)} />
                    
                    <AnimatePresence>
                        {showQR && (
                            <MotiView
                                from={{ opacity: 0, scale: 0.8, translateY: 50 }}
                                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                exit={{ opacity: 0, scale: 0.8, translateY: 50 }}
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
                                        <Ionicons name="qr-code" size={32} color={accentColor} />
                                    </View>
                                    <Text style={[styles.qrTitle, { color: textPrimary }]}>Código de Asistencia</Text>
                                    <Text style={[styles.qrSubtitle, { color: textSecondary }]}>
                                        Pide a tus compañeros que escaneen este código para regitrar su asistencia
                                    </Text>
                                </View>

                                <View style={styles.qrMain}>
                                    <View style={styles.qrWrapper}>
                                        {loading ? (
                                            <ActivityIndicator size="large" color={accentColor} />
                                        ) : codigo ? (
                                            <QRCode
                                                value={codigo}
                                                size={width * 0.7}
                                                color={accentColor}
                                                backgroundColor="white"
                                                quietZone={10}
                                            />
                                        ) : (
                                            <Text style={{ color: textSecondary }}>No hay código activo</Text>
                                        )}
                                    </View>

                                    <View style={[styles.codeBadge, { borderColor: accentColor }]}>
                                        <Text style={[styles.codeLabel, { color: textSecondary }]}>CÓDIGO: </Text>
                                        <Text style={[styles.codeValue, { color: accentColor }]}>{codigo || '----'}</Text>
                                    </View>
                                </View>

                                <View style={styles.qrFooter}>
                                    <Ionicons name="refresh-circle" size={16} color={accentColor} />
                                    <Text style={[styles.footerText, { color: textSecondary }]}>
                                        Se actualiza automáticamente cada mañana
                                    </Text>
                                </View>
                            </MotiView>
                        )}
                    </AnimatePresence>
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
        borderRadius: 10,
        borderWidth: 1.5,
    },
    label: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '600',
    },
    code: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 32,
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
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    qrTitle: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 8,
    },
    qrSubtitle: {
        fontSize: 14,
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
        borderRadius: 16,
        borderWidth: 2,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    codeLabel: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
    codeValue: {
        fontSize: 32,
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
        fontSize: 12,
        fontWeight: '600',
    }
});

