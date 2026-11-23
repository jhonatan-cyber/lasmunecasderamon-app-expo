import React, { Fragment, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VentasScreen from '@/app/(app)/cajero/ventas';

const h = vi.hoisted(() => ({
  rowRenders: {} as Record<string, number>,
}));

type RenderProps = {
  children?: ReactNode;
  style?: unknown;
  onPress?: () => void;
  onRefresh?: () => void;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  value?: string;
};

vi.mock('react-native', () => ({
  View: ({ children }: RenderProps) => <div>{children}</div>,
  Text: ({ children }: RenderProps) => <span>{children}</span>,
  Pressable: ({ children, onPress }: RenderProps) => <button onClick={onPress}>{children}</button>,
  RefreshControl: ({ onRefresh }: RenderProps) => <button onClick={onRefresh}>Actualizar</button>,
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios },
  StyleSheet: { create: (styles: unknown) => styles },
  FlatList: ({ data, renderItem, keyExtractor }: any) => (
    <div>
      {data.map((item: any, index: number) => (
        <Fragment key={keyExtractor ? keyExtractor(item) : index}>{renderItem({ item, index })}</Fragment>
      ))}
    </div>
  ),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('@/components/ui/AnimatedView', () => ({
  AnimatedView: ({ children }: RenderProps) => <div>{children}</div>,
}));
vi.mock('@/components/ui/PremiumAlert', () => ({ PremiumAlert: () => null }));
vi.mock('@/components/ui/PremiumHeader', () => ({ PremiumHeader: () => null }));
vi.mock('@/components/ui/PremiumFAB', () => ({ PremiumFAB: () => null }));
vi.mock('@/components/ui/EmptyState', () => ({ EmptyState: () => null }));
vi.mock('@/components/ui/Tabs', () => ({ Tabs: () => null }));
vi.mock('@/components/offline/OfflineStatusBanner', () => ({ OfflineStatusBanner: () => null }));
vi.mock('@/components/ui/SearchBar', () => ({
  SearchBar: ({ value, onChangeText, placeholder }: RenderProps) => (
    <input
      aria-label="buscar"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChangeText?.(event.target.value)}
    />
  ),
}));
vi.mock('@/context/TimerContext', () => {
  const timerState = { timers: [], serverOffset: 0 };
  return {
    useTimer: () => timerState,
  };
});
vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => true }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#000',
    gradientColors: ['#000', '#111'],
    isDark: false,
    bg: '#fff',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#ddd',
  }),
}));
vi.mock('@/hooks/useResponsiveMetrics', () => ({
  useResponsiveMetrics: () => ({ isTablet: false }),
}));
vi.mock('@/hooks/useRenderCount', () => ({
  useRenderCount: (name: string, props?: Record<string, unknown>) => {
    if (name !== 'VentaCard' || props?.ventaId === undefined) return;
    const id = String(props.ventaId);
    h.rowRenders[id] = (h.rowRenders[id] ?? 0) + 1;
  },
}));
vi.mock('@/hooks/useVentasScreen', () => {
  const noop = vi.fn();
  const getVentaId = (venta: { id?: unknown } | null) => (venta?.id ? String(venta.id) : null);
  const alertConfig = { visible: false, title: '', message: '', type: 'info' };
  const ventasList = [
    {
      id: 11,
      codigo: 'V-11',
      estado: 1,
      total: 5000,
      propina: 0,
      fecha_crea: '2026-11-17T12:00:00Z',
      servicio: 'Mesa Uno',
      habitacion: '101',
    },
    {
      id: 12,
      codigo: 'V-12',
      estado: 1,
      total: 8000,
      propina: 0,
      fecha_crea: '2026-11-17T12:10:00Z',
      servicio: 'Mesa Dos',
      habitacion: '102',
    },
  ];
  return {
    useVentasScreen: () => ({
      loading: false,
      refreshing: false,
      ventasList,
      loadingSales: false,
      selectedVenta: null,
      loadingDetail: false,
      modalVisible: false,
      actionSheetVisible: false,
      activeVenta: null,
      anulacionModalVisible: false,
      motivoAnulacion: '',
      montoAnulacion: '',
      anulandoVenta: false,
      activeTab: 'historial',
      alertConfig,
      onRefresh: noop,
      setActiveTab: noop,
      setAlertConfig: noop,
      setModalVisible: noop,
      setActionSheetVisible: noop,
      setMotivoAnulacion: noop,
      setMontoAnulacion: noop,
      handleOpenActionSheet: noop,
      handleVerDetalles: noop,
      handleFinalizarVenta: noop,
      handleAnularVenta: noop,
      openAnulacionModal: noop,
      closeAnulacionModal: noop,
      formatMontoInput: (value: string) => value,
      getVentaId,
      fromCache: false,
    }),
  };
});
vi.mock('@/components/cajero/ventas', async () => {
  const { VentaCard } = await import('@/components/cajero/ventas/VentaCard');
  const Null = () => null;
  return {
    VentaCard,
    VentaDetailModal: Null,
    VentaAnulacionModal: Null,
    VentaActionSheet: Null,
    VentasSkeleton: Null,
    VentaCardSkeleton: Null,
    VentasStats: Null,
    VentasFiltersModal: Null,
  };
});

beforeEach(() => {
  h.rowRenders = {};
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('VentasScreen: repintado de filas al buscar', () => {
  it('no vuelve a renderizar las tarjetas que siguen en la lista', () => {
    render(<VentasScreen />);
    expect(screen.getByText(/V-11/)).toBeTruthy();
    expect(h.rowRenders['11']).toBe(1);

    fireEvent.change(screen.getByLabelText('buscar'), { target: { value: 'Mesa Uno' } });

    expect(screen.getByText(/V-11/)).toBeTruthy();
    expect(screen.queryByText(/V-12/)).toBeNull();
    expect(h.rowRenders['11']).toBe(1);
  });
});
