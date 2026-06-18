import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        rightComponent={
          <View style={styles.backBtnRight}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" style={{ opacity: 0.5 }} />
            <Text style={[styles.backTextRight, { opacity: 0.5 }]}>Atrás</Text>
          </View>
        }
      />
      <View style={{ padding: spacing }}>
        <View style={{ marginBottom: 25 }}>
          <Skeleton width={180} height={20} style={{ marginBottom: 15 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width={120} height={100} borderRadius={20} />
            ))}
          </ScrollView>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Skeleton width={150} height={15} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={50} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={50} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} borderRadius={16} />
        </View>

        <Skeleton width="100%" height={200} borderRadius={32} />
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
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    gap: 6,
  },
  backTextRight: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
});
