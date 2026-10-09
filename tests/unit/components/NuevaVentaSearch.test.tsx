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
    accessibilityLabel,
    disabled
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
    disabled?: boolean;
  }) => (
    <button onClick={onPress} aria-label={accessibilityLabel} disabled={disabled}>
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
  stock_bar: 3,
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

const conShot = {
  id: 'pres-3',
  nombre: 'Fernet 750 ml',
  categoria: 'Destilados',
  precio: 25000,
  comision: 0,
  stock_bar: 4,
  opciones_venta: [
    { tipo: 'botella', precio: 25000, comision: 0 },
    { tipo: 'shot', precio: 6000, comision: 0, precio_anfitriona: 3500 }
  ]
};

const renderSearch = (searchResults: any[], onAddProduct = vi.fn(), extra: Record<string, any> = {}) => {
  render(
    <NuevaVentaSearch
      searchProducto="black"
      onSearchChange={vi.fn()}
      onSearchNow={vi.fn()}
      onClearSearch={vi.fn()}
      searchLoading={false}
      searchResults={searchResults}
      onAddProduct={onAddProduct}
      accentColor="#000000"
      cardBg="#FFFFFF"
      textPrimary="#000000"
      textSecondary="#666666"
      borderColor="#EEEEEE"
      {...extra}
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

  it('permite agregar la cantidad elegida de botella', () => {
    const onAddProduct = renderSearch([conBotellaAbierta]);
    fireEvent.click(screen.getByLabelText('Botella: aumentar cantidad'));
    fireEvent.click(screen.getByLabelText('Agregar Botella'));
    expect(onAddProduct).toHaveBeenLastCalledWith(conBotellaAbierta, 'botella', 1);
  });

  it('sin precio de shot no muestra el selector de forma de venta', () => {
    renderSearch([sinBotellaAbierta]);

    expect(screen.getByLabelText('Botella: aumentar cantidad')).toBeDefined();
    expect(screen.queryByLabelText(/Shot/)).toBeNull();
  });

  it('muestra Botella, Shot cliente y Shot anfitriona cuando el producto los ofrece', () => {
    renderSearch([conShot]);

    expect(screen.getByLabelText('Botella: aumentar cantidad')).toBeDefined();
    expect(screen.getByLabelText('Shot cliente · 50 ml: aumentar cantidad')).toBeDefined();
    expect(screen.getByLabelText('Shot anfitriona · 50 ml: aumentar cantidad')).toBeDefined();
    expect(screen.getByText(/\$25[.,]000/)).toBeDefined();
  });

  it('mantiene cantidades independientes para los tres formatos del mismo producto', () => {
    const onAddProduct = renderSearch([conShot]);
    fireEvent.click(screen.getByLabelText('Botella: aumentar cantidad'));
    fireEvent.click(screen.getByLabelText('Shot cliente · 50 ml: aumentar cantidad'));
    fireEvent.click(screen.getByLabelText('Shot anfitriona · 50 ml: aumentar cantidad'));
    fireEvent.click(screen.getByLabelText('Agregar Botella'));
    fireEvent.click(screen.getByLabelText('Agregar Shot cliente · 50 ml'));
    fireEvent.click(screen.getByLabelText('Agregar Shot anfitriona · 50 ml'));
    expect(onAddProduct).toHaveBeenNthCalledWith(1, conShot, 'botella', 1);
    expect(onAddProduct).toHaveBeenNthCalledWith(2, conShot, 'shot', 1);
    expect(onAddProduct).toHaveBeenNthCalledWith(3, conShot, 'shot_anfitriona', 1);
  });

  it('el formato agrega una unidad de producto como línea independiente', () => {
    const onAddProduct = renderSearch([conShot]);
    fireEvent.click(screen.getByLabelText('Shot anfitriona · 50 ml: aumentar cantidad'));
    fireEvent.click(screen.getByLabelText('Agregar Shot anfitriona · 50 ml'));
    expect(onAddProduct).toHaveBeenLastCalledWith(conShot, 'shot_anfitriona', 1);
  });
});
