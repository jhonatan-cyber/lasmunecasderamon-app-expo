import { Pressable, Text, View } from 'react-native';
import { MetodoPago } from '@/types/api';

const additionalMethods: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia'];

interface Props {
  restante: number;
  metodoPagoAdicional: MetodoPago;
  onSelect: (m: MetodoPago) => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export function ServiceAdditionalPayment({
  restante,
  metodoPagoAdicional,
  onSelect,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
}: Props) {
  if (restante <= 0) return null;

  return (
    <View style={{ marginBottom: 20, padding: 12, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: accentColor }}>
      <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '800', marginBottom: 8 }}>
        RESTANTE A PAGAR: ${restante.toLocaleString()}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {additionalMethods.map((m) => (
          <Pressable
            key={m}
            onPress={() => onSelect(m)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: metodoPagoAdicional === m ? accentColor : borderColor,
              backgroundColor: metodoPagoAdicional === m ? `${accentColor}10` : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: metodoPagoAdicional === m ? accentColor : textSecondary, fontSize: 9, fontWeight: '800' }}>
              {m.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
