import { View, Text, StyleSheet } from 'react-native';

interface Props {
    eventDetail: any;
    formatAmount: (v: any) => string;
    textPrimary: string;
    textSecondary: string;
}

export function EventDetailProducts({ eventDetail, formatAmount, textPrimary, textSecondary }: Props) {
    if (!eventDetail.detalles?.length) return null;

    return (
        <View style={{ width: '100%', marginTop: 4 }}>
            <Text style={[styles.label, { color: textSecondary, marginBottom: 8 }]}>Productos</Text>
            {eventDetail.detalles.map((d: any, i: number) => (
                <View key={i} style={[styles.row, { marginBottom: 6 }]}>
                    <Text style={[styles.label, { color: textPrimary, flex: 1 }]}>{d.cantidad}x {d.producto_nombre}</Text>
                    <Text style={[styles.value, { color: textSecondary }]}>${formatAmount(d.subtotal)}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600' },
    value: { fontSize: 14, fontWeight: '700' },
});
