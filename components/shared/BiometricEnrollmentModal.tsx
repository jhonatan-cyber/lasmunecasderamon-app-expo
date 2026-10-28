import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { showToast } from '@/utils/toast-lazy';
import { apiClientSafe } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuthStore } from '@/store/authStore';

type Phase = 'intro' | 'front' | 'turn-left' | 'turn-right' | 'processing';

export function BiometricEnrollmentModal({
    visible,
    onClose,
    onEnrolled,
}: {
    visible: boolean;
    onClose: () => void;
    onEnrolled: () => void;
}) {
    const setBiometricoFacialEnrolled = useAuthStore((state) => state.setBiometricoFacialEnrolled);
    const { accentColor } = useAccentColor();
    const [phase, setPhase] = useState<Phase>('intro');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fotos, setFotos] = useState<{ lado: string; foto: string }[]>([]);
    const [cameraActive, setCameraActive] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

    const needsCamera = phase === 'front' || phase === 'turn-left' || phase === 'turn-right';

    useEffect(() => {
        if (!visible) {
            return;
        }
        if (phase === 'intro') {
            return;
        }
        const timer = setTimeout(() => setCameraActive(true), 300);
        return () => clearTimeout(timer);
    }, [visible, phase]);

    const handleClose = useCallback(() => {
        if (loading) return;
        setPhase('intro');
        setFotos([]);
        onClose();
    }, [loading, onClose]);

    const enroll = useCallback(
        async (fotosCapturadas: { lado: string; foto: string }[]) => {
            const userId = useAuthStore.getState().user?.id;
            if (!userId) {
                throw new Error('No hay sesión activa.');
            }
            setLoading(true);
            try {
                const res = await apiClientSafe(`/users/${userId}/biometric`, {
                    method: 'PUT',
                    body: JSON.stringify({ facial: 1 }),
                });
                if (!res?.success) {
                    throw new Error(res?.message || 'No se pudo guardar el enrolamiento facial.');
                }
                const res2 = await apiClientSafe(`/users/${userId}/biometric`, {
                    method: 'POST',
                    body: JSON.stringify({}),
                });
                if (!res2?.success) {
                    throw new Error(res2?.message || 'No se pudo asignar el código de la persona.');
                }
                const res3 = await apiClientSafe(`/users/${userId}/biometric/captures`, {
                    method: 'POST',
                    body: JSON.stringify({ fotos: fotosCapturadas }),
                });
                if (!res3?.success) {
                    throw new Error(res3?.message || 'No se pudo guardar la captura facial.');
                }
                const frontal = fotosCapturadas.find(f => f.lado === 'frente') ?? fotosCapturadas[0];
                const res4 = await apiClientSafe(`/users/${userId}/biometric/verify`, {
                    method: 'POST',
                    body: JSON.stringify({ foto: frontal?.foto }),
                });
                if (res4 && !res4.success) {
                    throw new Error(res4.message || 'No se pudo verificar la captura facial.');
                }
                setBiometricoFacialEnrolled(true);
                onEnrolled();
            } catch (e) {
                const message = e instanceof Error ? e.message : 'Error al enrolar la biometría.';
                setError(message);
                setPhase('front');
                showToast({ type: 'error', text1: 'Error de Enrolamiento', text2: message });
            } finally {
                setLoading(false);
            }
        },
        [onEnrolled, setBiometricoFacialEnrolled]
    );

    const handleCapture = useCallback(async () => {
        if (loading) return;
        try {
            const photo = await cameraRef.current?.takePictureAsync?.({ base64: true, quality: 0.8 });
            const base64 = photo?.base64;
            if (!base64) {
                throw new Error('No se pudo capturar la imagen.');
            }
            const lado = phase === 'front' ? 'frente' : phase === 'turn-left' ? 'izquierda' : 'derecha';
            const nuevasFotos = [...fotos.filter((p) => p.lado !== lado), { lado, foto: base64 }];
            setFotos(nuevasFotos);
            if (phase === 'front') {
                setPhase('turn-left');
            } else if (phase === 'turn-left') {
                setPhase('turn-right');
            } else if (phase === 'turn-right') {
                await enroll(nuevasFotos);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'No se pudo capturar la imagen.';
            setError(message);
            showToast({ type: 'error', text1: 'Error de Captura', text2: message });
        }
    }, [enroll, fotos, loading, phase]);

    const handleStart = useCallback(() => {
        setError(null);
        setPhase('front');
    }, []);

    if (!visible) return null;
    if (!permission) return <View />;

    if (!permission.granted) {
        const canAskAgain = permission.canAskAgain ?? true;
        return (
            <Modal visible={visible} animationType="slide" transparent>
                <View style={styles.container}>
                    <View style={styles.permissionContent}>
                        <Ionicons name="camera" size={60} color="#60A5FA" />
                        <Text style={styles.title}>Permiso de Cámara</Text>
                        <Text style={styles.message}>
                            Necesitamos acceso a tu cámara para enrolar tu biometría.
                        </Text>
                        {canAskAgain ? (
                            <TouchableOpacity style={styles.btn} onPress={() => void requestPermission()}>
                                <Text style={styles.btnText}>Conceder Permiso</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.btn} onPress={onClose}>
                                <Text style={styles.btnText}>Cerrar</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    const stepTitle =
        phase === 'intro'
            ? 'Enrolar Biometría'
            : phase === 'front'
              ? 'Paso 1 de 3: Frente'
              : phase === 'turn-left'
                ? 'Paso 2 de 3: Izquierda'
                : phase === 'turn-right'
                  ? 'Paso 3 de 3: Derecha'
                  : 'Enrolando…';

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View style={styles.fullContainer}>
                {needsCamera && cameraActive ? (
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing="back"
                        active={true}
                        enableTorch={false}
                        autofocus="on"
                        zoom={0}
                        onCameraReady={() => undefined}
                    />
                ) : null}

                <View style={styles.overlay}>
                    <View style={styles.header}>
                        <Pressable onPress={handleClose} style={styles.backButton}>
                            <Ionicons name="close" size={28} color="#FFF" />
                        </Pressable>
                        <Text style={styles.headerTitle}>{stepTitle}</Text>
                        <View style={styles.headerRight} />
                    </View>

                    <View style={styles.scannerContainer}>
                        <View style={[styles.scannerFrame, { borderColor: accentColor }]} />
                    </View>

                    <View style={styles.footer}>
                        {phase === 'intro' ? (
                            <>
                                <Text style={styles.footerText}>
                                    Enrolá tu biometría para registrar tu asistencia sin lector.
                                </Text>
                                <TouchableOpacity style={styles.cerrarBtn} onPress={handleStart}>
                                    <Text style={styles.cerrarBtnText}>Empezar captura</Text>
                                </TouchableOpacity>
                            </>
                        ) : phase === 'processing' ? (
                            <View style={styles.processingBox}>
                                <ActivityIndicator size="large" color="#60A5FA" />
                                <Text style={styles.footerText}>Guardando enrolamiento…</Text>
                            </View>
                        ) : (
                            <>
                                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                                <Text style={styles.footerText}>
                                    {phase === 'front'
                                        ? 'Poné la cara frente a la cámara y capturá.'
                                        : phase === 'turn-left'
                                          ? 'Ahora girá a la izquierda.'
                                          : 'Ahora girá a la derecha.'}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.cerrarBtn, loading && { opacity: 0.5 }]}
                                    onPress={() => void handleCapture()}
                                    disabled={loading}
                                >
                                    <Text style={styles.cerrarBtnText}>
                                        {phase === 'turn-right' ? 'Capturar y finalizar' : 'Capturar'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                        <TouchableOpacity style={styles.cerrarBtn} onPress={handleClose} disabled={loading}>
                            <Text style={styles.cerrarBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fullContainer: { flex: 1, backgroundColor: '#000' },
    container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', paddingHorizontal: 24 },
    permissionContent: {
        backgroundColor: '#1E1B4B',
        borderRadius: 32,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    title: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 20, textAlign: 'center' },
    message: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22, marginBottom: 30 },
    btn: { backgroundColor: '#60A5FA', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 9999, width: '100%', alignItems: 'center' },
    btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    closeBtn: { marginTop: 15, padding: 10 },
    closeText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
    camera: { ...StyleSheet.absoluteFill },
    overlay: { flex: 1, justifyContent: 'space-between', paddingVertical: 60 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    backButton: { width: 44, height: 44, borderRadius: 9999, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    scannerContainer: { alignItems: 'center', justifyContent: 'center' },
    scannerFrame: { width: 280, height: 280, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
    footer: { paddingHorizontal: 40, gap: 10 },
    footerText: { color: '#FFF', textAlign: 'center', fontSize: 14, fontWeight: '600', lineHeight: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 15, borderRadius: 20 },
    cerrarBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 9999, alignItems: 'center', marginTop: 10 },
    cerrarBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    processingBox: { alignItems: 'center', gap: 12, paddingVertical: 20 },
    errorText: { color: '#F87171', textAlign: 'center', fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
