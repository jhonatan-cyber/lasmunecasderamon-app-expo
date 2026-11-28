import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BorderRadius } from '@/constants/spacing';
import { OrderProductPhoto } from '@/components/shared/OrderProductPhoto';
import type { ShortMixer } from '@/components/shared/ShotMixerSelector';

interface ShortMixerRowProps {
  item: {
    nombre: string;
    cantidad: number;
    shot_anfitriona?: boolean;
    acompanamiento_corto?: ShortMixer;
  };
  /** Número del corto cuando la línea se configura por unidad. */
  unidad?: number;
  loading: boolean;
  disabled?: boolean;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  includedText: string;
  onPress: () => void;
}

export const ShortMixerRow: React.FC<ShortMixerRowProps> = ({
  item,
  unidad,
  loading,
  disabled = false,
  borderColor,
  textPrimary,
  textSecondary,
  includedText,
  onPress,
}) => {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Soda o gaseosa para ${item.nombre}${
          unidad ? `, corto ${unidad}` : ""
        }`}
        disabled={disabled || loading}
        onPress={onPress}
        style={{
          minHeight: 44,
          justifyContent: 'center',
          padding: 12,
          borderColor,
          borderWidth: 1,
          borderRadius: BorderRadius.full,
          opacity: disabled || loading ? 0.5 : 1,
        }}
      >
        {unidad !== undefined && (
          <Text
            style={{ color: textSecondary, fontSize: 11, marginBottom: 6 }}
          >
            Corto {unidad}
          </Text>
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {item.acompanamiento_corto && (
            <OrderProductPhoto
              foto={item.acompanamiento_corto.foto}
              name={item.acompanamiento_corto.nombre || 'Bebida'}
            />
          )}
          <Text style={{ color: textPrimary, flex: 1 }}>
            {item.acompanamiento_corto?.nombre ||
              'Seleccionar producto o sabor del bar'}
          </Text>
        </View>
      </Pressable>
      <Text style={{ color: textSecondary }}>
        {includedText}
      </Text>
    </>
  );
};
