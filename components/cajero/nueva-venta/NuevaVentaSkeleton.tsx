import React from 'react';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { View, ScrollView, StyleSheet, AccessibilityRole } from 'react-native';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { Skeleton } from '@/components/ui/Skeleton';

type Props = {
  bg: string;
  cardBg: string;
  borderColor: string;
  spacing: number;
};

export function NuevaVentaSkeleton({ bg, cardBg, borderColor, spacing }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PremiumHeader
        title="Nueva Venta"
        subtitle="Cargando información..."
      />
      <View style={{ padding: spacing }}>
        <View style={{ marginBottom: 25 }}>
          <Skeleton width={180} height={20} accessibilityRole="textfield" accessibilityLabel="Monto total" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width={120} height={100} borderRadius={20} accessibilityRole="button" accessibilityLabel="Producto para vender" />
            ))}
          </ScrollView>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Skeleton width={150} height={15} accessibilityRole="textfield" accessibilityLabel="Descripción" />
          <Skeleton width="100%" height={50} borderRadius={16} accessibilityRole="textfield" accessibilityLabel="Campo 1" />
          <Skeleton width="100%" height={50} borderRadius={16} accessibilityRole="textfield" accessibilityLabel="Campo 2" />
          <Skeleton width="100%" height={80} borderRadius={16} accessibilityRole="textfield" accessibilityLabel="Resumen de venta" />
        </View>

        <Skeleton width="100%" height={200} borderRadius={32} accessibilityRole="textfield" accessibilityLabel="Total de la venta" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  backBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    gap: 6,
  },
  backTextRight: { fontFamily: FontFamily.extrabold, fontSize: 13, letterSpacing: 0.5 },
});
