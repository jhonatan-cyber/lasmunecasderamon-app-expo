import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../BiometricEnrollmentModal.styles';
import { PASOS, esFaseCaptura, type Phase, type TipoError } from './captureConfig';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface BiometricInfoPanelProps {
    phase: Phase;
    accentColor: string;
    error: string | null;
    errorTipo: TipoError | null;
    statusIcon: IconName;
    statusColor: string;
    statusText: string;
    onStart: () => void;
    onRetry: () => void;
    onSkip: () => void;
    onClose: () => void;
}

export function BiometricInfoPanel({
    phase,
    accentColor,
    error,
    errorTipo,
    statusIcon,
    statusColor,
    statusText,
    onStart,
    onRetry,
    onSkip,
    onClose,
}: BiometricInfoPanelProps) {
    const fase = esFaseCaptura(phase) ? phase : null;

    return (
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
                        onPress={onStart}
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
                        onPress={onRetry}
                    >
                        <Text style={styles.primaryBtnText}>Reintentar</Text>
                    </TouchableOpacity>
                    {errorTipo === 'deteccion' ? (
                        <TouchableOpacity style={styles.ghostBtn} onPress={onSkip}>
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
                        <Ionicons name={statusIcon} size={18} color={statusColor} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {statusText}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
                        <Text style={styles.ghostBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}
