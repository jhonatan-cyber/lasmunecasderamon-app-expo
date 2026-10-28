import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../BiometricEnrollmentModal.styles';
import { ORDEN_PASOS } from './captureConfig';

interface BiometricStepsProps {
    currentIndex: number;
    accentColor: string;
}

export function BiometricSteps({ currentIndex, accentColor }: BiometricStepsProps) {
    return (
        <View style={styles.stepsRow}>
            {ORDEN_PASOS.map((paso, indice) => {
                const hecho = indice < currentIndex;
                const activo = indice === currentIndex;
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
    );
}
