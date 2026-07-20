import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { getIvaPercent } from '@/hooks/utils/cuentaUtils';

type Props = {
  hasAnfitrionaComision: boolean;
  totals: {
    subTotal: number;
    iva: number;
    total: number;
    precioHabitacionActual: number;
    precioServicioActual: number;
    comisionPorAnfitriona: number;
  };
  comisionAnfitriona: number;
  hostessCount: number;
  selectedHabitacionNombre: string;
  metodoPago: string;
  desgloseTarjeta: { venta: number; propina: number };
  submitting: boolean;
  cajaAbierta: boolean | null;
  accentColor: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  onSubmit: () => void;
};

export function ServiceSummaryCard({
  hasAnfitrionaComision,
  totals,
  comisionAnfitriona,
  hostessCount,
  selectedHabitacionNombre,
  metodoPago,
  desgloseTarjeta,
  submitting,
  cajaAbierta,
  accentColor,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  onSubmit,
}: Props) {
  return (
    <View
      style={{
        marginTop: 10,
        padding: 24,
        borderRadius: 32,
        borderWidth: 1,
        elevation: 20,
        backgroundColor: isDark ? '#1E1B4B' : '#FFFFFF',
        borderTopColor: borderColor,
      }}
    >
      <View style={summaryRow}>
        <Text style={[summaryLabel, { color: textSecondary }]}>Subtotal</Text>
        <Text style={[summaryVal, { color: textPrimary }]}>
          ${(
            hasAnfitrionaComision ? totals.precioHabitacionActual : totals.subTotal
          ).toLocaleString()}
        </Text>
      </View>
      {!hasAnfitrionaComision && (
        <View style={summaryRow}>
          <Text style={[summaryLabel, { color: textSecondary }]}>Habitación</Text>
          <Text style={[summaryVal, { color: textPrimary }]}>
            ${totals.precioHabitacionActual.toLocaleString()}
          </Text>
        </View>
      )}
      {comisionAnfitriona > 0 && hostessCount > 0 && (
        <>
          <View style={[summaryRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: borderColor }]}>
            <Text style={[summaryLabel, { color: '#10B981', fontWeight: '800' }]}>
              Comisión total
            </Text>
            <Text style={[summaryVal, { color: '#10B981', fontWeight: '800' }]}>
              ${comisionAnfitriona.toLocaleString()}
            </Text>
          </View>
          <View style={summaryRow}>
            <Text style={[summaryLabel, { color: '#10B981' }]}>Comisión p/Anf</Text>
            <Text style={[summaryVal, { color: '#10B981' }]}>
              ${totals.comisionPorAnfitriona.toLocaleString()} x {hostessCount}
            </Text>
          </View>
        </>
      )}
      {metodoPago === 'tarjeta' && (
        <View style={summaryRow}>
          <Text style={[summaryLabel, { color: textSecondary }]}>{`Impuesto IVA (${getIvaPercent()}%)`}</Text>
          <Text style={[summaryVal, { color: '#10B981' }]}>
            +${totals.iva.toLocaleString()}
          </Text>
        </View>
      )}
      <View
        style={[
          summaryRow,
          {
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: borderColor,
            paddingTop: 12,
          },
        ]}
      >
        <Text style={[totalLabelFinal, { color: textPrimary }]}>TOTAL SERVICIO</Text>
        <Text style={[totalValFinal, { color: accentColor }]}>
          ${totals.total.toLocaleString()}
        </Text>
      </View>
      {metodoPago === 'tarjeta' && totals.total > 0 && (
        <View
          style={[
            cardNoteBox,
            {
              backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB',
              borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A',
            },
          ]}
        >
          <Text style={[cardNoteTitle, { color: isDark ? '#FCD34D' : '#92400E' }]}>
            Nota importante
          </Text>
          <Text style={[cardNoteText, { color: isDark ? '#FDE68A' : '#78350F' }]}>
            Generá venta por ${desgloseTarjeta.venta.toLocaleString()} y propina por $
            {desgloseTarjeta.propina.toLocaleString()}.
          </Text>
        </View>
      )}
      <Pressable
        style={[
          submitBtn,
          { backgroundColor: accentColor },
          (submitting || !cajaAbierta) && { opacity: 0.7 },
        ]}
        onPress={onSubmit}
        disabled={submitting || !cajaAbierta}
        accessibilityLabel="Generar nuevo servicio"
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={submitBtnText}>Generar Servicio</Text>
        )}
      </Pressable>
    </View>
  );
}

const summaryRow: any = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 6,
};
const summaryLabel: any = { fontSize: 14, fontWeight: '600' };
const summaryVal: any = { fontSize: 15, fontWeight: '800' };
const totalLabelFinal: any = { fontSize: 16, fontWeight: '900' };
const totalValFinal: any = { fontSize: 28, fontWeight: '900' };
const cardNoteBox: any = {
  marginTop: 12,
  borderRadius: 14,
  borderWidth: 1,
  paddingHorizontal: 12,
  paddingVertical: 10,
  gap: 4,
};
const cardNoteTitle: any = { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' };
const cardNoteText: any = { fontSize: 12, fontWeight: '600', lineHeight: 18 };
const submitBtn: any = {
  height: 60,
  borderRadius: 9999,
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 24,
};
const submitBtnText: any = { color: '#FFF', fontSize: 17, fontWeight: '900' };
