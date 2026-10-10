import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useOutbox } from '@/hooks/useOutbox';
import type { OutboxIntent, OutboxIntentType } from '@/services/outbox';

const ESTADO_UI: Record<OutboxIntent['status'], { label: string; color: string }> = {
    pendiente: { label: 'EN COLA', color: '#2563EB' },
    enviando: { label: 'ENVIANDO', color: '#2563EB' },
    aplicada: { label: 'ENVIADA', color: '#10B981' },
    fallida: { label: 'REVISAR', color: '#EF4444' },
};

/** Ícono por tipo de operación, para que se distinga de un vistazo. */
const ICONO_POR_TIPO: Record<OutboxIntentType, keyof typeof Ionicons.glyphMap> = {
    'order.create': 'receipt-outline',
    'sale.create': 'cart-outline',
    'account.consumptions': 'add-circle-outline',
    'account.checkout': 'card-outline',
};

const formatFecha = (timestamp: number) => {
    const fecha = new Date(timestamp);
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)} ${dos(fecha.getHours())}:${dos(
        fecha.getMinutes()
    )}`;
};

export interface PendingOperationsScreenProps {
    title: string;
    emptySubtitle: string;
    /** `false` para roles que no pueden operar sin red (cajero). */
    createsWorkOffline?: boolean;
    onBack: () => void;
}

/**
 * Operaciones que este dispositivo hizo y el servidor todavía no confirmó:
 * lo encolado sin red más lo que el servidor rechazó.
 *
 * Es la única pantalla donde se ven y donde se decide: reintentar o descartar,
 * con el motivo del rechazo a la vista para poder corregir.
 */
export const PendingOperationsScreen: React.FC<PendingOperationsScreenProps> = ({
    title,
    emptySubtitle,
    createsWorkOffline = true,
    onBack,
}) => {
    const { accentColor, bg, cardBg, borderColor, textPrimary, textSecondary, isDark } =
        useAccentColor();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { intents, pendingCount, failedCount, isOffline, isFlushing, flush, retry, discard } =
        useOutbox();

    const renderIntent = (intent: OutboxIntent) => {
        const estado = ESTADO_UI[intent.status];

        return (
            <View key={intent.id} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                    <Ionicons
                        name={ICONO_POR_TIPO[intent.type] ?? 'document-outline'}
                        size={20}
                        color={accentColor}
                    />
                    <Text style={[styles.cardTitle, { color: textPrimary }]} numberOfLines={1}>
                        {intent.label || intent.type}
                    </Text>
                    <View style={[styles.chip, { backgroundColor: `${estado.color}22` }]}>
                        <Text style={[styles.chipText, { color: estado.color }]}>
                            {estado.label}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.cardMeta, { color: textSecondary }]}>
                    {formatFecha(intent.createdAt)} · {intent.attempts} intento(s)
                </Text>

                {intent.lastError ? (
                    <Text style={styles.cardError} numberOfLines={2}>
                        {intent.lastError}
                    </Text>
                ) : null}

                <View style={styles.cardActions}>
                    <Pressable
                        onPress={() => retry(intent.id)}
                        disabled={isFlushing}
                        style={[
                            styles.actionButton,
                            { borderColor: accentColor, opacity: isFlushing ? 0.5 : 1 },
                        ]}
                    >
                        <Ionicons name='refresh' size={16} color={accentColor} />
                        <Text style={[styles.actionText, { color: accentColor }]}>REINTENTAR</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => discard(intent.id)}
                        style={[styles.actionButton, { borderColor: '#EF4444' }]}
                    >
                        <Ionicons name='trash-outline' size={16} color='#EF4444' />
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>DESCARTAR</Text>
                    </Pressable>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader
                title={title}
                subtitle={isOffline ? 'Sin conexión' : 'Se envían solos al volver la red'}
                onBack={onBack}
                connectionStatus={{
                    isConnected: !isOffline,
                    label: isOffline ? 'Modo Offline' : 'En Línea',
                }}
            />

            <View style={styles.summary}>
                <Text style={[styles.summaryText, { color: textSecondary }]}>
                    {pendingCount === 0
                        ? 'No hay operaciones pendientes.'
                        : `${pendingCount} operación(es) en la cola${
                              failedCount > 0 ? ` · ${failedCount} para revisar` : ''
                          }`}
                </Text>

                <Pressable
                    onPress={() => flush()}
                    disabled={isOffline || isFlushing || pendingCount === 0}
                    style={[
                        styles.syncButton,
                        {
                            backgroundColor: accentColor,
                            opacity: isOffline || isFlushing || pendingCount === 0 ? 0.5 : 1,
                        },
                    ]}
                >
                    {isFlushing ? (
                        <ActivityIndicator color='#FFFFFF' size='small' />
                    ) : (
                        <Ionicons name='cloud-upload-outline' size={18} color='#FFFFFF' />
                    )}
                    <Text style={styles.syncText}>
                        {isFlushing ? 'SINCRONIZANDO...' : 'SINCRONIZAR AHORA'}
                    </Text>
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 40 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {intents.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
                        <Ionicons name='checkmark-circle-outline' size={44} color='#10B981' />
                        <Text style={[styles.emptyTitle, { color: textPrimary }]}>Todo enviado</Text>
                        <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                            {isOffline && createsWorkOffline
                                ? 'Cuando vuelva la conexión, las operaciones nuevas que hagas saldrán solas.'
                                : emptySubtitle}
                        </Text>
                    </View>
                ) : (
                    intents.map(renderIntent)
                )}

                <View style={[styles.note, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                    <Ionicons name='information-circle-outline' size={18} color={textSecondary} />
                    <Text style={[styles.noteText, { color: textSecondary }]}>
                        Cada operación viaja con su propia clave, así que reenviarla nunca la
                        duplica.
                    </Text>
                </View>

                {__DEV__ ? (
                    <Pressable
                        onPress={() => router.push('/diagnostico')}
                        style={[styles.devButton, { borderColor }]}
                    >
                        <Ionicons name='code-slash-outline' size={16} color={textSecondary} />
                        <Text style={[styles.devButtonText, { color: textSecondary }]}>
                            VER SQLITE DEL DISPOSITIVO
                        </Text>
                        <Ionicons name='chevron-forward' size={14} color={textSecondary} />
                    </Pressable>
                ) : null}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    summary: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
    summaryText: { fontSize: 13, fontWeight: '600' },
    syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 46,
        borderRadius: 12,
    },
    syncText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.8 },
    listContent: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },
    card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { flex: 1, fontSize: 14, fontWeight: '800' },
    chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    chipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
    cardMeta: { fontSize: 12 },
    cardError: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
    cardActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    actionText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
    emptyCard: {
        alignItems: 'center',
        gap: 8,
        padding: 24,
        borderRadius: 14,
        borderWidth: 1,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800' },
    emptySubtitle: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
    note: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
    },
    noteText: { flex: 1, fontSize: 12, lineHeight: 17 },
    devButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        marginTop: 4,
    },
    devButtonText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
});
