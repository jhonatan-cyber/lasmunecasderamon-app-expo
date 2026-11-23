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
import { FontFamily } from '@/constants/fonts';
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
    const { accentOnSurface, cardBg, textPrimary, textSecondary, borderColor, surfaceMuted, accentText, accentColor: themeAccent } = useAccentColor();
    const hasTransferencia =
        loadMetodoPago === 'transferencia' ||
        (loadMetodoPago === 'mixto' &&
            (primaryMethod === 'transferencia' || secondaryMethod === 'transferencia'));

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                <View style={[styles.modalContent, {
                    backgroundColor: cardBg,
                    height: 'auto',
                    paddingBottom: Math.max(insets.bottom, 20) + 20
                }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Cargar Saldo</Text>
                            <Text style={{ color: textSecondary, fontFamily: FontFamily.bold }}>
                                {editingClient?.name} {editingClient?.lastName}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar carga de saldo">
                            <Ionicons name="close" size={26} color={textPrimary} />
                        </Pressable>
                    </View>

                    <View style={{ gap: 20 }}>
                        {/* La carga de saldo mueve dinero en caja: con caja
                            cerrada se avisa y se deshabilita la carga. */}
                        {cajaAbierta === false && <CajaClosedBanner />}

                        <View>
                            <Text style={[styles.formLabel, { color: textSecondary }]}>MONTO A CARGAR</Text>
                            <TextInput
                                style={[styles.input, {
                                    color: textPrimary,
                                    borderColor,
                                    fontSize: 24,
                                    fontFamily: FontFamily.extrabold,
                                    height: 60,
                                    textAlign: 'center'
                                }]}
                                value={loadingAmount}
                                onChangeText={(text) => setLoadingAmount(formatCurrency(text))}
                                placeholder="0"
                                placeholderTextColor={textSecondary}
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
                                            style={[styles.input, { color: textPrimary, borderColor }]}
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
                                            placeholderTextColor={textSecondary}
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
                                            style={[styles.input, { color: textPrimary, borderColor }]}
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
                                            placeholderTextColor={textSecondary}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        {hasTransferencia && (
                            <View>
                                <Text style={[styles.formLabel, { color: textSecondary }]}>
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
                                        borderColor,
                                        backgroundColor: surfaceMuted,
                                    }}
                                    onPress={async () => {
                                        const foto = await adjuntarBaucher('LoadBalanceModal');
                                        onBaucherFotoChange(foto);
                                    }}
                                >
                                    <Ionicons
                                        name={loadBaucherFoto ? 'checkmark-circle' : 'camera-outline'}
                                        size={20}
                                        color={loadBaucherFoto ? accentOnSurface : accentColor}
                                    />
                                    <Text style={{
                                        color: loadBaucherFoto ? accentOnSurface : textPrimary,
                                        fontFamily: FontFamily.bold,
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
                                        <Text style={{ color: themeAccent, fontSize: 11, fontFamily: FontFamily.bold }}>
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
                            {submitting ? <ActivityIndicator color={accentText} /> : (
                                <Text style={[styles.saveBtnText, { color: accentText }]}>CONFIRMAR CARGA</Text>
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
        fontFamily: FontFamily.black
    },
    formLabel: {
        fontSize: 11,
        fontFamily: FontFamily.black,
        letterSpacing: 1,
        marginBottom: 8
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 15,
        fontSize: 14,
        fontFamily: FontFamily.bold,
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
        fontSize: 15,
        fontFamily: FontFamily.black,
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
        fontFamily: FontFamily.black,
        letterSpacing: 0.5
    },
    mixedRow: { 
        flexDirection: 'row', 
        gap: 10, 
        alignItems: 'center' 
    },
});
