import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

export default function NotFoundScreen() {
  const isDark = useColorScheme() === 'dark';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F3F4F6' }]}>
      <Text style={[styles.title, { color: textPrimary }]}>Pantalla no encontrada</Text>
      <Text style={[styles.message, { color: textSecondary }]}>
        La dirección a la que intentaste acceder no existe o fue movida.
      </Text>
      <Link href="/" asChild>
        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
          <Text style={styles.btnText}>Volver al inicio</Text>
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
  title: { fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: {
    backgroundColor: '#E11D48',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
