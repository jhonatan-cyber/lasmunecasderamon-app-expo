import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius } from '@/constants/spacing';
import { useAccentColor } from '@/hooks/useAccentColor';

export function EmployeeListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { isDark } = useAccentColor();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1F1414' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FECACA' },
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.4}
        style={[styles.message, { color: isDark ? '#FCA5A5' : '#991B1B' }]}
      >
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    gap: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  message: { fontSize: 15, lineHeight: 21 },
  button: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 20,
    backgroundColor: '#991B1B',
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
