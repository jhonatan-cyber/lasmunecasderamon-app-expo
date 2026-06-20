import { View, Text, StyleSheet } from 'react-native';

interface Props {
    eventDetail: any;
    formatAmount: (v: any) => string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
}

export function EventAssistDetail({ eventDetail, formatAmount, textPrimary, textSecondary, borderColor }: Props) {
    if (eventDetail.tipo !== 'asistencia') return null;

    return (
        <>
            <View style={styles.row}>
                <Text style={[styles.label, { color: textSecondary }]}>Sueldo</Text>
                <Text style={[styles.value, { color: textPrimary }]}>${formatAmount(eventDetail.sueldo)}</Text>
            </View>
            <View style={styles.row}>
                <Text style={[styles.label, { color: textSecondary }]}>Aporte</Text>
                <Text style={[styles.value, { color: '#EF4444' }]}>-${formatAmount(eventDetail.aporte)}</Text>
            </View>
            {Number(eventDetail.descuento_total) > 0 && (
                <View style={styles.row}>
                    <Text style={[styles.label, { color: textSecondary }]}>Desc. habitación ({eventDetail.semanas_con_descuento} sem.)</Text>
                    <Text style={[styles.value, { color: '#EF4444' }]}>-${formatAmount(eventDetail.descuento_total)}</Text>
                </View>
            )}
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <View style={styles.row}>
                <Text style={[styles.label, { color: textSecondary }]}>Neto por asistencia</Text>
                <Text style={[styles.value, { color: '#10B981' }]}>${formatAmount(eventDetail.neto)}</Text>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    row: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600' },
    value: { fontSize: 14, fontWeight: '700' },
    divider: { width: '100%', height: 1, marginVertical: 25, opacity: 0.5 },
});
