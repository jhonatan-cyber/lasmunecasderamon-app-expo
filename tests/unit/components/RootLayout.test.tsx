import React, { type ReactNode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RootLayout from '@/app/_layout';
import { ThemeTokens } from '@/constants/colorTokens';

const h = vi.hoisted(() => ({
  platform: 'web',
  ready: false,
  fontsReady: true,
  events: [] as string[],
  prepare: vi.fn<() => Promise<void>>(),
  init: vi.fn(),
  checkAuth: vi.fn(),
  cargar: vi.fn(),
  apiClientSafe: vi.fn(),
}));
type Children = { children?: ReactNode; style?: { backgroundColor?: string } };
vi.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  Platform: { get OS() { return h.platform; } },
  useColorScheme: () => 'dark',
  Appearance: {
    getColorScheme: () => 'dark',
    addChangeListener: () => ({ remove: vi.fn() }),
  },
  View: ({ children, style }: Children) => <div data-background={style?.backgroundColor}>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({ children, onPress }: Children & { onPress?: () => void }) => (
    <button onClick={onPress}>{children}</button>
  ),
  StyleSheet: { create: (styles: unknown) => styles },
  ActivityIndicator: ({ color }: { color?: string }) => <span data-color={color}>Cargando</span>,
  LogBox: { ignoreLogs: vi.fn() },
}));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'dark' }));
vi.mock('expo-dev-client', () => ({}));
vi.mock('expo-updates', () => ({}));
vi.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: vi.fn().mockResolvedValue(undefined),
  hideAsync: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('expo-router', () => ({
  Slot: () => {
    if (!h.ready) throw new Error('no such table: mirror_cache');
    return <span>Pantalla lista</span>;
  },
}));
vi.mock('@/services/mirror/driver', () => ({ prepareMirrorStorage: h.prepare }));
vi.mock('@/services/mirror', () => ({ initMirror: h.init }));
vi.mock('@/services/outbox', () => ({ initOutbox: vi.fn() }));
vi.mock('@/services/connectivity', () => ({ connectivity: { start: vi.fn() } }));
vi.mock('@/utils/sentry', () => ({ initSentry: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/api/client-safe', () => ({ apiClientSafe: h.apiClientSafe }));
vi.mock('@/hooks/utils/cuentaUtils', () => ({
  setExpensiveDrinkThreshold: vi.fn(), setCardSplit: vi.fn(), setIvaRate: vi.fn(),
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({ isLoading: false, checkAuth: h.checkAuth }),
}));
vi.mock('@/store/modoPantallaStore', () => ({
  useModoPantallaStore: (selector: (state: unknown) => unknown) => selector({ cargado: true, cargar: h.cargar }),
}));
vi.mock('@/components/ui/DynamicSystemBars', () => ({ DynamicSystemBars: () => null }));
vi.mock('@/hooks/useAppFonts', () => ({ useAppFonts: () => h.fontsReady }));
vi.mock('@/context/NotificationContext', () => ({ NotificationProvider: ({ children }: Children) => children }));
vi.mock('@/context/SalesContext', () => ({ SalesProvider: ({ children }: Children) => children }));
vi.mock('@tanstack/react-query', () => ({
  QueryClient: class {},
  QueryClientProvider: ({ children }: Children) => children,
}));

beforeEach(() => {
  h.ready = false;
  h.fontsReady = true;
  h.events.length = 0;
  h.platform = 'web';
  h.prepare.mockReset();
  h.apiClientSafe.mockReset().mockResolvedValue({ success: false });
  h.init.mockReset().mockImplementation(() => {
    h.events.push('schema');
    h.ready = true;
    return 3;
  });
  vi.stubGlobal('requestIdleCallback', vi.fn(() => 1));
  vi.stubGlobal('cancelIdleCallback', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('RootLayout: almacenamiento antes de montar pantallas', () => {
  it.each(['web', 'ios'])('espera al driver y al esquema en %s aunque los servicios sigan diferidos', async platform => {
    h.platform = platform;
    let finish!: () => void;
    h.prepare.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    render(<RootLayout />);
    expect(screen.getByText('Cargando')).toBeTruthy();
    expect(screen.getByText('Cargando').getAttribute('data-color')).toBe(ThemeTokens.dark.textPrimary);
    expect(screen.getByText('Cargando').parentElement?.getAttribute('data-background')).toBe(ThemeTokens.dark.background);
    expect(h.init).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    expect(screen.getByText('Pantalla lista')).toBeTruthy();
    expect(h.events).toEqual(['schema']);
    expect(h.init).toHaveBeenCalledTimes(1);
    expect(h.apiClientSafe).toHaveBeenCalledWith('/configurations', { retries: 1 });
    expect(requestIdleCallback).not.toHaveBeenCalled();
  });

  it('conserva el camino online si la preparación offline falla', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    h.prepare.mockRejectedValue(new Error('sin almacenamiento'));
    await act(async () => { render(<RootLayout />); });
    expect(screen.getByText('Pantalla lista')).toBeTruthy();
    expect(h.init).toHaveBeenCalledTimes(1);
  });

  it('no inicializa ni habilita pantallas después de desmontar', async () => {
    let finish!: () => void;
    h.prepare.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const view = render(<RootLayout />);
    view.unmount();
    await act(async () => { finish(); });
    expect(h.init).not.toHaveBeenCalled();
  });

  it('no deja el arranque bloqueado si el almacenamiento offline no responde', async () => {    vi.useFakeTimers();
    try {
      h.prepare.mockReturnValue(new Promise<void>(() => {}));
      render(<RootLayout />);
      expect(screen.getByText('Cargando')).toBeTruthy();

      await act(async () => { vi.advanceTimersByTime(3000); });

      expect(screen.getByText('Pantalla lista')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('espera a que las fuentes estén listas antes de montar pantallas', async () => {
    h.fontsReady = false;
    h.ready = true;
    h.prepare.mockResolvedValue(undefined);
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<RootLayout />); });
    expect(screen.getByText('Cargando')).toBeTruthy();

    h.fontsReady = true;
    view.rerender(<RootLayout />);

    expect(screen.getByText('Pantalla lista')).toBeTruthy();
  });
});
