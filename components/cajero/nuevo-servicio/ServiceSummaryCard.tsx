import React, { useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAccentColor } from '@/hooks/useAccentColor';
import { BorderRadius } from '@/constants/spacing';
import { getIvaPercent } from '@/hooks/utils/cuentaUtils';

// ─── CollapsibleCard ───

type CollapsibleCardProps = {
  title: string;
  icon?: string;
  iconColor?: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
};

export function CollapsibleCard({
  title,
  icon,
  iconColor,
  children,
  defaultCollapsed = false,
  collapsed: collapsedProp,
  onToggle,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
}: CollapsibleCardProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed((p) => !p);
    }
  };

  return (
    <View
      style={{
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: cardBg,
        borderColor: borderColor,
        marginBottom: 16,
      }}
    >
      <Pressable
        onPress={toggle}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 12 }}
        accessibilityRole="button"
        accessibilityLabel={collapsed ? `Expandir ${title}` : `Contraer ${title}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? (
            <Ionicons name={icon as any} size={18} color={iconColor || textPrimary} />
          ) : null}
          <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>{title}</Text>
        </View>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={textPrimary}
          style={{ opacity: 0.6 }}
        />
      </Pressable>
      {!collapsed && <View>{children}</View>}
    </View>
  );
}

// ─── ServiceInfoCard (Información + Subtotales) ───

type ServiceInfoCardProps = {
  anfitrionasNicks: string[];
  habitacionNombre: string;
  tiempo: number;
  clienteNombre: string;
  hasAnfitrionaComision: boolean;
  totals: {
    subTotal: number;
    iva: number;
    total: number;
    precioHabitacionActual: number;
    precioServicioActual: number;
    comisionPorAnfitriona: number;
  };
  hostessCount: number;
  metodoPago: string;
  desgloseTarjeta: { venta: number; propina: number };
  borderColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

export function ServiceInfoCard({
  anfitrionasNicks,
  habitacionNombre,
  tiempo,
  clienteNombre,
  hasAnfitrionaComision,
  totals,
  hostessCount,
  metodoPago,
  desgloseTarjeta,
  borderColor,
  cardBg,
  textPrimary,
  textSecondary,
  isDark,
}: ServiceInfoCardProps) {
  return (
    <CollapsibleCard
      title="Información de Servicio"
      icon="information-circle"
      iconColor="#3B82F6"
      cardBg={cardBg}
      borderColor={borderColor}
      textPrimary={textPrimary}
      textSecondary={textSecondary}
    >
      <View style={{ gap: 8 }}>
        {/* Info del servicio */}
        <View style={summaryRow}>
          <Text style={[infoLabel, { color: textSecondary }]}>
            <Ionicons name="people" size={14} color={textSecondary} />
            <Text style={{ marginLeft: 8 }}>Anfitrionas</Text>
          </Text>
          <Text style={[infoVal, { color: textPrimary }]}>
            {anfitrionasNicks.join(", ")}
          </Text>
        </View>
        <View style={summaryRow}>
          <Text style={[infoLabel, { color: textSecondary }]}>
            <Ionicons name="time" size={14} color={textSecondary} />
            <Text style={{ marginLeft: 8 }}>Tiempo</Text>
          </Text>
          <Text style={[infoVal, { color: textPrimary }]}>
            {tiempo} min
          </Text>
        </View>
        <View style={summaryRow}>
          <Text style={[infoLabel, { color: textSecondary }]}>
            <Ionicons name="business" size={14} color={textSecondary} />
            <Text style={{ marginLeft: 8 }}>Habitación</Text>
          </Text>
          <Text style={[infoVal, { color: textPrimary }]}>
            {habitacionNombre}
          </Text>
        </View>
        {clienteNombre ? (
          <View style={summaryRow}>
            <Text style={[infoLabel, { color: textSecondary }]}>
              <Ionicons name="person" size={14} color={textSecondary} />
              <Text style={{ marginLeft: 8 }}>Cliente</Text>
            </Text>
            <Text style={[infoVal, { color: textPrimary }]}>
              {clienteNombre}
            </Text>
          </View>
        ) : null}

        {/* Desglose por anfitriona */}
        {totals.comisionPorAnfitriona > 0 && hostessCount > 0 && (
          <>
            <View style={[dividerStyle, { borderColor }]} />
            <Text style={[sectionLabel, { color: textSecondary }]}>Desglose por anfitriona</Text>
            {anfitrionasNicks.map((nick, i) => (
              <View key={i} style={summaryRow}>
                <Text style={[infoLabel, { color: textSecondary }]}>
                  <Ionicons name="person-circle" size={14} color={textSecondary} />
                  <Text style={{ marginLeft: 8 }}>{nick}</Text>
                </Text>
                <Text style={[infoVal, { color: textPrimary }]}>
                  ${totals.comisionPorAnfitriona.toLocaleString()}
                </Text>
              </View>
            ))}
            <View style={[summaryRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: borderColor }]}>
              <Text style={[summaryLabel, { color: textPrimary, fontWeight: '800' }]}>
                Comisión total
              </Text>
              <Text style={[summaryVal, { color: textPrimary, fontWeight: '800' }]}>
                ${(totals.comisionPorAnfitriona * hostessCount).toLocaleString()}
              </Text>
            </View>
          </>
        )}

        {/* Subtotales */}
        <View style={[dividerStyle, { borderColor }]} />
        <Text style={[sectionLabel, { color: textSecondary }]}>Subtotales</Text>
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
        {totals.comisionPorAnfitriona > 0 && hostessCount > 0 && (
          <View style={summaryRow}>
            <Text style={[summaryLabel, { color: textSecondary }]}>Comisión p/Anf</Text>
            <Text style={[summaryVal, { color: textSecondary }]}>
              ${totals.comisionPorAnfitriona.toLocaleString()} x {hostessCount}
            </Text>
          </View>
        )}
        {metodoPago === 'tarjeta' && (
          <View style={summaryRow}>
            <Text style={[summaryLabel, { color: textSecondary }]}>{`Impuesto IVA (${getIvaPercent()}%)`}</Text>
            <Text style={[summaryVal, { color: textSecondary }]}>
              +${totals.iva.toLocaleString()}
            </Text>
          </View>
        )}
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
              {desgloseTarjeta.propina.toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    </CollapsibleCard>
  );
}

type ActionCardProps = {
  totals: {
    subTotal: number;
    iva: number;
    total: number;
    precioHabitacionActual: number;
    precioServicioActual: number;
    comisionPorAnfitriona: number;
  };
  hostessCount: number;
  selectedHabitacionNombre: string;
  metodoPago: string;
  submitting: boolean;
  cajaAbierta: boolean | null;
  accentColor: string;
  accentText: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  needsBaucher?: boolean;
  hasBaucher?: boolean;
  onSubmit: () => void;
};

export function ServiceSummaryCard({
  totals,
  hostessCount,
  selectedHabitacionNombre,
  metodoPago,
  submitting,
  cajaAbierta,
  accentColor,
  accentText,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  needsBaucher,
  hasBaucher,
  onSubmit,
}: ActionCardProps) {
  const isDisabled =
    submitting ||
    !cajaAbierta ||
    !metodoPago ||
    hostessCount === 0 ||
    !selectedHabitacionNombre ||
    (needsBaucher && !hasBaucher);

  return (
    <View
      style={{
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      <View style={actionRow}>
        <View style={{ flex: 1 }}>
          <Text style={[stickyTotalLabel, { color: textSecondary }]}>TOTAL</Text>
          <Text style={[stickyTotalValue, { color: accentColor }]}>
            ${totals.total.toLocaleString()}
          </Text>
        </View>
        <Pressable
          style={[
            submitBtn,
            { backgroundColor: accentColor },
            isDisabled && { opacity: 0.7 },
          ]}
          onPress={onSubmit}
          disabled={isDisabled}
          accessibilityLabel="Generar nuevo servicio"
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[submitBtnText, { color: accentText }]}>Generar Servicio</Text>
          )}
        </Pressable>
      </View>
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
const infoLabel: any = { fontSize: 13, fontWeight: '700', flexDirection: 'row', alignItems: 'center' };
const infoVal: any = { fontSize: 14, fontWeight: '700' };
const dividerStyle: any = { height: 1, marginTop: 8, marginBottom: 8 };
const sectionLabel: any = { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, opacity: 0.6 };
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
const actionRow: any = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
};
const stickyTotalLabel: any = { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.6 };
const stickyTotalValue: any = { fontSize: 24, fontWeight: '900' };
const submitBtn: any = {
  height: 48,
  borderRadius: BorderRadius.full,
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 24,
  minWidth: 140,
  flexShrink: 0,
};
const submitBtnText: any = { fontSize: 14, fontWeight: '800' };
