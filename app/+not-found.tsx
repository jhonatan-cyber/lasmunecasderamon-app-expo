import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontFamily } from '@/constants/fonts';

export default function NotFoundScreen() {
  const { accentColor, accentText, bg, textPrimary, textSecondary } = useAccentColor();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: textPrimary }]}>Pantalla no encontrada</Text>
      <Text style={[styles.message, { color: textSecondary }]}>
        La dirección a la que intentaste acceder no existe o fue movida.
      </Text>
      <Link href="/" asChild>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: accentColor },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
        >
          <Text style={[styles.btnText, { color: accentText }]}>Volver al inicio</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: { fontSize: 22, fontFamily: FontFamily.black, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  btnText: { fontSize: 15, fontFamily: FontFamily.extrabold },
  pressed: { opacity: 0.7 },
});
