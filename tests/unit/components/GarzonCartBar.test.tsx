import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GarzonCartBar } from "@/components/garzon/productos/GarzonCartBar";

vi.mock("react-native", () => ({
  View: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Image: ({ source }: any) => <img src={source?.uri} alt="baucher" />,
  ActivityIndicator: () => null,
  StyleSheet: { create: (styles: any) => styles },
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
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

vi.mock("@expo/vector-icons/Ionicons", () => ({ default: () => <span /> }));

const baseProps = {
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
  insets: { bottom: 0 },
  accentColor: "#E11D48",
  borderColor: "#333",
  cardBg: "#111",
  textPrimary: "#fff",
  textSecondary: "#aaa",
};

describe("selector de método de pago del carrito", () => {
  it("muestra los tres métodos que admite el pedido", () => {
    render(<GarzonCartBar {...baseProps} />);
    for (const metodo of ["efectivo", "tarjeta", "transferencia"]) {
      expect(screen.getByRole("button", { name: `Pago ${metodo}` })).toBeTruthy();
    }
  });

  it("marca el método elegido y avisa al cambiar", () => {
    const setMetodoPago = vi.fn();
    render(<GarzonCartBar {...baseProps} setMetodoPago={setMetodoPago} />);

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

describe("foto del baucher obligatoria con transferencia", () => {
  it("pide la foto cuando el pago es transferencia y aún no está adjunta", () => {
    render(<GarzonCartBar {...baseProps} metodoPago="transferencia" />);

    expect(
      screen.getByRole("button", { name: "Sacar foto del baucher (obligatoria)" })
    ).toBeTruthy();
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

  it("abre la cámara desde el aviso cuando falta la foto", () => {
    const onTakeBaucherPhoto = vi.fn();
    render(
      <GarzonCartBar
        {...baseProps}
        metodoPago="transferencia"
        onTakeBaucherPhoto={onTakeBaucherPhoto}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Sacar foto del baucher (obligatoria)" })
    );
    expect(onTakeBaucherPhoto).toHaveBeenCalledTimes(1);
  });
});
