import { apiClientSafe } from '@/api/client';
import { QRScannerModal } from '@/components/shared/QRScannerModal';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/utils/toast-lazy';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AttendanceRegisterSchema } from '@lasmunecasderamon/validations';
import React,{ useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';

interface AttendanceRegisterResponse {
    success: boolean;
    alreadyRegistered?: boolean;
    message?: string;
}

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
    const {accentColor, bg, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface} = useAccentColor();
    const user = useAuthStore((state) => state.user);

    const [codigo, setCodigo] = useState('');
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (visible) {
                setShowScanner(false);
                setCodigo('');
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [visible]);

    const handleRegistrarConCodigo = async () => {
        const validation = AttendanceRegisterSchema.safeParse({ qrData: codigo });

        if (!validation.success) {
            showToast({
                type: 'error',
                text1: 'Error',
                text2: validation.error.issues[0]?.message || 'Por favor ingresa el código de asistencia'
            });
            return;
        }

        setLoading(true);
        try {
            const res = await apiClientSafe('/attendance/register', {
                method: 'POST',
                body: JSON.stringify({ qr_data: validation.data.qrData })
            });
            const attData = res as unknown as AttendanceRegisterResponse;

            if (attData.success) {
                if (attData.alreadyRegistered) {

                    showToast({
                        type: 'warning',
                        text1: 'âš ï¸ Ya tienes asistencia',
                        text2: attData.message || 'Ya tenías asistencia registrada hoy'
                    });
                    onRegistered();
                } else {

                    showToast({
                        type: 'success',
                        text1: 'âœ… Asistencia Registrada',
                        text2: attData.message || 'Tu asistencia ha sido registrada correctamente'
                    });
                    onRegistered();
                }
            } else {
                throw new Error(attData.message || 'Código inválido');
            }
        } catch (error: any) {
            showToast({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'No se pudo registrar la asistencia'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleQRScanned = async (data: string) => {
        const validation = AttendanceRegisterSchema.safeParse({ qrData: data });

        if (!validation.success) {
            showToast({
                type: 'error',
                text1: 'Error',
                text2: validation.error.issues[0]?.message || 'Código QR inválido'
            });
            setShowScanner(false);
            return;
        }

        setShowScanner(false);
        setLoading(true);
        try {
            const res = await apiClientSafe('/attendance/register', {
                method: 'POST',
                body: JSON.stringify({ qr_data: validation.data.qrData })
            });
            const attData = res as unknown as AttendanceRegisterResponse;

            if (attData.success) {
                if (attData.alreadyRegistered) {

                    showToast({
                        type: 'warning',
                        text1: 'âš ï¸ Ya tienes asistencia',
                        text2: attData.message || 'Ya tenías asistencia registrada hoy'
                    });
                    onRegistered();
                } else {

                    showToast({
                        type: 'success',
                        text1: 'âœ… Asistencia Registrada',
                        text2: attData.message || 'Tu asistencia ha sido registrada correctamente'
                    });
                    onRegistered();
                }
            } else {
                throw new Error(attData.message || 'Código QR inválido');
            }
        } catch (error: any) {
            showToast({
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
                avoidKeyboard={false}
                visible={visible && !showScanner}
                transparent
                animationType="slide"
                onRequestClose={onClose}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.overlay}
                >
                    <AnimatedView
                        from={{ translateY: 300, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 20 }}
                        style={[styles.modalContent, { backgroundColor: bg, maxHeight: '85%' }]}
                        accessibilityViewIsModal
                    >
                        <ScrollView
                            automaticallyAdjustKeyboardInsets
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            style={{ flexShrink: 1 }}
                            contentContainerStyle={{ paddingBottom: 4 }}
                        >
                        <View style={styles.header}>
                            <View style={[styles.iconCircle, { backgroundColor: `${accentColor}20` }]}>
                                <Ionicons name="calendar" size={24} color={accentOnSurface} />
                            </View>
                            <Text style={[styles.title, { color: textPrimary }]}>Registrar Asistencia</Text>
                            <Text style={[styles.subtitle, { color: textSecondary }]}>
                                Ingresa tu código o escanea el QR
                            </Text>
                        </View>

                        <View style={styles.userInfo}>
                            <View style={[styles.avatarSmall, { backgroundColor: accentColor }]}>
                                <Text style={styles.avatarText}>
                                    {user?.name?.[0]}{user?.lastName?.[0]}
                                </Text>
                            </View>
                            <View style={styles.userInfoText}>
                                <Text style={[styles.userName, { color: textPrimary }]}>
                                    {user?.name} {user?.lastName}
                                </Text>
                                <View style={[styles.roleBadge, { backgroundColor: `${accentColor}20` }]}>
                                    <Text style={[styles.roleText, { color: accentOnSurface }]}>{user?.role}</Text>
                                </View>
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
                                <Ionicons name="qr-code-outline" size={20} color="white" />
                            </View>
                            <Text style={[styles.qrBtnTitle, { color: textPrimary }]}>Escanear código QR</Text>
                            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                        </Pressable>

                        <Pressable
                            style={styles.skipBtn}
                            onPress={onRegistered}
                        >
                            <Text style={[styles.skipText, { color: textSecondary }]}>
                                Continuar sin asistencia
                            </Text>
                        </Pressable>
                        </ScrollView>
                    </AnimatedView>
                </KeyboardAvoidingView>
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
        borderTopLeftRadius: BorderRadius.card,
        borderTopRightRadius: BorderRadius.card,
        padding: 16,
        paddingBottom: 24,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(150,150,150,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 12,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontFamily: FontFamily.extrabold,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        gap: 10,
    },
    userInfoText: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontFamily: FontFamily.bold,
        fontSize: 13,
    },
    userName: {
        fontSize: 14,
        fontFamily: FontFamily.semibold,
        flexShrink: 1,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    roleText: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.bold,
    },
    inputSection: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontFamily: FontFamily.semibold,
        marginBottom: 6,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 14,
        height: 48,
        marginBottom: 12,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        fontFamily: FontFamily.semibold,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: BorderRadius.full,
        gap: 8,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 15,
        fontFamily: FontFamily.bold,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 12,
        fontSize: 12,
        fontFamily: FontFamily.semibold,
    },
    qrBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        padding: 12,
        gap: 10,
    },
    qrIconCircle: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrBtnTitle: {
        flex: 1,
        fontSize: 15,
        fontFamily: FontFamily.bold,
    },
    skipBtn: {
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 8,
    },
    skipText: {
        fontSize: 14,
        fontFamily: FontFamily.semibold,
    },
});


