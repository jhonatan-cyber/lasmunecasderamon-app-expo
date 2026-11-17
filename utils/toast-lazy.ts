import React, { useState, useEffect } from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import logger from '@/utils/logger';

// ── Lazy show/hide API (fire-and-forget, sync-compatible) ─────────────

/** Show a toast. The underlying library is loaded lazily on first call. */
export function showToast(params: {
  type?: 'success' | 'error' | 'info' | 'warning' | 'order';
  text1?: string;
  text2?: string;
  visibilityTime?: number;
  position?: 'top' | 'bottom';
}) {
  import('react-native-toast-message')
    .then((mod) => {
      mod.default.show(params as any);
    })
    .catch(() => { logger.debug('No se pudo cargar la librería de toast para mostrar notificación.'); });
}

/** Hide the currently visible toast. */
export function hideToast() {
  import('react-native-toast-message')
    .then((mod) => {
      mod.default.hide();
    })
    .catch(() => { logger.debug('No se pudo cargar la librería de toast para ocultar notificación.'); });
}

// ── Lazy <Toast /> component with internal config ────────────────────
// React.lazy() is NOT supported in React Native, so we use a state-based
// lazy loading pattern instead. The toast config (BaseToast, ErrorToast,
// InfoToast component constructors) is built INSIDE the dynamic import so
// that toast-config.tsx doesn't need to import from the library, eliminating
// the static import.

const commonStyleLight: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 18,
  width: '92%',
  height: 85,
  borderLeftWidth: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 8,
  alignSelf: 'center',
};

const commonStyleDark: ViewStyle = {
  backgroundColor: '#1F2937',
  borderRadius: 18,
  width: '92%',
  height: 85,
  borderLeftWidth: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 8,
  alignSelf: 'center',
};

let ToastModule: any = null;
let ToastConfig: any = null;

async function loadToastModule() {
  if (ToastModule && ToastConfig) return;
  const mod = await import('react-native-toast-message');
  const { default: Toast, BaseToast, ErrorToast, InfoToast } = mod;
  const { useAccentColor } = await import('@/hooks/useAccentColor');

  const ThemedToast = ({ type, ...props }: any) => {
    const { isDark } = useAccentColor();
    const commonStyle = isDark ? commonStyleDark : commonStyleLight;
    const text1Color = isDark ? '#F9FAFB' : '#111827';
    const text2Color = isDark ? '#9CA3AF' : '#6B7280';

    const toastConfigs: Record<string, any> = {
      success: () =>
        React.createElement(BaseToast, {
          ...props,
          style: { ...commonStyle, borderLeftColor: '#10B981' },
          contentContainerStyle: { paddingHorizontal: 20 },
          text1Style: { fontSize: 17, fontWeight: '700', color: text1Color },
          text2Style: { fontSize: 14, fontWeight: '500', color: text2Color },
          text1NumberOfLines: 1,
          text2NumberOfLines: 2,
        }),

      error: () =>
        React.createElement(ErrorToast, {
          ...props,
          style: { ...commonStyle, borderLeftColor: '#EF4444' },
          contentContainerStyle: { paddingHorizontal: 20 },
          text1Style: { fontSize: 17, fontWeight: '700', color: text1Color },
          text2Style: { fontSize: 14, fontWeight: '500', color: text2Color },
          text1NumberOfLines: 1,
          text2NumberOfLines: 2,
        }),

      info: () =>
        React.createElement(InfoToast, {
          ...props,
          style: { ...commonStyle, borderLeftColor: '#3B82F6' },
          contentContainerStyle: { paddingHorizontal: 20 },
          text1Style: { fontSize: 17, fontWeight: '700', color: text1Color },
          text2Style: { fontSize: 14, fontWeight: '500', color: text2Color },
          text1NumberOfLines: 1,
          text2NumberOfLines: 2,
        }),

      warning: () =>
        React.createElement(BaseToast, {
          ...props,
          style: { ...commonStyle, borderLeftColor: '#F59E0B' },
          contentContainerStyle: { paddingHorizontal: 20 },
          text1Style: { fontSize: 17, fontWeight: '700', color: text1Color },
          text2Style: { fontSize: 14, fontWeight: '500', color: text2Color },
          text1NumberOfLines: 1,
          text2NumberOfLines: 2,
        }),

      order: () =>
        React.createElement(BaseToast, {
          ...props,
          style: { ...commonStyle, borderLeftColor: '#E11D48' },
          contentContainerStyle: { paddingHorizontal: 20 },
          text1Style: { fontSize: 17, fontWeight: '700', color: text1Color },
          text2Style: { fontSize: 14, fontWeight: '500', color: text2Color },
          text1NumberOfLines: 1,
          text2NumberOfLines: 2,
          renderLeadingIcon: () =>
            React.createElement(
              View,
              { style: { justifyContent: 'center', paddingLeft: 15 } },
              React.createElement(Text, { style: { fontSize: 22 } }, '\uD83D\uDCCB'),
            ),
        }),
    };

    const configFn = toastConfigs[type] || toastConfigs.info;
    return configFn();
  };

  ToastConfig = {
    success: (props: any) => React.createElement(ThemedToast, { type: 'success', ...props }),
    error: (props: any) => React.createElement(ThemedToast, { type: 'error', ...props }),
    info: (props: any) => React.createElement(ThemedToast, { type: 'info', ...props }),
    warning: (props: any) => React.createElement(ThemedToast, { type: 'warning', ...props }),
    order: (props: any) => React.createElement(ThemedToast, { type: 'order', ...props }),
  };

  ToastModule = Toast;
}

/**
 * React Native-compatible lazy toast component.
 * React.lazy() is not supported in React Native, so we use a
 * state-based approach: the module loads asynchronously and the
 * component re-renders once it's ready.
 */
export function ToastComponent(props: any) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadToastModule().then(() => {
      if (!cancelled) setLoaded(true);
    }).catch(() => {
      logger.debug('No se pudo cargar la librería de toast.');
    });
    return () => { cancelled = true; };
  }, []);

  if (!loaded || !ToastModule || !ToastConfig) {
    return null;
  }

  return React.createElement(ToastModule, { ...props, config: ToastConfig });
}
