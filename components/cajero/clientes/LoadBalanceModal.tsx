import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { BorderRadius } from '@/constants/spacing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Client } from '@/hooks/useClientes';
import { CajaClosedBanner } from '@/components/cajero/CajaClosedBanner';
import { PaymentMethod, PaymentMethodSelect } from '@/components/cajero/forms/PaymentMethodSelect';
import { adjuntarBaucher } from '@/utils/baucherPicker';
import { useAccentColor } from '@/hooks/useAccentColor';

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
    cajaAbierta: boolean | null;
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
    loadBaucherFoto: string | null;
    onBaucherFotoChange: (foto: string | null) => void;
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
    cajaAbierta,
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
    loadBaucherFoto,
    onBaucherFotoChange,
    onClose
}: LoadBalanceModalProps) {
    const { accentOnSurface } = useAccentColor();
    const hasTransferencia =
        loadMetodoPago === 'transferencia' ||
        (loadMetodoPago === 'mixto' &&
            (primaryMethod === 'transferencia' || secondaryMethod === 'transferencia'));

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
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
                        {/* La carga de saldo mueve dinero en caja: con caja
                            cerrada se avisa y se deshabilita la carga. */}
                        {cajaAbierta === false && <CajaClosedBanner />}

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
                                    <Ionicons name="shuffle-outline" size={18} color={accentOnSurface} />
                                    <Text style={[styles.mixedTitle, { color: accentOnSurface }]}>Distribución de Pago</Text>
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

                        {hasTransferencia && (
                            <View>
                                <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>
                                    COMPROBANTE DE TRANSFERENCIA
                                </Text>
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: 14,
                                        paddingHorizontal: 20,
                                        borderRadius: BorderRadius.full,
                                        borderWidth: 1,
                                        borderColor: isDark ? '#374151' : '#E5E7EB',
                                        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                    }}
                                    onPress={async () => {
                                        const foto = await adjuntarBaucher('LoadBalanceModal');
                                        onBaucherFotoChange(foto);
                                    }}
                                >
                                    <Ionicons
                                        name={loadBaucherFoto ? 'checkmark-circle' : 'camera-outline'}
                                        size={20}
                                        color={loadBaucherFoto ? '#10B981' : accentColor}
                                    />
                                    <Text style={{
                                        color: loadBaucherFoto ? '#10B981' : isDark ? '#E5E7EB' : '#374151',
                                        fontWeight: '700',
                                        fontSize: 13,
                                        marginLeft: 8,
                                    }}>
                                        {loadBaucherFoto ? 'Comprobante adjuntado' : 'Tomar foto del comprobante'}
                                    </Text>
                                </TouchableOpacity>
                                {loadBaucherFoto && (
                                    <TouchableOpacity
                                        style={{
                                            alignSelf: 'flex-start',
                                            marginTop: 6,
                                            paddingVertical: 4,
                                            paddingHorizontal: 8,
                                        }}
                                        onPress={() => onBaucherFotoChange(null)}
                                    >
                                        <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>
                                            Quitar comprobante
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.saveBtn,
                                { backgroundColor: accentColor, height: 60, borderRadius: BorderRadius.full },
                                (submitting || cajaAbierta === false) && { opacity: 0.7 },
                            ]}
                            onPress={handleLoadBalance}
                            disabled={submitting || cajaAbierta === false}
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
        borderRadius: BorderRadius.full, 
        paddingHorizontal: 15, 
        fontSize: 14, 
        fontWeight: '700', 
        backgroundColor: 'rgba(155,155,155,0.03)' 
    },
    saveBtn: { 
        height: 56, 
        borderRadius: BorderRadius.full, 
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
        borderRadius: BorderRadius.full 
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
