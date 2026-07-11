import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';

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
    .catch(() => {});
}

/** Hide the currently visible toast. */
export function hideToast() {
  import('react-native-toast-message')
    .then((mod) => {
      mod.default.hide();
    })
    .catch(() => {});
}

// ── Lazy <Toast /> component with internal config ────────────────────
// The toast config (BaseToast, ErrorToast, InfoToast component
// constructors) is built INSIDE the lazy import so that toast-config.tsx
// doesn't need to import from the library, eliminating the static import.

const commonStyle: ViewStyle = {
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

export const ToastComponent = React.lazy(async () => {
  const mod = await import('react-native-toast-message');
  const { default: Toast, BaseToast, ErrorToast, InfoToast } = mod;

  const toastConfig = {
    success: (props: any) =>
      React.createElement(BaseToast, {
        ...props,
        style: { ...commonStyle, borderLeftColor: '#10B981' },
        contentContainerStyle: { paddingHorizontal: 20 },
        text1Style: { fontSize: 17, fontWeight: '700', color: '#111827' },
        text2Style: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
        text1NumberOfLines: 1,
        text2NumberOfLines: 2,
      }),

    error: (props: any) =>
      React.createElement(ErrorToast, {
        ...props,
        style: { ...commonStyle, borderLeftColor: '#EF4444' },
        contentContainerStyle: { paddingHorizontal: 20 },
        text1Style: { fontSize: 17, fontWeight: '700', color: '#111827' },
        text2Style: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
        text1NumberOfLines: 1,
        text2NumberOfLines: 2,
      }),

    info: (props: any) =>
      React.createElement(InfoToast, {
        ...props,
        style: { ...commonStyle, borderLeftColor: '#3B82F6' },
        contentContainerStyle: { paddingHorizontal: 20 },
        text1Style: { fontSize: 17, fontWeight: '700', color: '#111827' },
        text2Style: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
        text1NumberOfLines: 1,
        text2NumberOfLines: 2,
      }),

    warning: (props: any) =>
      React.createElement(BaseToast, {
        ...props,
        style: { ...commonStyle, borderLeftColor: '#F59E0B' },
        contentContainerStyle: { paddingHorizontal: 20 },
        text1Style: { fontSize: 17, fontWeight: '700', color: '#111827' },
        text2Style: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
        text1NumberOfLines: 1,
        text2NumberOfLines: 2,
      }),

    order: (props: any) =>
      React.createElement(BaseToast, {
        ...props,
        style: { ...commonStyle, borderLeftColor: '#E11D48' },
        contentContainerStyle: { paddingHorizontal: 20 },
        text1Style: { fontSize: 17, fontWeight: '700', color: '#111827' },
        text2Style: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
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

  const WrappedToast = (props: any) =>
    React.createElement(Toast, { ...props, config: toastConfig });

  return { default: WrappedToast };
});
