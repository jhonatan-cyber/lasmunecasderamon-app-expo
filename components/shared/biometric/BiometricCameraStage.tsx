import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView } from 'expo-camera';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { styles } from '../BiometricEnrollmentModal.styles';
import type { EstadoDeteccion } from './captureConfig';
import type { FaseCaptura } from '@/components/shared/biometric/deteccionGiro';

const RADIO_ANILLO = 46;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO_ANILLO;

interface BiometricCameraStageProps {
    cameraActive: boolean;
    cameraRef: React.RefObject<CameraView | null>;
    fase: FaseCaptura | null;
    accentColor: string;
    colorAnillo: string;
    progreso: number;
    estado: EstadoDeteccion;
    processing: boolean;
    onCameraReady: () => void;
}

export function BiometricCameraStage({
    cameraActive,
    cameraRef,
    fase,
    accentColor,
    colorAnillo,
    progreso,
    estado,
    processing,
    onCameraReady,
}: BiometricCameraStageProps) {
    return (
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
                        onCameraReady={onCameraReady}
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

                {processing ? (
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
    );
}
