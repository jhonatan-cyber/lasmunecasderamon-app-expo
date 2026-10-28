import { styles } from "./BiometricEnrollmentModal.styles";
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { showToast } from '@/utils/toast-lazy';
import { apiClientSafe } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuthStore } from '@/store/authStore';
import {
    LADOS,
    detectorFacialDisponible,
    giroSuficiente,
    medirGiroDesdeFoto,
    progresoGiro,
    type FaseCaptura,
    type MedicionGiro,
} from '@/components/shared/biometric/deteccionGiro';
import {
    PASOS,
    esFaseCaptura,
    type EstadoDeteccion,
    type Phase,
    type TipoError,
} from '@/components/shared/biometric/captureConfig';
import { BiometricPermissionScreen } from '@/components/shared/biometric/BiometricPermissionScreen';
import { BiometricSteps } from '@/components/shared/biometric/BiometricSteps';
import { BiometricCameraStage } from '@/components/shared/biometric/BiometricCameraStage';
import { BiometricInfoPanel } from '@/components/shared/biometric/BiometricInfoPanel';

interface Foto {
    lado: string;
    foto: string;
}

/** Sin detector nativo, se mantiene la captura temporizada de antes. */
export const SEGUNDOS_SIN_DETECTOR = 4;

/** Espera entre fotos de comprobación durante la detección. */
export const PAUSA_DETECCION_MS = 700;
/** Tiempo máximo por paso antes de ofrecer reintentar. */
export const ESPERA_MAXIMA_MS = 20_000;
/** Pausa para que se vea el acierto antes de tomar la foto buena. */
const PAUSA_ACEPTADO_MS = 450;
/** Lecturas fallidas seguidas antes de rendirse y capturar por tiempo. */
const FALLOS_PARA_TEMPORIZADO = 3;

/** Frases que se reproducen por voz al entrar a cada paso. */
export const INSTRUCCIONES: Record<FaseCaptura, string> = {
    front: 'Mire de frente',
    'turn-left': 'Gire a la izquierda',
    'turn-right': 'Gire a la derecha',
};

