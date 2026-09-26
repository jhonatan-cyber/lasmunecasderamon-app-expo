import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAccentColor } from '@/hooks/useAccentColor';

/**
 * Aviso de caja cerrada (espejo de `CajaStatusCheck` del dashboard): explica
 * el bloqueo y ofrece ir a abrir caja. El envío queda deshabilitado por
 * `cajaAbierta === false` en la pantalla (antes esto se avisaba con un toast
 * efímero, que se perdía al scrollear).
 */
export const CajaClosedBanner: React.FC = () => {
  const { isDark } = useAccentColor();
  const router = useRouter();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
          borderColor: isDark ? 'rgba(239,68,68,0.40)' : '#FCA5A5',
        },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons name="warning-outline" size={18} color={isDark ? '#F87171' : '#DC2626'} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
          No hay caja abierta.
        </Text>
        <Text style={[styles.message, { color: isDark ? '#FECACA' : '#B91C1C' }]}>
          No se pueden realizar ventas sin una caja abierta.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/cajero/caja')}
        style={[styles.button, { borderColor: isDark ? '#F87171' : '#FCA5A5' }]}
        accessibilityLabel="Abrir Caja"
        accessibilityRole="button"
        hitSlop={8}
      >
        <Text style={[styles.buttonText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
          Abrir Caja
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
  },
  message: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
