import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BorderRadius } from '@/constants/spacing';
import { OrderProductPhoto } from '@/components/shared/OrderProductPhoto';
import type { AcompanamientoBotellaItem } from '@/types/cart';

interface BottleMixerRowProps {
  sabor: AcompanamientoBotellaItem;
  max: number;
  stock: number;
  textPrimary: string;
  textSecondary: string;
  onDecrement: () => void;
  onIncrement: () => void;
  onDelete: () => void;
}

export const BottleMixerRow: React.FC<BottleMixerRowProps> = ({
  sabor,
  max,
  stock,
  textPrimary,
  textSecondary,
  onDecrement,
  onIncrement,
  onDelete,
}) => {
  const nombre = sabor.nombre || sabor.presentacion_id;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <OrderProductPhoto foto={sabor.foto} name={nombre} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: textPrimary }}>{nombre}</Text>
        <Text style={{ color: textSecondary, fontSize: 12 }}>
          Stock: {stock} · máx {max}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quitar una unidad de ${nombre}`}
        disabled={sabor.unidades <= 1}
        onPress={onDecrement}
        style={{
          width: 32,
          height: 32,
          borderRadius: BorderRadius.full,
          backgroundColor: 'rgba(155,155,155,0.1)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: sabor.unidades <= 1 ? 0.4 : 1,
        }}
      >
        <Ionicons name="remove" size={16} color={textPrimary} />
      </Pressable>
      <Text
        style={{
          color: textPrimary,
          marginHorizontal: 12,
          fontSize: 14,
          fontWeight: '900',
        }}
      >
        {sabor.unidades}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Agregar una unidad de ${nombre}`}
        disabled={sabor.unidades >= max}
        onPress={onIncrement}
        style={{
          width: 32,
          height: 32,
          borderRadius: BorderRadius.full,
          backgroundColor: 'rgba(155,155,155,0.1)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: sabor.unidades >= max ? 0.4 : 1,
        }}
      >
        <Ionicons name="add" size={16} color={textPrimary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${nombre}`}
        onPress={onDelete}
        style={{
          width: 32,
          height: 32,
          borderRadius: BorderRadius.full,
          backgroundColor: 'rgba(239,68,68,0.1)',
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: 12,
        }}
      >
        <Ionicons name="trash-outline" size={16} color="#EF4444" />
      </Pressable>
    </View>
  );
};
