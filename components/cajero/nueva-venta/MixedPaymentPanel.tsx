import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';
import type { PagoMixto } from '@/components/cajero/nueva-venta/types';

interface MixedPaymentPanelProps {
    pagosMixtos: PagoMixto[];
    total: number;
    clienteSaldo?: number;
    onUpdatePago: (index: number, monto: number, display: string) => void;
    onRemovePago: (index: number) => void;
    onAddPago: (metodo: PaymentMethod) => void;
    
    isDark: boolean;
    accentColor: string;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
}

const METODOS: PaymentMethod[] = ['efectivo', 'tarjeta', 'transferencia', 'prepago'];

export const MixedPaymentPanel: React.FC<MixedPaymentPanelProps> = ({
    pagosMixtos,
    total,
    clienteSaldo = 0,
    onUpdatePago,
    onRemovePago,
    onAddPago,
    isDark,
    accentColor,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
}) => {
    const suma = pagosMixtos.reduce((s, p) => s + p.monto, 0);
    const completo = suma >= total;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
            <View style={styles.header}>
                <Ionicons name="shuffle-outline" size={18} color={accentColor} />
                <Text style={[styles.headerText, { color: textPrimary }]}>
                    Distribución de Pagos (Total: ${total.toLocaleString()})
                </Text>
            </View>

            {pagosMixtos.map((pago, index) => (
                <View key={index} style={styles.pagoRow}>
                    <View style={styles.metodoLabel}>
                        <Text style={[styles.metodoText, { color: textSecondary }]}>
                            {pago.metodo}
                        </Text>
                    </View>
                    <Text style={[styles.currencySymbol, { color: textSecondary }]}>$</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: cardBg, color: textPrimary, borderColor }]}
                        value={pago.display}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={textSecondary}
                        onChangeText={(text) => {
                            const clean = text.replace(/\D/g, '');
                            onUpdatePago(index, clean ? parseInt(clean, 10) : 0, clean);
                        }}
                        onBlur={() => {
                            onUpdatePago(
                                index,
                                pago.monto,
                                pago.monto > 0 ? pago.monto.toLocaleString('es-CL') : ''
                            );
                        }}
                    />
                    <Pressable onPress={() => onRemovePago(index)} style={styles.removeBtn}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </Pressable>
                </View>
            ))}

            {!completo && (
                <View style={styles.addMethodRow}>
                    {METODOS.map((metodo) => {
                        if (pagosMixtos.some((p) => p.metodo === metodo)) return null;
                        const sinSaldo = metodo === 'prepago' && clienteSaldo <= 0;
                        return (
                            <Pressable
                                key={metodo}
                                onPress={() => { if (!sinSaldo) onAddPago(metodo); }}
                                style={[
                                    styles.addMethodBtn,
                                    {
                                        borderColor: sinSaldo ? textSecondary : accentColor,
                                        backgroundColor: sinSaldo ? 'transparent' : `${accentColor}10`,
                                        opacity: sinSaldo ? 0.35 : 1,
                                    }
                                ]}
                            >
                                <Text style={[styles.addMethodText, { color: sinSaldo ? textSecondary : accentColor }]}>
                                    {metodo}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}

            <View style={[styles.summaryRow, { borderTopColor: borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>Suma actual:</Text>
                <Text style={[styles.summaryValue, { color: suma === total ? '#10B981' : '#EF4444' }]}>
                    ${suma.toLocaleString()}
                </Text>
            </View>

            {suma !== total && (
                <Text style={styles.faltaText}>
                    * Falta: ${(total - suma).toLocaleString()}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginTop: 16, padding: 12, borderRadius: 12 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    headerText: { fontSize: 13, fontWeight: '800', marginLeft: 8, textTransform: 'uppercase' },
    pagoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    metodoLabel: { width: 150, flexDirection: 'row', alignItems: 'center' },
    metodoText: { fontSize: 10, textTransform: 'uppercase', fontWeight: '700' },
    currencySymbol: { fontSize: 12, marginRight: 4 },
    input: {
        flex: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6,
        borderWidth: 1, fontSize: 13,
    },
    removeBtn: { marginLeft: 6, padding: 4 },
    addMethodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    addMethodBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
    addMethodText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    summaryRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingTop: 8, borderTopWidth: 1, marginTop: 8,
    },
    summaryLabel: { fontSize: 12 },
    summaryValue: { fontWeight: '700' },
    faltaText: { color: '#EF4444', fontSize: 10, marginTop: 4 },
});
