import React from 'react';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  const { accentColor, accentText, accentBg, accentBorder, accentOnSurface } = useAccentColor();
  const router = useRouter();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: accentBg,
          borderColor: accentBorder,
        },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons name="warning-outline" size={18} color={accentColor} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: accentOnSurface }]}>
          No hay caja abierta.
        </Text>
        <Text style={[styles.message, { color: accentOnSurface }]}>
          No se pueden realizar ventas sin una caja abierta.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/cajero/caja')}
        style={[styles.button, { borderColor: accentColor }]}
        accessibilityLabel="Abrir Caja"
        accessibilityRole="button"
        hitSlop={8}
      >
        <Text style={[styles.buttonText, { color: accentColor }]}>
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
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: 16,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: FontFamily.black,
  },
  message: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    marginTop: 2,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 12,
    fontFamily: FontFamily.extrabold,
  },
});
