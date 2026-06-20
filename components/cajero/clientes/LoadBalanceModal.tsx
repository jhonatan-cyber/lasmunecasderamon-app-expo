import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '@/hooks/useClientes';
import { PaymentMethod, PaymentMethodSelect } from '@/components/cajero/forms/PaymentMethodSelect';

interface LoadBalanceModalProps {
    visible: boolean;
    editingClient: Client | null;
    isDark: boolean;
    insets: { bottom: number };
    loadingAmount: string;
    setLoadingAmount: (text: string) => void;
    loadMetodoPago: PaymentMethod;
    setLoadMetodoPago: (method: PaymentMethod) => void;
    accentColor: string;
    submitting: boolean;
    primaryMethod: PaymentMethod;
    setPrimaryMethod: (method: PaymentMethod) => void;
    secondaryMethod: PaymentMethod;
    setSecondaryMethod: (method: PaymentMethod) => void;
    primaryAmount: string;
    setPrimaryAmount: (amount: string) => void;
    secondaryAmount: string;
    setSecondaryAmount: (amount: string) => void;
    formatCurrency: (value: string) => string;
    unformatCurrency: (value: string) => string;
    handleLoadBalance: () => Promise<void>;
    onClose: () => void;
}

export function LoadBalanceModal({
    visible,
    editingClient,
    isDark,
    insets,
    loadingAmount,
    setLoadingAmount,
    loadMetodoPago,
    setLoadMetodoPago,
    accentColor,
    submitting,
    primaryMethod,
    setPrimaryMethod,
    secondaryMethod,
    setSecondaryMethod,
    primaryAmount,
    setPrimaryAmount,
    secondaryAmount,
    setSecondaryAmount,
    formatCurrency,
    unformatCurrency,
    handleLoadBalance,
    onClose
}: LoadBalanceModalProps) {
    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                <View style={[styles.modalContent, {
                    backgroundColor: isDark ? "#111111" : "#FFFFFF",
                    height: 'auto',
                    paddingBottom: Math.max(insets.bottom, 20) + 20
                }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: isDark ? "#FFFFFF" : "#111827" }]}>Cargar Saldo</Text>
                            <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontWeight: '700' }}>
                                {editingClient?.name} {editingClient?.lastName}
                            </Text>
                        </View>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={26} color={isDark ? "#FFFFFF" : "#111827"} />
                        </Pressable>
                    </View>

                    <View style={{ gap: 20 }}>
                        <View>
                            <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>MONTO A CARGAR</Text>
                            <TextInput
                                style={[styles.input, {
                                    color: isDark ? "#FFFFFF" : "#111827",
                                    borderColor: isDark ? "#374151" : "#E5E7EB",
                                    fontSize: 24,
                                    fontWeight: '800',
                                    height: 60,
                                    textAlign: 'center'
                                }]}
                                value={loadingAmount}
                                onChangeText={(text) => setLoadingAmount(formatCurrency(text))}
                                placeholder="0"
                                placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                keyboardType="numeric"
                                autoFocus
                            />
                        </View>

                        <PaymentMethodSelect
                            selectedMethod={loadMetodoPago}
                            onSelect={(val) => setLoadMetodoPago(val as PaymentMethod)}
                            showPrepago={false}
                            showMixto={true}
                        />

                        {loadMetodoPago === 'mixto' && (
                            <View style={styles.mixedInputs}>
                                <View style={styles.mixedHeader}>
                                    <Ionicons name="shuffle-outline" size={18} color={accentColor} />
                                    <Text style={[styles.mixedTitle, { color: accentColor }]}>Distribución de Pago</Text>
                                </View>
                                
                                <View style={styles.mixedRow}>
                                    <View style={{ flex: 1.5 }}>
                                        <PaymentMethodSelect
                                            selectedMethod={primaryMethod}
                                            onSelect={(val) => setPrimaryMethod(val as PaymentMethod)}
                                            showPrepago={false}
                                            showMixto={false}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <TextInput
                                            style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                            value={primaryAmount}
                                            onChangeText={(text) => {
                                                const formatted = formatCurrency(text);
                                                setPrimaryAmount(formatted);
                                                const total = Number(unformatCurrency(loadingAmount)) || 0;
                                                const pVal = Number(unformatCurrency(formatted)) || 0;
                                                if (total > pVal) setSecondaryAmount(formatCurrency((total - pVal).toString()));
                                                else setSecondaryAmount("0");
                                            }}
                                            placeholder="$ 0"
                                            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                <View style={styles.mixedRow}>
                                    <View style={{ flex: 1.5 }}>
                                        <PaymentMethodSelect
                                            selectedMethod={secondaryMethod}
                                            onSelect={(val) => setSecondaryMethod(val as PaymentMethod)}
                                            showPrepago={false}
                                            showMixto={false}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <TextInput
                                            style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                            value={secondaryAmount}
                                            onChangeText={(text) => {
                                                const formatted = formatCurrency(text);
                                                setSecondaryAmount(formatted);
                                                const total = Number(unformatCurrency(loadingAmount)) || 0;
                                                const sVal = Number(unformatCurrency(formatted)) || 0;
                                                if (total > sVal) setPrimaryAmount(formatCurrency((total - sVal).toString()));
                                                else setPrimaryAmount("0");
                                            }}
                                            placeholder="$ 0"
                                            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: accentColor, height: 60, borderRadius: 20 }, submitting && { opacity: 0.7 }]}
                            onPress={handleLoadBalance}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#FFF" /> : (
                                <Text style={styles.saveBtnText}>CONFIRMAR CARGA</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end' 
    },
    modalContent: { 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        padding: 24, 
        maxHeight: '90%' 
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 25 
    },
    modalTitle: { 
        fontSize: 22, 
        fontWeight: '900' 
    },
    formLabel: { 
        fontSize: 11, 
        fontWeight: '900', 
        letterSpacing: 1, 
        marginBottom: 8 
    },
    input: { 
        height: 50, 
        borderWidth: 1, 
        borderRadius: 14, 
        paddingHorizontal: 15, 
        fontSize: 14, 
        fontWeight: '700', 
        backgroundColor: 'rgba(155,155,155,0.03)' 
    },
    saveBtn: { 
        height: 56, 
        borderRadius: 18, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 10 
    },
    saveBtnText: { 
        color: '#FFF', 
        fontSize: 15, 
        fontWeight: '900', 
        letterSpacing: 1 
    },
    mixedInputs: { 
        gap: 12, 
        backgroundColor: 'rgba(155,155,155,0.05)', 
        padding: 16, 
        borderRadius: 20 
    },
    mixedHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        marginBottom: 4 
    },
    mixedTitle: { 
        fontSize: 12, 
        fontWeight: '900', 
        letterSpacing: 0.5 
    },
    mixedRow: { 
        flexDirection: 'row', 
        gap: 10, 
        alignItems: 'center' 
    },
});