const RECORDATORIOS: Record<FaseCaptura, string> = {
    front: 'Mire de frente a la cámara',
    'turn-left': 'Gire un poco más a la izquierda',
    'turn-right': 'Gire un poco más a la derecha',
};

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
    const [errorTipo, setErrorTipo] = useState<TipoError | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [pose, setPose] = useState<{ rostro: boolean; yaw: number | null } | null>(null);
    const [estado, setEstado] = useState<EstadoDeteccion>('buscando');
    const [progreso, setProgreso] = useState(0);
    const [restante, setRestante] = useState(SEGUNDOS_SIN_DETECTOR);
    // Si el APK no trae el detector nativo, se captura por tiempo.
    const [sinDetector, setSinDetector] = useState(false);
    // Paso al que vuelve el botón de reintento; nunca se reinicia el set entero.
    const [pasoReintento, setPasoReintento] = useState<FaseCaptura>('front');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const fotosRef = useRef<Foto[]>([]);
    const capturandoRef = useRef(false);

    const fase = esFaseCaptura(phase) ? phase : null;

    const limpiarPaso = useCallback(() => {
        setPose(null);
        setProgreso(0);
        setEstado('buscando');
        setRestante(SEGUNDOS_SIN_DETECTOR);
    }, []);

    const reiniciarTodo = useCallback(() => {
        fotosRef.current = [];
        setError(null);
        setErrorTipo(null);
        limpiarPaso();
    }, [limpiarPaso]);

    const fallar = useCallback((mensaje: string, tipo: TipoError, paso: FaseCaptura) => {
        setError(mensaje);
        setErrorTipo(tipo);
        setPasoReintento(paso);
        setPhase('error');
        showToast({ type: 'error', text1: 'Enrolamiento', text2: mensaje });
    }, []);

    const enroll = useCallback(
        async (fotosCapturadas: Foto[]) => {
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
                const frontal = fotosCapturadas.find((f) => f.lado === 'frente') ?? fotosCapturadas[0];
                const res4 = await apiClientSafe(`/users/${userId}/biometric/verify`, {
                    method: 'POST',
                    body: JSON.stringify({ foto: frontal?.foto }),
                });
                if (res4 && !res4.success) {
                    throw new Error(res4.message || 'No se pudo verificar la captura facial.');
                }
                setBiometricoFacialEnrolled(true);
                reiniciarTodo();
                setCameraActive(false);
                setCameraReady(false);
                setPhase('intro');
                onEnrolled();
            } catch (e) {
                const mensaje = e instanceof Error ? e.message : 'Error al enrolar la biometría.';
                // La foto frontal y la izquierda ya están bien: se reintenta sólo
                // la última y el guardado, sin repetir los tres pasos.
                fallar(mensaje, 'enrolamiento', 'turn-right');
            } finally {
                setLoading(false);
            }
        },
        [fallar, onEnrolled, reiniciarTodo, setBiometricoFacialEnrolled]
    );

    /** Toma la foto que se guarda como plantilla y avanza de paso. */
    const capturarFinal = useCallback(
        async (paso: FaseCaptura) => {
            if (capturandoRef.current) return;
            capturandoRef.current = true;
            try {
                const foto = await cameraRef.current?.takePictureAsync({
                    base64: true,
                    quality: 0.8,
                    shutterSound: false,
                });
                const base64 = foto?.base64;
                if (!base64) {
                    throw new Error('No se pudo capturar la imagen.');
                }
                const lado = LADOS[paso];
                fotosRef.current = [
                    ...fotosRef.current.filter((f) => f.lado !== lado),
                    { lado, foto: base64 },
                ];
                setError(null);
                setErrorTipo(null);
                if (paso === 'front') {
                    limpiarPaso();
                    setPhase('turn-left');
                } else if (paso === 'turn-left') {
                    limpiarPaso();
                    setPhase('turn-right');
                } else {
                    setPhase('processing');
                    await enroll(fotosRef.current);
                }
            } catch (e) {
                const mensaje = e instanceof Error ? e.message : 'No se pudo capturar la imagen.';
                fallar(mensaje, 'captura', paso);
            } finally {
                capturandoRef.current = false;
            }
        },
        [enroll, fallar, limpiarPaso]
    );

    // La voz se corta si el modal se desmonta con una indicación sonando.
    useEffect(() => {
        return () => {
            void Speech.stop();
        };
    }, []);

    // La cámara se monta con un respiro para que el modal termine de abrirse.
    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => setCameraActive(true), 250);
        return () => clearTimeout(timer);
    }, [visible]);

    // Si el equipo no emite `onCameraReady`, el flujo no se queda esperando.
    useEffect(() => {
        if (!cameraActive || cameraReady) return;
        const timer = setTimeout(() => setCameraReady(true), 4000);
        return () => clearTimeout(timer);
    }, [cameraActive, cameraReady]);

    // Detección de la pose + captura automática: no hay botón que pulsar.
    useEffect(() => {
        if (!visible || !fase || !cameraReady) return;
        let cancelado = false;
        const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

        const hablar = (texto: string) => {
            try {
                Speech.speak(texto, { language: 'es-ES', rate: 0.9, pitch: 1.0 });
            } catch {
                // Sin motor de voz queda la indicación escrita.
            }
        };

        const correr = async () => {
            hablar(INSTRUCCIONES[fase]);

            if (sinDetector) {
                for (let segundos = SEGUNDOS_SIN_DETECTOR; segundos > 0; segundos -= 1) {
                    if (cancelado) return;
                    setEstado('temporizado');
                    setRestante(segundos);
                    setProgreso((SEGUNDOS_SIN_DETECTOR - segundos) / SEGUNDOS_SIN_DETECTOR);
                    await esperar(1000);
                }
                if (cancelado) return;
                setRestante(0);
                await capturarFinal(fase);
                return;
            }

            const inicio = Date.now();
            let intentos = 0;
            let fallos = 0;

            while (!cancelado) {
                await esperar(PAUSA_DETECCION_MS);
                if (cancelado) return;
                intentos += 1;

                let medicion: MedicionGiro;
                try {
                    const chequeo = await cameraRef.current?.takePictureAsync({
                        quality: 0.25,
                        base64: false,
                        shutterSound: false,
                    });
                    if (cancelado) return;
                    if (!chequeo?.uri) {
                        fallos += 1;
                        if (fallos >= FALLOS_PARA_TEMPORIZADO) {
                            setSinDetector(true);
                            return;
                        }
                        if (Date.now() - inicio > ESPERA_MAXIMA_MS) {
                            fallar(
                                'La cámara no está entregando imágenes. Cerrá y volvé a intentar.',
                                'captura',
                                fase
                            );
                            return;
                        }
                        continue;
                    }
                    medicion = await medirGiroDesdeFoto(chequeo.uri);
                } catch {
                    medicion = { disponible: true, rostro: false, yaw: null, fallo: true };
                }
                if (cancelado) return;

                if (!medicion.disponible) {
                    setSinDetector(true);
                    return;
                }

                setPose({ rostro: medicion.rostro, yaw: medicion.yaw });

                if (giroSuficiente(fase, medicion.yaw)) {
                    setProgreso(1);
                    setEstado('ok');
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                        () => undefined
                    );
                    await esperar(PAUSA_ACEPTADO_MS);
                    if (cancelado) return;
                    await capturarFinal(fase);
                    return;
                }

                fallos = medicion.fallo ? fallos + 1 : 0;
                if (fallos >= FALLOS_PARA_TEMPORIZADO) {
                    setSinDetector(true);
                    return;
                }

                setProgreso(progresoGiro(fase, medicion.yaw));
                setEstado(medicion.rostro ? 'girando' : 'buscando');
                if (intentos % 4 === 0) {
                    hablar(
                        medicion.rostro ? RECORDATORIOS[fase] : 'Acercá tu cara al círculo'
                    );
                }

                if (Date.now() - inicio > ESPERA_MAXIMA_MS) {
                    fallar(
                        'No pudimos confirmar el giro. Probá con más luz y mirando a la cámara.',
                        'deteccion',
                        fase
                    );
                    return;
                }
            }
        };

        void correr();
        return () => {
            cancelado = true;
        };
    }, [visible, fase, cameraReady, sinDetector, capturarFinal, fallar]);

    const handleClose = useCallback(() => {
        if (loading) return;
        void Speech.stop();
        reiniciarTodo();
        setCameraActive(false);
        setCameraReady(false);
        setPhase('intro');
        onClose();
    }, [loading, onClose, reiniciarTodo]);

    const handleRetry = useCallback(() => {
        reiniciarTodo();
        setPhase(pasoReintento);
    }, [pasoReintento, reiniciarTodo]);

    const handleStart = useCallback(() => {
        reiniciarTodo();
        setSinDetector(!detectorFacialDisponible());
        setPhase('front');
    }, [reiniciarTodo]);

    const handleSaltar = useCallback(() => {
        void Speech.stop();
        setError(null);
        setErrorTipo(null);
        void capturarFinal(pasoReintento);
    }, [capturarFinal, pasoReintento]);

    const textoEstado = useMemo(() => {
        if (sinDetector) {
            return restante > 0 ? `Se captura sola en ${restante}…` : 'Capturando…';
        }
        if (estado === 'ok') return '¡Perfecto!';
        if (!pose?.rostro) return 'Acercá tu cara al círculo';
        return fase === 'front' ? 'Mirá de frente a la cámara' : 'Seguí girando un poco';
    }, [estado, fase, pose, restante, sinDetector]);

    const estadoColor = estado === 'ok' ? '#34D399' : 'rgba(255,255,255,0.78)';
    const estadoIcono: React.ComponentProps<typeof Ionicons>['name'] =
        estado === 'ok'
            ? 'checkmark-circle'
            : sinDetector
              ? 'timer-outline'
              : pose?.rostro
                ? 'sync-outline'
                : 'person-circle-outline';

    const colorAnillo = estado === 'ok' ? '#34D399' : accentColor;
    const indiceActual = fase
        ? PASOS[fase].numero - 1
        : phase === 'processing'
          ? 3
          : phase === 'error'
            ? PASOS[pasoReintento].numero - 1
            : -1;

    if (!visible) return null;
    if (!permission) return <View />;

    if (!permission.granted) {
        return (
            <BiometricPermissionScreen
                visible={visible}
                accentColor={accentColor}
                canAskAgain={permission.canAskAgain ?? true}
                onRequestPermission={() => void requestPermission()}
                onClose={onClose}
            />
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View style={styles.root}>
                <LinearGradient
                    colors={['rgba(5,7,13,0.96)', 'rgba(5,7,13,0.35)', 'transparent']}
                    style={styles.gradient}
                    pointerEvents="none"
                />

                <View style={styles.header}>
                    <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Enrolamiento facial</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <BiometricSteps currentIndex={indiceActual} accentColor={accentColor} />

                <BiometricCameraStage
                    cameraActive={cameraActive}
                    cameraRef={cameraRef}
                    fase={fase}
                    accentColor={accentColor}
                    colorAnillo={colorAnillo}
                    progreso={progreso}
                    estado={estado}
                    processing={phase === "processing"}
                    onCameraReady={() => setCameraReady(true)}
                />
                <BiometricInfoPanel
                    phase={phase}
                    accentColor={accentColor}
                    error={error}
                    errorTipo={errorTipo}
                    statusIcon={estadoIcono}
                    statusColor={estadoColor}
                    statusText={textoEstado}
                    onStart={handleStart}
                    onRetry={handleRetry}
                    onSkip={handleSaltar}
                    onClose={handleClose}
                />
            </View>
        </Modal>
    );
}
