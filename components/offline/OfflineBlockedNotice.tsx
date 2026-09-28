import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Aviso de que la acción de esta pantalla **no** se puede hacer sin conexión.
 *
 * Es distinto del banner de la cola: ese dice qué se está guardando; este dice
 * qué no se puede hacer y por qué. Va pegado al botón que queda deshabilitado
 * para que el cajero no toque un botón muerto sin saber el motivo.
 */
export interface OfflineBlockedNoticeProps {
    message: string;
    accentColor?: string;
}

export const OfflineBlockedNotice: React.FC<OfflineBlockedNoticeProps> = ({
    message,
    accentColor = '#EF4444',
}) => (
    <View style={[styles.container, { backgroundColor: `${accentColor}14`, borderColor: `${accentColor}40` }]}>
        <Ionicons name='cloud-offline-outline' size={18} color={accentColor} />
        <Text style={[styles.text, { color: accentColor }]}>{message}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    text: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },
});
