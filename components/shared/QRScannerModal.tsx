import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';

const ZOOM_NORMAL = 0;
const ZOOM_MACRO = 0.15;

export const QRScannerModal = ({
    visible,
    onClose,
    onScanned
}: {
    visible: boolean;
    onClose: () => void;
    onScanned: (data: string) => Promise<void> | void;
}) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [torch, setTorch] = useState(false);
    const [zoom, setZoom] = useState(ZOOM_NORMAL);
    const [cameraActive, setCameraActive] = useState(false);
    const [codigo, setCodigo] = useState<string>('');
    const { accentColor } = useAccentColor();
    const timerRef = useRef<any>(null);

    const fetchCodigo = useCallback(async () => {
        try {
            const res = await apiClient('/codigo/actual');
            if (res.success) setCodigo(res.codigo);
        } catch {}
    }, []);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            if (visible) {
                setScanning(false);
                setLoading(false);
                setTorch(false);
                setZoom(ZOOM_NORMAL);
                void fetchCodigo();
                timerRef.current = setTimeout(() => setCameraActive(true), 300);
            } else {
                setCameraActive(false);
            }
        }, 0);
        return () => {
            clearTimeout(timer);
            clearTimeout(timerRef.current);
        };
    }, [visible, fetchCodigo]);

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
                            Necesitamos acceso a tu cámara para escanear el código QR de asistencia.
                        </Text>
                        {canAskAgain ? (
                            <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                                <Text style={styles.btnText}>Conceder Permiso</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <Text style={styles.message}>
                                    El permiso fue denegado. Actívalo desde Ajustes para poder escanear.
                                </Text>
                                <TouchableOpacity
                                    style={styles.btn}
                                    onPress={() => {
                                        Linking.openSettings().catch(() => {
                                            Toast.show({
                                                type: 'error',
                                                text1: 'No se pudo abrir Ajustes',
                                                text2: 'Abre Ajustes manualmente y habilita la cámara para esta app.'
                                            });
                                        });
                                    }}
                                >
                                    <Text style={styles.btnText}>Abrir Ajustes</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanning || loading) return;
        setScanning(true);
        
        if (Haptics.notificationAsync) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            const trimmed = (data ?? '').trim();
            if (!trimmed) {
                throw new Error('QR vacío o ilegible.');
            }
            onClose(); // Cerrar modal antes de procesar
            await onScanned(trimmed);
        } catch (error: any) {
            // Mostrar error y cerrar modal
            onClose();
            Toast.show({
                type: 'error',
                text1: 'Error de Lectura',
                text2: error.message || 'No se pudo procesar el código QR.'
            });
        }
    };

    const handleZoomToggle = () => {
        setZoom(zoom === ZOOM_NORMAL ? ZOOM_MACRO : ZOOM_NORMAL);
    };

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View style={styles.fullContainer}>
                {cameraActive && (
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        onBarcodeScanned={handleBarCodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        enableTorch={torch}
                        autofocus="on"
                        zoom={zoom}
                    />
                )}

                <View style={styles.overlay}>
                    <View style={styles.header}>
                        <Pressable onPress={onClose} style={styles.backButton}>
                            <Ionicons name="close" size={28} color="#FFF" />
                        </Pressable>
                        <Text style={styles.headerTitle}>Escaneando QR</Text>
                        <View style={styles.headerRight}>
                            <Pressable
                                onPress={handleZoomToggle}
                                style={[
                                    styles.backButton,
                                    zoom > 0 && { backgroundColor: '#34D399' },
                                    { marginRight: 8 }
                                ]}
                            >
                                <Ionicons name="search" size={24} color="#FFF" />
                            </Pressable>
                            <Pressable
                                onPress={() => setTorch(prev => !prev)}
                                style={[styles.backButton, torch && { backgroundColor: '#FBBF24' }]}
                            >
                                <Ionicons
                                    name={torch ? 'flashlight' : 'flashlight-outline'}
                                    size={24}
                                    color="#FFF"
                                />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.scannerContainer}>
                        <MotiView
                            from={{ scale: 0.9, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ loop: true, duration: 2000, type: 'timing' }}
                            style={styles.scannerFrame}
                        >
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                            {loading && <ActivityIndicator size="large" color="#60A5FA" />}
                        </MotiView>
                    </View>

                    <View style={styles.footer}>
                        {codigo ? (
                            <View style={[styles.codigoBadge, { borderColor: accentColor }]}>
                                <Text style={styles.codigoLabel}>Código: </Text>
                                <Text style={[styles.codigoValue, { color: accentColor }]}>{codigo}</Text>
                            </View>
                        ) : null}
                        <Text style={styles.footerText}>
                            {zoom > 0
                                ? 'Modo macro activo. Aleja el QR unos 10â€“15 cm.'
                                : 'Apunta al código QR a unos 15â€“25 cm de distancia.'}
                        </Text>
                        <TouchableOpacity style={styles.cerrarBtn} onPress={onClose}>
                            <Text style={styles.cerrarBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 40,
    },
    permissionContent: {
        backgroundColor: '#1E1B4B',
        borderRadius: 32,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '900',
        marginTop: 20,
        textAlign: 'center',
    },
    message: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
        marginBottom: 30,
    },
    btn: {
        backgroundColor: '#60A5FA',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 9999,
        width: '100%',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    closeBtn: {
        marginTop: 15,
        padding: 10,
    },
    closeText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontWeight: '600',
    },
    camera: {
        ...StyleSheet.absoluteFill,
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 9999,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    scannerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scannerFrame: {
        width: 280,
        height: 280,
        borderWidth: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#60A5FA',
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderBottomWidth: 0,
        borderRightWidth: 0,
        borderTopLeftRadius: 20,
    },
    topRight: {
        top: 0,
        right: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderTopRightRadius: 20,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomLeftRadius: 20,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderBottomRightRadius: 20,
    },
    footer: {
        paddingHorizontal: 40,
        gap: 10,
    },
    codigoBadge: {
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    codigoLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
        fontWeight: '600',
    },
    codigoValue: {
        fontSize: 22,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    },
    footerText: {
        color: '#FFF',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 15,
        borderRadius: 20,
    },
    cerrarBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 9999,
        alignItems: 'center',
        marginTop: 10,
    },
    cerrarBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

