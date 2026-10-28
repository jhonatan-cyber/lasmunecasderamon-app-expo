import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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

type Phase = 'intro' | FaseCaptura | 'processing' | 'error';
type EstadoDeteccion = 'buscando' | 'girando' | 'ok' | 'temporizado';
type TipoError = 'deteccion' | 'captura' | 'enrolamiento';

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

const PASOS: Record<FaseCaptura, { numero: number; titulo: string; ayuda: string }> = {
    front: {
        numero: 1,
        titulo: 'Mirá de frente',
        ayuda: 'Poné la cara dentro del círculo y mirá a la cámara.',
    },
    'turn-left': {
        numero: 2,
        titulo: 'Girá a la izquierda',
        ayuda: 'Girá la cabeza hacia tu izquierda y sostené la pose.',
    },
    'turn-right': {
        numero: 3,
        titulo: 'Girá a la derecha',
        ayuda: 'Girá la cabeza hacia tu derecha y sostené la pose.',
    },
};

const ORDEN_PASOS: FaseCaptura[] = ['front', 'turn-left', 'turn-right'];
const RADIO_ANILLO = 46;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO_ANILLO;

const esFaseCaptura = (fase: Phase): fase is FaseCaptura => ORDEN_PASOS.includes(fase as FaseCaptura);

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
        const canAskAgain = permission.canAskAgain ?? true;
        return (
            <Modal visible={visible} animationType="slide" transparent>
                <View style={styles.permissionScreen}>
                    <View style={styles.permissionCard}>
                        <View style={styles.permissionIcon}>
                            <Ionicons name="camera-reverse-outline" size={34} color="#FFF" />
                        </View>
                        <Text style={styles.permissionTitle}>Permiso de cámara</Text>
                        <Text style={styles.permissionText}>
                            Necesitamos la cámara frontal para tomar las tres fotos del
                            enrolamiento facial.
                        </Text>
                        {canAskAgain ? (
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                                onPress={() => void requestPermission()}
                            >
                                <Text style={styles.primaryBtnText}>Conceder permiso</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.permissionHint}>
                                El permiso está bloqueado. Activalo desde Ajustes del teléfono.
                            </Text>
                        )}
                        <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
                            <Text style={styles.ghostBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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

                <View style={styles.stepsRow}>
                    {ORDEN_PASOS.map((paso, indice) => {
                        const hecho = indice < indiceActual;
                        const activo = indice === indiceActual;
                        return (
                            <React.Fragment key={paso}>
                                {indice > 0 ? (
                                    <View
                                        style={[
                                            styles.stepLine,
                                            hecho && { backgroundColor: accentColor },
                                        ]}
                                    />
                                ) : null}
                                <View
                                    style={[
                                        styles.stepChip,
                                        activo && { backgroundColor: accentColor, borderColor: accentColor },
                                        hecho && { borderColor: accentColor },
                                    ]}
                                >
                                    {hecho ? (
                                        <Ionicons name="checkmark" size={15} color={accentColor} />
                                    ) : (
                                        <Text
                                            style={[
                                                styles.stepNumber,
                                                activo && { color: '#FFF' },
                                            ]}
                                        >
                                            {indice + 1}
                                        </Text>
                                    )}
                                </View>
                            </React.Fragment>
                        );
                    })}
                </View>

                <View style={styles.stage}>
                    <Ionicons
                        name="chevron-back"
                        size={30}
                        color={fase === 'turn-left' ? accentColor : 'rgba(255,255,255,0.12)'}
                    />
                    <View style={[styles.cameraCircle, { borderColor: `${colorAnillo}66` }]}>
                        {cameraActive ? (
                            <CameraView
                                ref={cameraRef}
                                style={StyleSheet.absoluteFill}
                                facing="front"
                                active
                                enableTorch={false}
                                autofocus="on"
                                zoom={0}
                                onCameraReady={() => setCameraReady(true)}
                            />
                        ) : null}

                        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" pointerEvents="none">
                            <Circle
                                cx="50"
                                cy="50"
                                r={RADIO_ANILLO}
                                stroke="rgba(255,255,255,0.16)"
                                strokeWidth={2.5}
                                fill="none"
                            />
                            <Circle
                                cx="50"
                                cy="50"
                                r={RADIO_ANILLO}
                                stroke={colorAnillo}
                                strokeWidth={2.5}
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${CIRCUNFERENCIA * progreso} ${CIRCUNFERENCIA}`}
                                transform="rotate(-90 50 50)"
                            />
                        </Svg>

                        {estado === 'ok' ? (
                            <View style={styles.okOverlay}>
                                <Ionicons name="checkmark" size={72} color="#34D399" />
                            </View>
                        ) : null}

                        {phase === 'processing' ? (
                            <View style={styles.processingOverlay}>
                                <ActivityIndicator size="large" color="#FFF" />
                            </View>
                        ) : null}
                    </View>
                    <Ionicons
                        name="chevron-forward"
                        size={30}
                        color={fase === 'turn-right' ? accentColor : 'rgba(255,255,255,0.12)'}
                    />
                </View>

                <View style={[styles.panel, { borderColor: `${accentColor}38` }]}>
                    {phase === 'intro' ? (
                        <>
                            <View style={styles.panelHead}>
                                <View
                                    style={[
                                        styles.iconBadge,
                                        {
                                            backgroundColor: `${accentColor}22`,
                                            borderColor: `${accentColor}44`,
                                        },
                                    ]}
                                >
                                    <Ionicons name="scan-circle-outline" size={20} color={accentColor} />
                                </View>
                                <Text style={styles.kicker}>ENROLAMIENTO FACIAL</Text>
                            </View>
                            <Text style={styles.panelTitle}>Tres fotos, guiadas por voz</Text>
                            <Text style={styles.panelHelp}>
                                Te pedimos frente, izquierda y derecha. Detectamos el giro y la foto
                                se toma sola.
                            </Text>
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                                onPress={handleStart}
                            >
                                <Text style={styles.primaryBtnText}>Empezar</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </>
                    ) : phase === 'processing' ? (
                        <>
                            <View style={styles.panelHead}>
                                <View
                                    style={[
                                        styles.iconBadge,
                                        {
                                            backgroundColor: `${accentColor}22`,
                                            borderColor: `${accentColor}44`,
                                        },
                                    ]}
                                >
                                    <Ionicons name="cloud-upload-outline" size={20} color={accentColor} />
                                </View>
                                <Text style={styles.kicker}>CASI LISTO</Text>
                            </View>
                            <Text style={styles.panelTitle}>Guardando el enrolamiento…</Text>
                            <Text style={styles.panelHelp}>
                                Estamos subiendo tus tres capturas y verificando la facial.
                            </Text>
                        </>
                    ) : phase === 'error' ? (
                        <>
                            <View style={styles.panelHead}>
                                <View style={[styles.iconBadge, styles.badgeError]}>
                                    <Ionicons name="alert-circle" size={20} color="#F87171" />
                                </View>
                                <Text style={[styles.kicker, { color: '#F87171' }]}>NO SE PUDO SEGUIR</Text>
                            </View>
                            <Text style={styles.panelTitle}>Probemos otra vez</Text>
                            <Text style={styles.panelHelp}>{error}</Text>
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                                onPress={handleRetry}
                            >
                                <Text style={styles.primaryBtnText}>Reintentar</Text>
                            </TouchableOpacity>
                            {errorTipo === 'deteccion' ? (
                                <TouchableOpacity style={styles.ghostBtn} onPress={handleSaltar}>
                                    <Text style={styles.ghostBtnText}>Continuar sin verificar</Text>
                                </TouchableOpacity>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <View style={styles.panelHead}>
                                <View
                                    style={[
                                        styles.iconBadge,
                                        {
                                            backgroundColor: `${accentColor}22`,
                                            borderColor: `${accentColor}44`,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={
                                            fase === 'front'
                                                ? 'person-outline'
                                                : fase === 'turn-left'
                                                  ? 'arrow-back'
                                                  : 'arrow-forward'
                                        }
                                        size={20}
                                        color={accentColor}
                                    />
                                </View>
                                <Text style={styles.kicker}>
                                    PASO {fase ? PASOS[fase].numero : 1} DE 3
                                </Text>
                            </View>
                            <Text style={styles.panelTitle}>
                                {fase ? PASOS[fase].titulo : 'Enrolamiento'}
                            </Text>
                            <Text style={styles.panelHelp}>{fase ? PASOS[fase].ayuda : ''}</Text>
                            <View style={styles.statusRow}>
                                <Ionicons name={estadoIcono} size={18} color={estadoColor} />
                                <Text style={[styles.statusText, { color: estadoColor }]}>
                                    {textoEstado}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.ghostBtn} onPress={handleClose}>
                                <Text style={styles.ghostBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#05070D',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 28,
        justifyContent: 'space-between',
    },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    closeBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    headerTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
    headerSpacer: { width: 42 },
    stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    stepChip: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumber: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800' },
    stepLine: { width: 26, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
    stage: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    cameraCircle: {
        width: 286,
        height: 286,
        borderRadius: 143,
        borderWidth: 4,
        overflow: 'hidden',
        backgroundColor: '#0B1018',
        alignItems: 'center',
        justifyContent: 'center',
    },
    okOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16,185,129,0.22)',
    },
    processingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(5,7,13,0.55)',
    },
    panel: {
        backgroundColor: 'rgba(13,17,28,0.94)',
        borderRadius: 28,
        borderWidth: 1,
        paddingHorizontal: 22,
        paddingVertical: 22,
        gap: 8,
    },
    panelHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBadge: {
        width: 34,
        height: 34,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeError: { backgroundColor: 'rgba(248,113,113,0.12)', borderColor: 'rgba(248,113,113,0.35)' },
    kicker: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    panelTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    panelHelp: { color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 20 },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    statusText: { fontSize: 13, fontWeight: '700', flex: 1 },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        borderRadius: 16,
        marginTop: 6,
    },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    ghostBtn: { alignItems: 'center', paddingVertical: 12 },
    ghostBtnText: { color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '700' },
    permissionScreen: {
        flex: 1,
        backgroundColor: '#05070D',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    permissionCard: {
        backgroundColor: 'rgba(13,17,28,0.94)',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 26,
        alignItems: 'center',
        gap: 10,
    },
    permissionIcon: {
        width: 66,
        height: 66,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(96,165,250,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(96,165,250,0.3)',
        marginBottom: 4,
    },
    permissionTitle: { color: '#FFF', fontSize: 21, fontWeight: '800' },
    permissionText: {
        color: 'rgba(255,255,255,0.62)',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 6,
    },
    permissionHint: {
        color: '#FBBF24',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        marginVertical: 6,
    },
});
