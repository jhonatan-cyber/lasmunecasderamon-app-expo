import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';

interface BaucherCardProps {
  baucherFoto: string | null;
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
  accentColor,
  onAttach,
  onRemove,
}) => {
   const { accentOnSurface } = useAccentColor();
  return (
    <View style={styles.baucherContainer}>
      {!!baucherFoto && (
        <View style={styles.baucherInfoRow}>
          <Image source={{ uri: baucherFoto }} style={styles.baucherThumb} />
          <Pressable
            onPress={onRemove}
            style={styles.baucherQuitar}
            accessibilityRole="button"
            accessibilityLabel="Quitar baucher"
          >
            <Ionicons name="close" size={16} />
          </Pressable>
        </View>
      )}
      <View style={styles.baucherActionRow}>
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  baucherContainer: {
    marginTop: 12,
    gap: 8,
    alignItems: 'center',
  },
  baucherInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  baucherThumb: { width: 42, height: 42, borderRadius: 9999 },
  baucherActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  baucherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  baucherBtnText: { fontSize: 12, fontFamily: FontFamily.extrabold },
  baucherQuitar: { padding: 2 },
});
