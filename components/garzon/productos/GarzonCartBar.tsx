import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

interface GarzonCartBarProps {
    tipEnabled: boolean;
    setTipEnabled: (enabled: boolean) => void;
    tipAmount: number;
    tipPercentage?: number;
    cartTotal: number;
    submitting: boolean;
    submitOrder: () => void;

    insets: { bottom: number };
    accentColor: string;
    borderColor: string;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
}

export const GarzonCartBar: React.FC<GarzonCartBarProps> = ({
    tipEnabled,
    setTipEnabled,
    tipAmount,
    tipPercentage = 10,
    cartTotal,
    submitting,
    submitOrder,
    insets,
    accentColor,
    borderColor,
    cardBg,
    textPrimary,
    textSecondary,
}) => {
    return (
        <View style={[styles.cartBar, { backgroundColor: cardBg, borderTopColor: borderColor, paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.cartTopRow}>
                <View style={styles.tipControl}>
                    <Text style={[styles.tipText, { color: textSecondary }]}>Propina ({tipPercentage}%)</Text>
                    <Switch
                        value={tipEnabled}
                        onValueChange={setTipEnabled}
                        trackColor={{ false: '#374151', true: accentColor }}
                        thumbColor="#FFF"
                    />
                </View>
                {tipEnabled && (
                    <Text style={[styles.tipAmount, { color: accentColor }]}>
                        +${tipAmount.toLocaleString()}
                    </Text>
                )}
            </View>

            <View style={styles.cartMainRow}>
                <View>
                    <Text style={[styles.cartLabel, { color: textSecondary }]}>Total Pedido</Text>
                    <Text style={[styles.cartTotal, { color: textPrimary }]}>${cartTotal.toLocaleString()}</Text>
                </View>
                <Pressable
                    onPress={submitOrder}
                    disabled={submitting}
                    style={({ pressed }) => [
                        styles.submitBtn, 
                        { backgroundColor: accentColor }, 
                        submitting && { opacity: 0.5 }, 
                        pressed && { opacity: 0.8 }
                    ]}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>Enviar Pedido</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    cartTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    tipControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tipText: { fontSize: 13, fontWeight: '600' },
    tipAmount: { fontSize: 13, fontWeight: '700' },
    cartMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cartLabel: { fontSize: 12, fontWeight: '600' },
    cartTotal: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    submitBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
