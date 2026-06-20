import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ClientBalanceCardProps {
    saldo: number;
    accentColor: string;
    textPrimary: string;
    textSecondary: string;
    onLoadBalance: () => void;
}

export const ClientBalanceCard: React.FC<ClientBalanceCardProps> = ({
    saldo,
    accentColor,
    textPrimary,
    textSecondary,
    onLoadBalance,
}) => (
    <View style={[styles.container, { backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }]}>
        <View style={styles.row}>
            <View>
                <Text style={[styles.label, { color: textSecondary }]}>Saldo Prepago Cliente</Text>
                <Text style={[styles.amount, { color: textPrimary }]}>${saldo.toLocaleString()}</Text>
            </View>
            <Pressable onPress={onLoadBalance} style={[styles.loadBtn, { backgroundColor: accentColor }]}>
                <Text style={styles.loadBtnText}>CARGAR</Text>
            </Pressable>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { marginTop: 16, marginBottom: 15, padding: 12, borderRadius: 12, borderWidth: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    amount: { fontSize: 20, fontWeight: '900', marginTop: 2 },
    loadBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    loadBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
});
