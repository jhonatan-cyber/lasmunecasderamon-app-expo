import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MetodoPagoMonto } from './types';

type Props = {
  pagosMixtos: MetodoPagoMonto[];
  totalsTotal: number;
  selectedClientSaldo: number;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  onUpdatePago: (index: number, monto: number, display?: string) => void;
  onRemovePago: (index: number) => void;
  onAddPago: (metodo: string) => void;
};

export function PagosMixtosSection({
  pagosMixtos,
  totalsTotal,
  selectedClientSaldo,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  onUpdatePago,
  onRemovePago,
  onAddPago,
}: Props) {
  const sumaActual = pagosMixtos.reduce((sum, p) => sum + p.monto, 0);
  const yaCompleto = sumaActual >= totalsTotal;

  return (
    <View
      style={{
        marginTop: 16,
        padding: 12,
        backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
        borderRadius: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Ionicons name="shuffle-outline" size={18} color={accentColor} />
        <Text
          style={{
            color: textPrimary,
            fontSize: 13,
            fontWeight: '800',
            marginLeft: 8,
            textTransform: 'uppercase',
          }}
        >
          Distribución de Pagos (Total: ${totalsTotal.toLocaleString()})
        </Text>
      </View>

      {pagosMixtos.map((pago, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ width: 150, flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                color: textSecondary,
                fontSize: 10,
                textTransform: 'uppercase',
                fontWeight: '700',
              }}
            >
              {pago.metodo}
            </Text>
          </View>
          <Text style={{ color: textSecondary, fontSize: 12, marginRight: 4 }}>$</Text>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: cardBg,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 6,
              color: textPrimary,
              borderWidth: 1,
              borderColor: borderColor,
              fontSize: 13,
            }}
            value={pago.display}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={textSecondary}
            onChangeText={(text) => {
              const clean = text.replace(/\D/g, '');
              const monto = clean ? parseInt(clean, 10) : 0;
              onUpdatePago(index, monto, clean);
            }}
            onBlur={() => {
              onUpdatePago(
                index,
                pago.monto,
                pago.monto > 0 ? pago.monto.toLocaleString('es-CL') : '',
              );
            }}
          />
          <Pressable
            onPress={() => onRemovePago(index)}
            style={{ marginLeft: 8, padding: 4 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </Pressable>
        </View>
      ))}

      {/* Add more payment methods */}
      <View style={{ marginTop: 12 }}>
        <Text
          style={{
            color: textSecondary,
            fontSize: 11,
            marginBottom: 8,
            fontWeight: '600',
          }}
        >
          {yaCompleto ? 'Total completado' : 'Agregar método de pago:'}
        </Text>
        {!yaCompleto && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['efectivo', 'tarjeta', 'transferencia', 'prepago'].map((metodo) => {
              if (pagosMixtos.some((p) => p.metodo === metodo)) return null;
              const sinSaldo = metodo === 'prepago' && selectedClientSaldo <= 0;
              return (
                <Pressable
                  key={metodo}
                  onPress={() => {
                    if (sinSaldo) return;
                    onAddPago(metodo);
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: sinSaldo ? textSecondary : accentColor,
                    backgroundColor: sinSaldo ? 'transparent' : `${accentColor}10`,
                    opacity: sinSaldo ? 0.35 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: sinSaldo ? textSecondary : accentColor,
                      fontSize: 11,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    {metodo}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Sum vs Total */}
      <View
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: borderColor,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: textSecondary, fontSize: 12 }}>Suma actual:</Text>
          <Text
            style={{
              color: sumaActual === totalsTotal ? '#10B981' : '#EF4444',
              fontWeight: '700',
            }}
          >
            ${sumaActual.toLocaleString()}
          </Text>
        </View>
        {sumaActual !== totalsTotal && (
          <Text style={{ color: '#EF4444', fontSize: 10, marginTop: 4 }}>
            * Falta: ${(totalsTotal - sumaActual).toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );
}
