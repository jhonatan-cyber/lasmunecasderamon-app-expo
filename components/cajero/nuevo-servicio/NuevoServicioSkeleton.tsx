import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { Skeleton } from '@/components/ui/Skeleton';

type Props = {
  bg: string;
  cardBg: string;
  borderColor: string;
};

export function NuevoServicioSkeleton({ bg, cardBg, borderColor }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PremiumHeader
        title="Nuevo Servicio"
        subtitle="Cargando información..."
        rightComponent={
          <View style={[styles.backBtnRight, { opacity: 0.5 }]}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextRight}>Atrás</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Skeleton width={180} height={15} style={{ marginBottom: 20 }} />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={60} borderRadius={16} style={{ marginBottom: 12 }} />
          ))}
          <Skeleton width={150} height={12} style={{ marginTop: 10, marginBottom: 10 }} />
          <Skeleton width="100%" height={54} borderRadius={16} />
        </View>
        <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <Skeleton width={80} height={15} />
            <Skeleton width={80} height={15} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 25,
              borderTopWidth: 1,
              borderTopColor: borderColor,
              paddingTop: 15,
            }}
          >
            <Skeleton width={120} height={20} />
            <Skeleton width={100} height={30} />
          </View>
          <Skeleton width="100%" height={60} borderRadius={20} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  summaryCard: { marginTop: 10, padding: 24, borderRadius: 32, borderWidth: 1, elevation: 20 },
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
