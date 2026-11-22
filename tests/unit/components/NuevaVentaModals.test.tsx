import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NuevaVentaModals } from '@/components/cajero/nueva-venta/NuevaVentaModals';

const h = vi.hoisted(() => ({
  rowRenders: {} as Record<string, number>,
}));

type Children = { children?: ReactNode };

vi.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({ children, onPress }: Children & { onPress?: () => void }) => (
    <button onClick={onPress}>{children}</button>
  ),
  TouchableOpacity: ({ children, onPress }: Children & { onPress?: () => void }) => (
    <button onClick={onPress}>{children}</button>
  ),
  TextInput: ({ value, onChangeText, accessibilityLabel }: any) => (
    <input
      aria-label={accessibilityLabel}
      value={value ?? ''}
      onChange={(e) => onChangeText?.(e.target.value)}
    />
  ),
  ActivityIndicator: () => null,
  Appearance: {
    getColorScheme: () => 'dark',
    addChangeListener: () => ({ remove: () => {} }),
  },
  useColorScheme: () => 'dark',
  KeyboardAvoidingView: ({ children }: Children) => <div>{children}</div>,
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@/components/ui/AppModal', () => ({
  AppModal: ({ visible, children }: Children & { visible?: boolean }) =>
    visible === false ? null : <div>{children}</div>,
}));
vi.mock('@/components/shared/VirtualizedList', () => ({
  default: ({ data, renderItem, keyExtractor }: any) => (
    <div>
      {data.map((item: any) => (
        <div key={keyExtractor(item)}>{renderItem({ item })}</div>
      ))}
    </div>
  ),
}));
vi.mock('@/components/cajero/forms/PaymentMethodSelect', () => ({
  PaymentMethodSelect: () => null,
}));
vi.mock('@/components/cajero/nueva-venta/SaleFormatSelector', () => ({
  SaleFormatSelector: ({ product }: any) => {
    h.rowRenders[String(product.id)] = (h.rowRenders[String(product.id)] ?? 0) + 1;
    return <span>{`formato-${product.id}`}</span>;
  },
}));
vi.mock('@/hooks/utils/saleChoice', () => ({
  resolverVentaProducto: () => ({ opciones: ['botella'] }),
}));
vi.mock('@/hooks/useConfigValue', () => ({
  useConfigValue: (_category: string, _key: string, fallback: unknown) => fallback,
}));

const products = [
  { id: 1, name: 'Agua' },
  { id: 2, name: 'Cerveza' },
  { id: 3, name: 'Caña' },
];

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    styles: {},
    accentColor: '#E11D48',
    cardBg: '#111111',
    borderColor: '#333333',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    isDark: true,
    categoryModalVisible: true,
    modalCategoria: { name: 'Bebidas' },
    modalProducts: products,
    modalLoading: false,
    selectedTime: 30,
    timeModalVisible: false,
    loadModalVisible: false,
    loadingTargetClient: null,
    loadingAmount: '',
    loadMetodoPago: 'efectivo',
    loadSubmitting: false,
    cart: [],
    cartItemCount: 0,
    onCloseCategoryModal: vi.fn(),
    onPressAddProduct: vi.fn(),
    onRemoveFromCart: vi.fn(),
    onCloseTimeModal: vi.fn(),
    onSelectTime: vi.fn(),
    onCloseLoadModal: vi.fn(),
    onLoadAmountChange: vi.fn(),
    onLoadMetodoPagoChange: vi.fn(),
    onConfirmLoad: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  h.rowRenders = {};
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('NuevaVentaModals: filas de productos', () => {
  it('no re-renderiza las filas que siguen visibles al buscar', () => {
    render(<NuevaVentaModals {...(baseProps() as any)} />);

    expect(h.rowRenders).toEqual({ '1': 1, '2': 1, '3': 1 });

    fireEvent.change(screen.getByLabelText('Buscar producto'), { target: { value: 'a' } });

    expect(h.rowRenders).toEqual({ '1': 1, '2': 1, '3': 1 });
  });

  it('re-renderiza las filas cuando cambia el carrito', () => {
    const props = baseProps();
    const { rerender } = render(<NuevaVentaModals {...(props as any)} />);

    rerender(
      <NuevaVentaModals
        {...(props as any)}
        cart={[{ id: 1, cantidad: 1 }]}
        cartItemCount={1}
      />,
    );

    expect(h.rowRenders['1']).toBe(2);
  });

  it('muestra el stock en bar de cada producto', () => {
    render(
      <NuevaVentaModals
        {...(baseProps({
          modalProducts: [
            { id: 1, name: 'Agua', stock_bar: 4 },
            { id: 2, name: 'Cerveza', stock_bar: 1 },
            { id: 3, name: 'Caña', stock_bar: 0 },
          ],
        }) as any)}
      />,
    );

    expect(screen.getByText('Stock en bar: 4 unidades')).toBeTruthy();
    expect(screen.getByText('Stock en bar: 1 unidad')).toBeTruthy();
    expect(screen.getByText('Stock en bar: 0 unidades')).toBeTruthy();
  });
});
