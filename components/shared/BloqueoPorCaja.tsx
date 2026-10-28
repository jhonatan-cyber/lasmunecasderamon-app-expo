import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { showToast } from '@/utils/toast-lazy';
export const CAJA_REQUERIDA_MENSAJE =
    'Necesitás una caja abierta para usar esta función.';

export const OPACIDAD_BLOQUEADA = 0.5;

interface BloqueoPorCajaProps {
    bloqueado: boolean;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    mensaje?: string;
}

export function BloqueoPorCaja({
    bloqueado,
    children,
    style,
    mensaje = CAJA_REQUERIDA_MENSAJE,
}: BloqueoPorCajaProps) {
    const [mostrandoTooltip, setMostrandoTooltip] = useState(false);

    const avisar = useCallback(() => {
        showToast({
            type: 'warning',
            text1: 'Caja cerrada',
            text2: mensaje,
            visibilityTime: 3500,
        });
    }, [mensaje]);

    if (!bloqueado) {
        return <View style={style}>{children}</View>;
    }

    return (
        <View style={[styles.contenedor, style]}>
            <View
                testID="bloqueo-por-caja-contenido"
                style={styles.atenuado}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
            >
                {children}
            </View>

            <Pressable
                testID="bloqueo-por-caja-aviso"
                style={styles.capa}
                onPress={avisar}
                onHoverIn={() => setMostrandoTooltip(true)}
                onHoverOut={() => setMostrandoTooltip(false)}
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                accessibilityLabel={`Bloqueado. ${mensaje}`}
            >
                {mostrandoTooltip && (
                    <View style={styles.tooltip} pointerEvents="none">
                        <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                        <Text style={styles.tooltipTexto}>{mensaje}</Text>
                    </View>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        position: 'relative',
    },
    atenuado: {
        flex: 1,
        opacity: OPACIDAD_BLOQUEADA,
    },
    capa: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tooltip: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '92%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
    },
    tooltipTexto: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        flexShrink: 1,
    },
});
