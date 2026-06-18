import React from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  balanceAmount: string;
  balanceSubmitting: boolean;
  selectedClientName: string;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  onClose: () => void;
  onAmountChange: (val: string) => void;
  onConfirm: () => void;
};

export function BalanceModal({
  visible,
  balanceAmount,
  balanceSubmitting,
  selectedClientName,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  onClose,
  onAmountChange,
  onConfirm,
}: Props) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.modalTitleText, { color: textPrimary, marginBottom: 8 }]}>
            Cargar Saldo Prepago
          </Text>
          <Text style={{ color: textSecondary, marginBottom: 20 }}>
            Ingresa el monto a cargar para {selectedClientName}
          </Text>

          <View style={[styles.inputWrapper, { borderColor, marginBottom: 20 }]}>
            <Ionicons name="cash-outline" size={20} color={textSecondary} />
            <TextInput
              style={[styles.textInput, { color: textPrimary }]}
              placeholder="Monto"
              placeholderTextColor={textSecondary}
              keyboardType="numeric"
              value={balanceAmount}
              onChangeText={onAmountChange}
              autoFocus
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 12,
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: textPrimary, fontWeight: 'bold' }}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={balanceSubmitting || !balanceAmount}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 12,
                backgroundColor: accentColor,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: balanceSubmitting || !balanceAmount ? 0.7 : 1,
              }}
            >
              {balanceSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Cargar Saldo</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  detailModal: {
    borderRadius: 24,
    padding: 24,
    width: '100%' as const,
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitleText: { fontSize: 22, fontWeight: '900' as const },
  inputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  textInput: { flex: 1, marginLeft: 10, fontSize: 18, fontWeight: '700' as const },
};
