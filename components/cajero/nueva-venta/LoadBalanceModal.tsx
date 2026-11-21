import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { PaymentMethodSelect } from '@/components/cajero/forms/PaymentMethodSelect';
import type { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';

interface LoadBalanceModalProps {
  visible: boolean;
  clientName: string;
  amount: string;
  metodoPago: PaymentMethod;
  submitting: boolean;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  styles: Record<string, any>;
  onClose: () => void;
  onAmountChange: (value: string) => void;
  onMetodoPagoChange: (value: PaymentMethod) => void;
  onConfirm: () => void;
}

export const LoadBalanceModal: React.FC<LoadBalanceModalProps> = ({
  visible,
  clientName,
  amount,
  metodoPago,
  submitting,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  styles,
  onClose,
  onAmountChange,
  onMetodoPagoChange,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: cardBg, height: 'auto', paddingBottom: 40 },
          ]}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Cargar Saldo
              </Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                {clientName}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={textPrimary} />
            </Pressable>
          </View>

          <View style={{ gap: 15 }}>
            <View>
              <Text
                style={{
                  color: textSecondary,
                  fontSize: 12,
                  fontWeight: '800',
                  marginBottom: 8,
                }}
              >
                MONTO A CARGAR
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor,
                  borderRadius: 12,
                  padding: 16,
                  color: textPrimary,
                  fontSize: 18,
                  fontWeight: '700',
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.02)',
                }}
                placeholder="0"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
                value={amount}
                onChangeText={onAmountChange}
                autoFocus
              />
            </View>

            <PaymentMethodSelect
              selectedMethod={metodoPago}
              onSelect={onMetodoPagoChange}
              showPrepago={false}
            />

            <Pressable
              style={({ pressed }) => ({
                backgroundColor: accentColor,
                height: 56,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 10,
                opacity: submitting || pressed ? 0.7 : 1,
              })}
              onPress={onConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text
                  style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}
                >
                  CONFIRMAR CARGA
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
