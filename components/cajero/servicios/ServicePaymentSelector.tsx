import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { MetodoPago } from '@/types/api';

const paymentMethods: { key: MetodoPago; icon: 'cash' | 'card' | 'wallet' | 'swap-horizontal' }[] = [
  { key: 'efectivo', icon: 'cash' },
  { key: 'tarjeta', icon: 'card' },
  { key: 'transferencia', icon: 'swap-horizontal' },
  { key: 'prepago', icon: 'wallet' },
];

interface Props {
  metodoPago: MetodoPago;
  selectedClient: any;
  selectedService: any;
  onSelect: (m: MetodoPago) => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export function ServicePaymentSelector({
  metodoPago,
  selectedClient,
  selectedService,
  onSelect,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
}: Props) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        MODIFICAR MÉTODO DE PAGO
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {paymentMethods.map(({ key, icon }) => {
          const isSelected = (metodoPago || selectedService.metodo_pago) === key;
          const isLockedPrepago = key !== 'prepago' && Number(selectedClient?.saldo || 0) > 0;

          return (
            <Pressable
              key={key}
              onPress={() => {
                if (isLockedPrepago) return;
                onSelect(key);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isSelected ? accentColor : borderColor,
                backgroundColor: isSelected ? `${accentColor}15` : 'transparent',
                alignItems: 'center',
                opacity: isLockedPrepago ? 0.4 : 1,
              }}
            >
              <Ionicons name={icon} size={16} color={isSelected ? accentColor : textSecondary} />
              <Text style={{ color: isSelected ? accentColor : textSecondary, fontSize: 9, fontWeight: '800', marginTop: 4 }}>
                {key.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
