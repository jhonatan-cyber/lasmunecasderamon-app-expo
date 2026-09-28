import { Ionicons } from '@expo/vector-icons';
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
    offlineLabel = 'SIN CONEXIÓN · VIENDO DATOS GUARDADOS',
}) => {
    const router = useRouter();
    const { pendingCount, failedCount, isOffline, isFlushing } = useOutbox();

    if (!isOffline && pendingCount === 0) return null;

    const needsReview = failedCount > 0;
    const backgroundColor = isOffline ? '#EF4444' : needsReview ? '#F59E0B' : '#2563EB';

    const message = isOffline
        ? pendingCount > 0
            ? `SIN CONEXIÓN · ${pendingCount} OPERACIÓN(ES) GUARDADA(S)`
            : offlineLabel
        : isFlushing
          ? `ENVIANDO ${pendingCount} OPERACIÓN(ES)...`
          : needsReview
            ? `${failedCount} OPERACIÓN(ES) NECESITAN REVISIÓN`
            : `${pendingCount} OPERACIÓN(ES) SIN ENVIAR`;

    return (
        <AnimatedView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={[styles.banner, { backgroundColor }]}
        >
            <Pressable onPress={() => router.push(pendientesHref)} style={styles.pressable}>
                <Ionicons
                    name={isOffline ? 'cloud-offline' : 'cloud-upload'}
                    size={20}
                    color='#FFFFFF'
                />
                <Text style={styles.text}>{message}</Text>
                <View style={styles.action}>
                    <Text style={styles.actionText}>VER</Text>
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
        paddingVertical: 9,
        paddingHorizontal: 14,
        gap: 10,
    },
    text: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.6, flexShrink: 1 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    actionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
});
