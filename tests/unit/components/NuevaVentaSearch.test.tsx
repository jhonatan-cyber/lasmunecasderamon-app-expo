import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

// El setup global mockea `react-native` solo con lo que usan los hooks; el buscador
// necesita además Pressable y TextInput, así que aquí se completan.
// Los estilos de React Native (objetos/arrays) no se pueden volcar al DOM, así que
// los mocks los descartan: aquí se verifica el texto y los handlers, no el aspecto.
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  TextInput: ({ value, accessibilityLabel }: { value?: string; accessibilityLabel?: string }) => (
    <input defaultValue={value} aria-label={accessibilityLabel} />
  ),
  ActivityIndicator: () => <span>cargando</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) => (
    <button onClick={onPress} aria-label={accessibilityLabel}>
      {children}
    </button>
  )
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => <span />
}));

// Ml por shot global de Configuraciones (el componente no debe pedir el fetch real).
vi.mock('@/hooks/useConfigValue', () => ({
  useConfigValue: (_category: string, _key: string, defaultValue: unknown) => defaultValue
}));

import { NuevaVentaSearch } from '@/components/cajero/nueva-venta/NuevaVentaSearch';

afterEach(cleanup);

const conBotellaAbierta = {
  id: 'pres-1',
  nombre: 'Black Label 750 ml',
  categoria: 'Whisky',
  precio: 180000,
  comision: 0,
  ml_abierta: 620,
  ml_shot: null
};

const sinBotellaAbierta = {
  id: 'pres-2',
  nombre: 'Corona 330 ml',
  categoria: 'Cerveza',
  precio: 5000,
  comision: 0,
  stock_bar: 12
};

const renderSearch = (searchResults: any[], onAddProduct = vi.fn()) => {
  render(
    <NuevaVentaSearch
      searchProducto="black"
      onSearchChange={vi.fn()}
      onSearchNow={vi.fn()}
      onClearSearch={vi.fn()}
      searchLoading={false}
      searchResults={searchResults}
      onAddProduct={onAddProduct}
      isDark={false}
      accentColor="#000000"
      cardBg="#FFFFFF"
      textPrimary="#000000"
      textSecondary="#666666"
      borderColor="#EEEEEE"
    />
  );
  return onAddProduct;
};

describe('NuevaVentaSearch (vista móvil)', () => {
  it('muestra la botella abierta y los shots aproximados de cada resultado', () => {
    renderSearch([conBotellaAbierta]);

    expect(screen.getByText('Botella abierta: 620 ml · ≈12 shots')).toBeDefined();
  });

  it('usa el ml por shot propio del producto cuando lo trae', () => {
    renderSearch([{ ...conBotellaAbierta, ml_abierta: 500, ml_shot: 40 }]);

    expect(screen.getByText('Botella abierta: 500 ml · ≈12 shots')).toBeDefined();
  });

  it('sin botella abierta no muestra la línea', () => {
    renderSearch([sinBotellaAbierta]);

    expect(screen.queryByText(/Botella abierta/)).toBeNull();
    expect(screen.getByText('Corona 330 ml')).toBeDefined();
  });

  it('sigue mandando el producto al carrito desde el botón agregar', () => {
    const onAddProduct = renderSearch([conBotellaAbierta]);

    fireEvent.click(screen.getByLabelText('Agregar producto'));

    expect(onAddProduct).toHaveBeenLastCalledWith(conBotellaAbierta);
  });
});
