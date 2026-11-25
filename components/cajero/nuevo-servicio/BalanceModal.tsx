import React from 'react';
import { BorderRadius } from '@/constants/spacing';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { AmountInput } from '@/components/ui/AmountInput';

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
  onClose,
  onAmountChange,
  onConfirm,
}: Props) {
  const { surfaceMuted } = useAccentColor();

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

          <AmountInput
            value={balanceAmount}
            onChange={onAmountChange}
            placeholder="Monto"
            autoFocus
            icon="cash-outline"
            fontSize={18}
            height={50}
            borderRadius={16}
            borderColor={borderColor}
            textColor={textPrimary}
            placeholderTextColor={textSecondary}
            style={{ marginBottom: 20 }}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 12,
                backgroundColor: surfaceMuted,
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
    borderRadius: BorderRadius.card,
    padding: 24,
    width: '100%' as const,
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitleText: { fontSize: 22, fontWeight: '900' as const },
};
