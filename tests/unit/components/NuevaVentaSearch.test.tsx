import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { NuevaVentaSearch } from "@/components/cajero/nueva-venta/NuevaVentaSearch";

// El setup global mockea `react-native` solo con lo que usan los hooks; el buscador
// necesita además Pressable y TextInput, así que aquí se completan.
// Los estilos de React Native (objetos/arrays) no se pueden volcar al DOM, así que
// los mocks los descartan: aquí se verifica el texto y los handlers, no el aspecto.
vi.mock("react-native", () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  Platform: { OS: 'web', select: (obj: any) => obj?.web ?? obj?.default },
  Appearance: {
    getColorScheme: () => 'dark',
    addChangeListener: () => ({ remove: () => {} }),
  },
  useColorScheme: () => 'dark',
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
  TextInput: ({
    value,
    accessibilityLabel,
  }: {
    value?: string;
    accessibilityLabel?: string;
  }) => <input defaultValue={value} aria-label={accessibilityLabel} />,
  ActivityIndicator: () => <span>cargando</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    disabled,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onPress}
      aria-label={accessibilityLabel}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

vi.mock("@expo/vector-icons/Ionicons", () => ({
  default: () => <span />,
}));

// Ml por shot global de Configuraciones (el componente no debe pedir el fetch real).
vi.mock("@/hooks/useConfigValue", () => ({
  useConfigValue: (_category: string, _key: string, defaultValue: unknown) =>
    defaultValue,
}));

afterEach(cleanup);

const conBotellaAbierta = {
  id: "pres-1",
  nombre: "Black Label 750 ml",
  categoria: "Whisky",
  precio: 180000,
  comision: 0,
  stock_bar: 3,
  ml_abierta: 620,
  ml_shot: null,
};

const sinBotellaAbierta = {
  id: "pres-2",
  nombre: "Corona 330 ml",
  categoria: "Cerveza",
  precio: 5000,
  comision: 0,
  stock_bar: 12,
};

const conCorto = {
  id: "pres-3",
  nombre: "Fernet 750 ml",
  categoria: "Destilados",
  precio: 25000,
  comision: 0,
  stock_bar: 4,
  opciones_venta: [
    { tipo: "botella", precio: 25000, comision: 0 },
    { tipo: "shot", precio: 6000, comision: 0, precio_anfitriona: 3500 },
  ],
};

const renderSearch = (
  searchResults: any[],
  onAddProduct = vi.fn(),
  extra: Record<string, any> = {},
) => {
  render(
    <NuevaVentaSearch
      searchProducto="black"
      onSearchChange={vi.fn()}
      onSearchNow={vi.fn()}
      onClearSearch={vi.fn()}
      searchLoading={false}
      searchResults={searchResults}
      cart={[]}
      onAddProduct={onAddProduct}
      onRemoveFromCart={vi.fn()}
      accentColor="#000000"
      cardBg="#FFFFFF"
      textPrimary="#000000"
      textSecondary="#666666"
      borderColor="#EEEEEE"
      {...extra}
    />,
  );
  return onAddProduct;
};

describe("NuevaVentaSearch (vista móvil)", () => {
  it("muestra la botella abierta y los shots aproximados de cada resultado", () => {
    renderSearch([conBotellaAbierta]);

    expect(
      screen.getByText("Botella abierta: 620 ml · ≈12 shots"),
    ).toBeDefined();
  });

  it("usa el ml por shot propio del producto cuando lo trae", () => {
    renderSearch([{ ...conBotellaAbierta, ml_abierta: 500, ml_shot: 40 }]);

    expect(
      screen.getByText("Botella abierta: 500 ml · ≈12 shots"),
    ).toBeDefined();
  });

  it("sin botella abierta no muestra la línea", () => {
    renderSearch([sinBotellaAbierta]);

    expect(screen.queryByText(/Botella abierta/)).toBeNull();
    expect(screen.getByText("Corona 330 ml")).toBeDefined();
  });

  it("permite agregar al carrito con el botón +", () => {
    const onAddProduct = renderSearch([conBotellaAbierta]);
    fireEvent.click(screen.getByLabelText("Botella: agregar al carrito"));
    expect(onAddProduct).toHaveBeenLastCalledWith(
      conBotellaAbierta,
      "botella",
      1,
    );
  });

  it("sin precio de shot no muestra el selector de forma de venta", () => {
    renderSearch([sinBotellaAbierta]);

    expect(screen.getByLabelText("Botella: agregar al carrito")).toBeDefined();
    expect(screen.queryByLabelText(/Corto/)).toBeNull();
  });

  it("muestra Botella, Corto cliente y Corto anfitriona cuando el producto los ofrece", () => {
    renderSearch([conCorto]);

    expect(screen.getByLabelText("Botella: agregar al carrito")).toBeDefined();
    expect(
      screen.getByLabelText("Corto cliente · 50 ml: agregar al carrito"),
    ).toBeDefined();
    expect(
      screen.getByLabelText("Corto anfitriona · 50 ml: agregar al carrito"),
    ).toBeDefined();
    expect(screen.getByText(/\$25[.,]000/)).toBeDefined();
  });

  it("agrega cada formato directamente al carrito con el botón +", () => {
    const onAddProduct = renderSearch([conCorto]);
    fireEvent.click(screen.getByLabelText("Botella: agregar al carrito"));
    fireEvent.click(
      screen.getByLabelText("Corto cliente · 50 ml: agregar al carrito"),
    );
    fireEvent.click(
      screen.getByLabelText("Corto anfitriona · 50 ml: agregar al carrito"),
    );
    expect(onAddProduct).toHaveBeenNthCalledWith(1, conCorto, "botella", 1);
    expect(onAddProduct).toHaveBeenNthCalledWith(2, conCorto, "shot", 1);
    expect(onAddProduct).toHaveBeenNthCalledWith(
      3,
      conCorto,
      "shot_anfitriona",
      1,
    );
  });

  it("el botón + agrega una unidad directamente al carrito", () => {
    const onAddProduct = renderSearch([conCorto]);
    fireEvent.click(
      screen.getByLabelText("Corto anfitriona · 50 ml: agregar al carrito"),
    );
    expect(onAddProduct).toHaveBeenLastCalledWith(
      conCorto,
      "shot_anfitriona",
      1,
    );
  });
});
