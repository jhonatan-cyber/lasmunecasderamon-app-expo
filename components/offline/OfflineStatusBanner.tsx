import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedView } from '@/components/ui/AnimatedView';
import { useOutbox } from '@/hooks/useOutbox';

/**
 * Aviso del modo offline, compartido por garzón y cajero.
 *
 * Muestra un solo mensaje, el más importante de los cuatro casos —sin conexión
 * con trabajo guardado, sin conexión a secas, enviando, o trabajo que necesita
 * revisión— porque en la barra de una pantalla operativa no caben dos. Al
 * tocarlo se abre la pantalla de pendientes, que es donde se resuelve.
 */
export interface OfflineStatusBannerProps {
    /** Ruta de la pantalla de pendientes de este rol. */
    pendientesHref: Href;
    /** Texto cuando no hay red y no hay nada en la cola. */
    offlineLabel?: string;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({
    pendientesHref,
    offlineLabel = 'Sin conexión · viendo datos guardados',
}) => {
    const router = useRouter();
    const { pendingCount, failedCount, isOffline, isFlushing } = useOutbox();

    if (!isOffline && pendingCount === 0) return null;

    const needsReview = failedCount > 0;
    // Tonos oscurecidos para que el texto blanco pase AA (antes 2.2:1 en ámbar).
    const backgroundColor = isOffline ? '#B91C1C' : needsReview ? '#B45309' : '#1D4ED8';

    const message = isOffline
        ? pendingCount > 0
            ? `Sin conexión · ${pendingCount} operación(es) guardada(s)`
            : offlineLabel
        : isFlushing
          ? `Enviando ${pendingCount} operación(es)…`
          : needsReview
            ? `${failedCount} operación(es) necesitan revisión`
            : `${pendingCount} operación(es) sin enviar`;

    return (
        <AnimatedView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={[styles.banner, { backgroundColor }]}
        >
            <Pressable
                onPress={() => router.push(pendientesHref)}
                style={styles.pressable}
                accessibilityRole="button"
                accessibilityLabel={`${message}. Ver pendientes`}
                accessibilityLiveRegion="polite"
            >
                <Ionicons
                    name={isOffline ? 'cloud-offline' : 'cloud-upload'}
                    size={20}
                    color='#FFFFFF'
                />
                <Text maxFontSizeMultiplier={1.3} style={styles.text}>{message}</Text>
                <View style={styles.action}>
                    <Text maxFontSizeMultiplier={1.3} style={styles.actionText}>Ver</Text>
                    <Ionicons name='chevron-forward' size={14} color='#FFFFFF' />
                </View>
            </Pressable>
        </AnimatedView>
    );
};

const styles = StyleSheet.create({
    banner: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        elevation: 4,
    },
    pressable: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 10,
    },
    text: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', flexShrink: 1 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
});
