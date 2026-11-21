import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAccentColor } from '@/hooks/useAccentColor';

interface BaucherCardProps {
  baucherFoto: string | null;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  onAttach: () => void;
  onRemove: () => void;
}

/**
 * Tarjeta para adjuntar el baucher de transferencia.
 * Extraído de nueva-venta.tsx para reducir el tamaño del screen.
 */
export const BaucherCard: React.FC<BaucherCardProps> = ({
  baucherFoto,
  textPrimary,
  textSecondary,
  accentColor,
  onAttach,
  onRemove,
}) => {
    const { accentOnSurface } = useAccentColor();
  return (
    <View
      style={[
        styles.baucherCard,
        {
          borderColor: baucherFoto ? '#10B981' : '#EF4444',
          backgroundColor: baucherFoto
            ? 'rgba(16,185,129,0.08)'
            : 'rgba(239,68,68,0.08)',
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.baucherTitulo, { color: textPrimary }]}>
          Baucher de la transferencia
        </Text>
        <Text style={[styles.baucherHint, { color: textSecondary }]}>
          {baucherFoto
            ? 'Foto adjunta lista para enviar.'
            : 'Obligatorio: adjunta la foto o captura del comprobante.'}
        </Text>
      </View>
      {baucherFoto && (
        <Image source={{ uri: baucherFoto }} style={styles.baucherThumb} />
      )}
      <Pressable
        onPress={onAttach}
        style={[styles.baucherBtn, { borderColor: accentColor }]}
        accessibilityRole="button"
        accessibilityLabel="Adjuntar baucher de la transferencia"
      >
        <Ionicons
          name={baucherFoto ? 'refresh' : 'camera'}
          size={18}
          color={accentOnSurface}
        />
        <Text style={[styles.baucherBtnText, { color: accentOnSurface }]}>
          {baucherFoto ? 'Repetir' : 'Adjuntar'}
        </Text>
      </Pressable>
      {baucherFoto && (
        <Pressable
          onPress={onRemove}
          style={styles.baucherQuitar}
          accessibilityRole="button"
          accessibilityLabel="Quitar baucher"
        >
          <Ionicons name="close" size={16} color={textSecondary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  baucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  baucherTitulo: { fontSize: 13, fontWeight: '800' },
  baucherHint: { fontSize: 12, fontWeight: '600', marginTop: 2, lineHeight: 16 },
  baucherThumb: { width: 42, height: 42, borderRadius: 10 },
  baucherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  baucherBtnText: { fontSize: 12, fontWeight: '800' },
  baucherQuitar: { padding: 2 },
});
