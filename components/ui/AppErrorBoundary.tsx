import logger from '@/utils/logger';
import { BorderRadius } from '@/constants/spacing';
import { router } from 'expo-router';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

interface BoundaryState {
  error: Error | null;
}

class Boundary extends Component<
  { isDark: boolean; children: ReactNode },
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
    const { isDark, children } = this.props;

    if (!error) return children;

    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
        <Text style={[styles.title, { color: textPrimary }]}>Algo salió mal</Text>
        <Text style={[styles.message, { color: textSecondary }]}>
          La pantalla encontró un error inesperado. Podés reintentar o volver al inicio.
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={this.reintentar}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Reintentar</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/')}
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
  const isDark = useColorScheme() === 'dark';
  return <Boundary isDark={isDark}>{children}</Boundary>;
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
  actions: { gap: 12, width: '100%', maxWidth: 320 },
  primaryBtn: {
    backgroundColor: '#FF2D55',
    borderRadius: BorderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
