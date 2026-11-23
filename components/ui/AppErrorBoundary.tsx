import logger from '@/utils/logger';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { router } from 'expo-router';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

interface BoundaryState {
  error: Error | null;
}

class Boundary extends Component<
  { isDark: boolean; bg: string; textPrimary: string; textSecondary: string; accentColor: string; accentText: string; children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.captureException(error, { context: 'ErrorBoundary', componentStack: info.componentStack });
  }

  private reintentar = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { bg, textPrimary, textSecondary, accentColor, accentText, children } = this.props;

    if (!error) return children;

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Text style={[styles.title, { color: textPrimary }]}>Algo salió mal</Text>
        <Text style={[styles.message, { color: textSecondary }]}>
          La pantalla encontró un error inesperado. Podés reintentar o volver al inicio.
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={this.reintentar}
            accessibilityRole="button"
            accessibilityLabel="Reintentar carga de la pantalla"
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: accentColor }, pressed && styles.pressed]}
          >
            <Text style={[styles.primaryText, { color: accentText }]}>Reintentar</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio de la aplicación"
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.secondaryText, { color: textSecondary }]}>
              Volver al inicio
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { isDark, bg, textPrimary, textSecondary, accentColor, accentText } = useAccentColor();
  return <Boundary isDark={isDark} bg={bg} textPrimary={textPrimary} textSecondary={textSecondary} accentColor={accentColor} accentText={accentText}>{children}</Boundary>;
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
  actions: { gap: 12, width: '100%', maxWidth: 320 },
  primaryBtn: {
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  primaryText: { fontSize: 15, fontFamily: FontFamily.extrabold },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center', minHeight: 44 },
  secondaryText: { fontSize: 14, fontFamily: FontFamily.bold },
  pressed: { opacity: 0.7 },
});
