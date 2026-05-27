﻿import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { QRScannerModal } from '@/components/shared/QRScannerModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuthStore } from '@/store/authStore';

interface RegistroAsistenciaModalProps {
    visible: boolean;
    onClose: () => void;
    onRegistered: () => void;
}

export const RegistroAsistenciaModal: React.FC<RegistroAsistenciaModalProps> = ({
    visible,
    onClose,
    onRegistered
}) => {
    const { accentColor, isDark } = useAccentColor();
    const user = useAuthStore((state) => state.user);

    const [codigo, setCodigo] = useState('');
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    React.useEffect(() => {
        if (visible) {
            setShowScanner(false);
            setCodigo('');
        }
    }, [visible]);

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#111111' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.1)';

    const handleRegistrarConCodigo = async () => {
        if (!codigo.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Por favor ingresa el código de asistencia'
            });
            return;
        }

        setLoading(true);
        try {
            const res = await apiClient('/attendance/register', {
                method: 'POST',
                body: JSON.stringify({ qr_data: codigo.trim() })
            });

            if (res.success) {
                if (res.alreadyRegistered) {
                    // Ya tiene asistencia registrada hoy - cerrar modales porque el código ya fue usado
                    Toast.show({
                        type: 'warning',
                        text1: 'âš ï¸ Ya tienes asistencia',
                        text2: res.message || 'Ya tenías asistencia registrada hoy'
                    });
                    onRegistered(); // Cerrar los modales
                } else {
                    // Nueva asistencia registrada
                    Toast.show({
                        type: 'success',
                        text1: 'âœ… Asistencia Registrada',
                        text2: res.message || 'Tu asistencia ha sido registrada correctamente'
                    });
                    onRegistered();
                }
            } else {
                throw new Error(res.message || 'Código inválido');
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'No se pudo registrar la asistencia'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleQRScanned = async (data: string) => {
        setShowScanner(false);
        setLoading(true);
        try {
            const res = await apiClient('/attendance/register', {
                method: 'POST',
                body: JSON.stringify({ qr_data: data })
            });

if (res.success) {
                if (res.alreadyRegistered) {
                    // Ya tiene asistencia registrada hoy
                    Toast.show({
                        type: 'warning',
                        text1: 'âš ï¸ Ya tienes asistencia',
                        text2: res.message || 'Ya tenías asistencia registrada hoy'
                    });
                    onRegistered(); // Cerrar los modales
                } else {
                    // Nueva asistencia registrada
                    Toast.show({
                        type: 'success',
                        text1: 'âœ… Asistencia Registrada',
                        text2: res.message || 'Tu asistencia ha sido registrada correctamente'
                    });
onRegistered();
                }
            } else {
                throw new Error(res.message || 'Código QR inválido');
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'No se pudo registrar la asistencia'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal
                visible={visible && !showScanner}
                transparent
                animationType="slide"
                onRequestClose={onClose}
            >
                <View style={styles.overlay}>
                    <MotiView 
                        from={{ translateY: 300, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 20 }}
                        style={[styles.modalContent, { backgroundColor: bg }]}
                    >
                        <View style={styles.header}>
                            <View style={[styles.iconCircle, { backgroundColor: `${accentColor}20` }]}>
                                <Ionicons name="calendar" size={32} color={accentColor} />
                            </View>
                            <Text style={[styles.title, { color: textPrimary }]}>Registrar Asistencia</Text>
                            <Text style={[styles.subtitle, { color: textSecondary }]}>
                                Ingresa tu código o escanea el QR para registrar tu asistencia
                            </Text>
                        </View>

                        <View style={styles.userInfo}>
                            <View style={[styles.avatarSmall, { backgroundColor: accentColor }]}>
                                <Text style={styles.avatarText}>
                                    {user?.name?.[0]}{user?.lastName?.[0]}
                                </Text>
                            </View>
                            <Text style={[styles.userName, { color: textPrimary }]}>
                                {user?.name} {user?.lastName}
                            </Text>
                            <View style={[styles.roleBadge, { backgroundColor: `${accentColor}20` }]}>
                                <Text style={[styles.roleText, { color: accentColor }]}>{user?.role}</Text>
                            </View>
                        </View>

                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: textSecondary }]}>Código de Asistencia</Text>
                            <View style={[styles.inputContainer, { backgroundColor: cardBg, borderColor }]}>
                                <Ionicons name="key-outline" size={20} color={textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: textPrimary }]}
                                    placeholder="Ingresa el código"
                                    placeholderTextColor={textSecondary}
                                    value={codigo}
                                    onChangeText={setCodigo}
                                    autoCapitalize="characters"
                                />
                            </View>
                            <Pressable
                                style={[styles.submitBtn, { backgroundColor: accentColor }]}
                                onPress={handleRegistrarConCodigo}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="white" />
                                        <Text style={styles.submitBtnText}>Confirmar</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>

                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                            <Text style={[styles.dividerText, { color: textSecondary }]}>O</Text>
                            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                        </View>

                        <Pressable
                            style={[styles.qrBtn, { borderColor }]}
                            onPress={() => setShowScanner(true)}
                        >
                            <View style={[styles.qrIconCircle, { backgroundColor: accentColor }]}>
                                <Ionicons name="qr-code-outline" size={24} color="white" />
                            </View>
                            <View style={styles.qrBtnText}>
                                <Text style={[styles.qrBtnTitle, { color: textPrimary }]}>Escanear QR</Text>
                                <Text style={[styles.qrBtnSubtitle, { color: textSecondary }]}>
                                    Apunta al código QR del cajero
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={textSecondary} />
                        </Pressable>

                        <Pressable 
                            style={[styles.skipBtn, { borderColor }]}
                            onPress={onRegistered}
                        >
                            <Text style={[styles.skipText, { color: textSecondary }]}>
                                Continuar sin asistencia
                            </Text>
                        </Pressable>
                    </MotiView>
                </View>
            </Modal>

            <QRScannerModal
                visible={showScanner}
                onClose={() => setShowScanner(false)}
                onScanned={async (data) => {
                    await handleQRScanned(data);
                    setShowScanner(false);
                    onRegistered();
                }}
            />
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(150,150,150,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        gap: 10,
    },
    avatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleText: {
        fontSize: 11,
        fontWeight: '700',
    },
    inputSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '600',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: 9999,
        gap: 8,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 13,
        fontWeight: '600',
    },
    qrBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 9999,
        padding: 16,
    },
    qrIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrBtnText: {
        flex: 1,
        marginLeft: 14,
    },
    qrBtnTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    qrBtnSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    skipBtn: {
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 12,
    },
    skipText: {
        fontSize: 15,
        fontWeight: '600',
    },
});


