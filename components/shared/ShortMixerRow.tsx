import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OrderProductPhoto } from '@/components/shared/OrderProductPhoto';
import type { ShortMixer } from '@/components/shared/ShotMixerSelector';

interface ShortMixerRowProps {
  item: {
    nombre: string;
    cantidad: number;
    shot_anfitriona?: boolean;
    acompanamiento_corto?: ShortMixer;
  };
  loading: boolean;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  includedText: string;
  onPress: () => void;
}

export const ShortMixerRow: React.FC<ShortMixerRowProps> = ({
  item,
  loading,
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
        accessibilityLabel={`Soda o gaseosa para ${item.nombre}`}
        disabled={loading}
        onPress={onPress}
        style={{
          padding: 12,
          borderColor,
          borderWidth: 1,
          borderRadius: 10,
        }}
      >
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
