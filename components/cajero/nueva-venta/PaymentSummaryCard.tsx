import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { individualShorts } from '@/hooks/utils/individualShorts';
import { getCardSplit } from '@/hooks/utils/cuentaUtils';
import { TipCheckbox } from '@/components/cajero/forms/TipCheckbox';
import { ensureContrast } from '@/utils/color';

interface PaymentSummaryCardProps {
  cart: any[];
  totals: { subtotal: number; tip: number; total: number; recargoAcompanamiento: number };
  enableTip: boolean;
  metodoPago: string | undefined;
  cajaAbierta: boolean | null;
  baucherFoto: string | null;
  isDark: boolean;
  splitVentaPct: number;
  splitPropinaPct: number;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  spacing: number;
  borderRadius: number;
  onToggleTip: (val: boolean) => void;
  onDispatchCart: (action: any) => void;
}

/**
 * Tarjeta de resumen de pago: subtotal, propina, total y avisos de lo que
 * falta. El único CTA de cobro vive en la barra sticky para no duplicar la
 * acción principal en la misma pantalla.
 */
export const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({
  cart,
  totals,
  enableTip,
  metodoPago,
  cajaAbierta,
  baucherFoto,
  isDark,
  splitVentaPct,
  splitPropinaPct,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  accentColor,
  spacing,
  borderRadius,
  onToggleTip,
  onDispatchCart,
}) => {
  // El acento como texto necesita 4.5:1 sobre la tarjeta; con Ámbar el color
  // original quedaba en 2.9:1.
  const accentTextSafe = ensureContrast(accentColor, cardBg, 4.5);

  const dynamicStyles = {
    summaryCard: { padding: spacing + 8, borderRadius: borderRadius + 4 },
  };

  return (
    <View
      style={[
        styles.summaryCard,
        dynamicStyles.summaryCard,
        { backgroundColor: cardBg, borderColor },
      ]}
    >
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          Subtotal
        </Text>
        <Text style={[styles.summaryVal, { color: textPrimary }]}>
          ${totals.subtotal.toLocaleString()}
        </Text>
      </View>
      {totals.recargoAcompanamiento && totals.recargoAcompanamiento > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: '#F59E0B' }]}>
            Acompañamiento extra
          </Text>
          <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>
            +${totals.recargoAcompanamiento.toLocaleString()}
          </Text>
        </View>
      )}
      {cart.some(
        (item) => item.tipo_venta === 'shot' && item.quantity > 1,
      ) && (
        <Pressable
          onPress={() =>
            onDispatchCart({
              type: 'SET_CART',
              payload: individualShorts(cart),
            })
          }
          style={{ paddingVertical: 12 }}
        >
          <Text style={{ color: accentTextSafe, fontWeight: '600' }}>
            Elegir bebida y anfitriona por cada corto
          </Text>
        </Pressable>
      )}
      <TipCheckbox
        enabled={enableTip}
        onToggle={onToggleTip}
        tipAmount={totals.tip}
      />
      <View
        style={[
          styles.summaryRow,
          {
            marginTop: 10,
            borderTopWidth: 1,
            borderTopColor: borderColor,
            paddingTop: 10,
          },
        ]}
      >
        <Text style={[styles.totalLabel, { color: textPrimary }]}>
          TOTAL
        </Text>
        <Text style={[styles.totalValue, { color: accentTextSafe }]}>
          ${totals.total.toLocaleString()}
        </Text>
      </View>
      {metodoPago === 'tarjeta' &&
        totals.total > 0 &&
        (() => {
          const splitTarjeta = getCardSplit(totals.total);
          return (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                backgroundColor: isDark
                  ? 'rgba(245,158,11,0.12)'
                  : '#FFFBEB',
                borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  color: isDark ? '#FCD34D' : '#92400E',
                  marginBottom: 4,
                }}
              >
                Tarjetero
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  lineHeight: 18,
                  color: isDark ? '#FDE68A' : '#78350F',
                }}
              >
                Genera venta por ${splitTarjeta.venta.toLocaleString()} (
                {splitVentaPct}%) y propina por $
                {splitTarjeta.propina.toLocaleString()} ({splitPropinaPct}
                %). Solo informativo, no afecta la caja.
              </Text>
            </View>
          );
        })()}
      {cart.length > 0 && (
        (() => {
          if (cajaAbierta === false) {
            return (
              <Text style={{ textAlign: 'center', color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                Caja cerrada: debe abrirse para registrar ventas
              </Text>
            );
          }
          if (!metodoPago) {
            return (
              <Text style={{ textAlign: 'center', color: '#F59E0B', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                Seleccioná un método de pago para finalizar
              </Text>
            );
          }
          if (metodoPago === 'transferencia' && !baucherFoto) {
            return (
              <Text style={{ textAlign: 'center', color: '#F59E0B', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                Adjuntá el baucher de la transferencia
              </Text>
            );
          }
          return null;
        })()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  summaryCard: { padding: 24, borderRadius: 32, borderWidth: 1, marginTop: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, fontWeight: '600' },
  summaryVal: { fontSize: 15, fontWeight: '800' },
  totalLabel: { fontSize: 18, fontWeight: '900' },
  totalValue: { fontSize: 26, fontWeight: '900' },
});
