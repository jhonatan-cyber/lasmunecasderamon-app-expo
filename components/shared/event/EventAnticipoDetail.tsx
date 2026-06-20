import { View, Text, StyleSheet } from 'react-native';

interface Props {
    eventDetail: any;
    formatAmount: (v: any) => string;
    getAccionLabel: (a: string) => string;
    accentColor: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
}

export function EventAnticipoDetail({ eventDetail, formatAmount, getAccionLabel, accentColor, textPrimary, textSecondary, borderColor }: Props) {
    if (eventDetail.tipo !== 'anticipo') return null;

    return (
        <>
            <View style={styles.row}>
                <Text style={[styles.label, { color: textSecondary }]}>Solicitado por</Text>
                <Text style={[styles.value, { color: textPrimary }]}>{eventDetail.solicitante_nick || eventDetail.solicitante_nombre}</Text>
            </View>
            <View style={styles.row}>
                <Text style={[styles.label, { color: textSecondary }]}>Monto</Text>
                <Text style={[styles.value, { color: '#EF4444' }]}>${formatAmount(eventDetail.monto)}</Text>
            </View>
            {eventDetail.observacion && (
                <View style={styles.row}>
                    <Text style={[styles.label, { color: textSecondary }]}>Motivo</Text>
                    <Text style={[styles.value, { color: textPrimary, flex: 1, textAlign: 'right', fontSize: 13 }]}>{eventDetail.observacion}</Text>
                </View>
            )}
            {eventDetail.historial?.length > 0 && (
                <>
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <View style={{ width: '100%' }}>
                        <Text style={[styles.label, { color: textSecondary, marginBottom: 16 }]}>Historial</Text>
                        {eventDetail.historial.map((h: any, i: number) => (
                            <View key={i} style={styles.timelineRow}>
                                <View style={styles.timelineLine}>
                                    <View style={[styles.timelineDot, { backgroundColor: accentColor }]} />
                                    {i < eventDetail.historial.length - 1 && (
                                        <View style={[styles.timelineConnector, { backgroundColor: borderColor }]} />
                                    )}
                                </View>
                                <View style={styles.timelineContent}>
                                    <Text style={[styles.timelineAction, { color: textPrimary }]}>
                                        {getAccionLabel(h.accion)}
                                    </Text>
                                    <Text style={[styles.timelineMeta, { color: textSecondary }]}>
                                        {h.usuario_accion_nick ? `por ${h.usuario_accion_nick} — ` : ''}
                                        {new Date(h.fecha_crea).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    row: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600' },
    value: { fontSize: 14, fontWeight: '700' },
    divider: { width: '100%', height: 1, marginVertical: 25, opacity: 0.5 },
    timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
    timelineLine: { width: 24, alignItems: 'center', marginRight: 12 },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    timelineConnector: { width: 1, flex: 1, minHeight: 28 },
    timelineContent: { flex: 1, paddingBottom: 16 },
    timelineAction: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    timelineMeta: { fontSize: 12, fontWeight: '500' },
});
