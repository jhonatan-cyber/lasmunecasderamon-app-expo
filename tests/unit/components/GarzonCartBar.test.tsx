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
  tipEnabled: false,
  setTipEnabled: vi.fn(),
  metodoPago: "efectivo" as const,
  setMetodoPago: vi.fn(),
  baucherFoto: null as string | null,
  onTakeBaucherPhoto: vi.fn(),
  tipAmount: 0,
  tipPercentage: 10,
  cartTotal: 20000,
  submitting: false,
  submitOrder: vi.fn(),
  onViewCart: vi.fn(),
  insets: { bottom: 0 },
  accentColor: "#E11D48",
  borderColor: "#333",
  cardBg: "#111",
  textPrimary: "#fff",
  textSecondary: "#aaa",
};

const openCheckoutOptions = () =>
  fireEvent.click(screen.getByRole("button", { name: /^Editar pago y propina/ }));

describe("selector de método de pago del carrito", () => {
  it("mantiene compactos los controles secundarios y permite desplegarlos", () => {
    render(<GarzonCartBar {...baseProps} />);

    expect(screen.getByText("Propina inactiva · Pago efectivo")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Pago efectivo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Enviar Pedido" })).toBeTruthy();

    const optionsButton = screen.getByRole("button", { name: /^Editar pago y propina/ });
    expect(optionsButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(optionsButton);

    for (const metodo of ["efectivo", "tarjeta", "transferencia"]) {
      expect(screen.getByRole("button", { name: `Pago ${metodo}` })).toBeTruthy();
    }
  });

  it("marca el método elegido y avisa al cambiar", () => {
    const setMetodoPago = vi.fn();
    render(<GarzonCartBar {...baseProps} setMetodoPago={setMetodoPago} />);
    openCheckoutOptions();

    expect(
      screen.getByRole("button", { name: "Pago efectivo" }).getAttribute("aria-selected")
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Pago tarjeta" }));
    expect(setMetodoPago).toHaveBeenCalledWith("tarjeta");
  });

  it("sigue enviando el pedido y bloquea el botón mientras envía", () => {
    const submitOrder = vi.fn();
    const { unmount } = render(
      <GarzonCartBar {...baseProps} submitOrder={submitOrder} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Enviar Pedido" }));
    expect(submitOrder).toHaveBeenCalledTimes(1);
    unmount();

    render(<GarzonCartBar {...baseProps} submitting />);
    expect(
      screen.getByRole("button", { name: "Enviar Pedido" }).hasAttribute("disabled")
    ).toBe(true);
  });
});

describe("ver detalle del pedido", () => {
  it("muestra la cantidad de unidades en el resumen fijo", () => {
    render(<GarzonCartBar {...baseProps} />);

    expect(screen.getByText("3 productos")).toBeTruthy();
  });

  it("abre el detalle del pedido al tocar el total", () => {
    const onViewCart = vi.fn();
    render(<GarzonCartBar {...baseProps} onViewCart={onViewCart} />);

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle del pedido" }));
    expect(onViewCart).toHaveBeenCalledTimes(1);
  });
});

describe("foto del baucher obligatoria con transferencia", () => {
  it("pide la foto cuando el pago es transferencia y aún no está adjunta", () => {
    const onTakeBaucherPhoto = vi.fn();
    render(
      <GarzonCartBar
        {...baseProps}
        metodoPago="transferencia"
        onTakeBaucherPhoto={onTakeBaucherPhoto}
      />
    );

    expect(
      screen.getByRole("button", { name: /Editar pago y propina.*Falta comprobante/ })
    ).toBeTruthy();
    const receiptButton = screen.getByRole("button", {
      name: "Sacar foto del baucher (obligatoria)",
    });
    fireEvent.click(receiptButton);
    expect(onTakeBaucherPhoto).toHaveBeenCalledTimes(1);

    openCheckoutOptions();
    expect(
      screen.getAllByRole("button", { name: "Sacar foto del baucher (obligatoria)" })
    ).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Repetir foto del baucher" })
    ).toBeNull();
  });

  it("muestra la foto adjunta y permite repetirla desde la cámara", () => {
    const onTakeBaucherPhoto = vi.fn();
    render(
      <GarzonCartBar
        {...baseProps}
        metodoPago="transferencia"
        baucherFoto="data:image/jpeg;base64,SG9sYQ=="
        onTakeBaucherPhoto={onTakeBaucherPhoto}
      />
    );

    expect(screen.getByText("Comprobante adjunto · tocar para reemplazar")).toBeTruthy();
    expect(screen.getByRole("img", { name: "baucher" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Repetir foto del baucher" }));
    expect(onTakeBaucherPhoto).toHaveBeenCalledTimes(1);
  });

  it("no muestra el aviso del baucher si el pago no es transferencia", () => {
    render(<GarzonCartBar {...baseProps} />);

    expect(
      screen.queryByRole("button", { name: "Sacar foto del baucher (obligatoria)" })
    ).toBeNull();
  });
});
