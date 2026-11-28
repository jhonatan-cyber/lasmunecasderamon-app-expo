import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GarzonCartBar } from "@/components/garzon/productos/GarzonCartBar";

vi.mock("react-native", () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  View: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Image: ({ source }: any) => <img src={source?.uri} alt="baucher" />,
  ActivityIndicator: () => null,
  StyleSheet: { create: (styles: any) => styles },
  // El mock local reemplaza al global: lo que falte rompe los hooks que
  // leen la plataforma o el esquema de color.
  // OS "web" evita que `useColorScheme` haga el import dinámico de
  // react-native (el paquete real trae sintaxis Flow que Vite no parsea).
  Platform: { OS: "web", select: (obj: any) => obj?.web ?? obj?.default },
  Appearance: {
    getColorScheme: () => "dark",
    addChangeListener: () => ({ remove: () => {} }),
  },
  useColorScheme: () => "dark",
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityState,
    disabled,
  }: any) => (
    <button
      onClick={onPress}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      aria-expanded={accessibilityState?.expanded}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

vi.mock("@expo/vector-icons/Ionicons", () => ({ default: () => <span /> }));

const baseProps = {
  itemCount: 3,
  cartTotal: 20000,
  onViewCart: vi.fn(),
  insets: { bottom: 0 },
  accentColor: "#E11D48",
  borderColor: "#333",
  cardBg: "#111",
  textPrimary: "#fff",
  textSecondary: "#aaa",
};

describe("revisión del pedido desde la barra", () => {
  it("muestra la cantidad de unidades en el resumen fijo", () => {
    render(<GarzonCartBar {...baseProps} />);

    expect(screen.getByText("3 productos")).toBeTruthy();
  });

  it("lleva al detalle con el botón Revisar pedido", () => {
    const onViewCart = vi.fn();
    render(<GarzonCartBar {...baseProps} onViewCart={onViewCart} />);

    fireEvent.click(screen.getByRole("button", { name: "Revisar pedido" }));
    expect(onViewCart).toHaveBeenCalledTimes(1);
  });

  it("deja los controles de pago, comprobante y propina para el detalle", () => {
    render(<GarzonCartBar {...baseProps} />);

    expect(
      screen.queryByRole("button", { name: /^Editar pago y propina/ })
    ).toBeNull();
    expect(screen.queryByText(/Propina/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Sacar foto del baucher (obligatoria)" })
    ).toBeNull();
  });
});
