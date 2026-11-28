import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/types/cart";
import { useCartStore } from "@/store/cartStore";
import PedidoDetalleScreen from "@/app/(app)/garzon/pedido-detalle";

const { router } = vi.hoisted(() => ({
  router: { back: vi.fn(), navigate: vi.fn() },
}));

vi.mock("expo-router", () => ({ useRouter: () => router }));
vi.mock("react-native", () => ({
  Pressable: ({ children, onPress, accessibilityLabel, disabled }: any) => (
    <button
      type="button"
      aria-label={accessibilityLabel}
      onClick={onPress}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  ScrollView: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@expo/vector-icons/Ionicons", () => ({ default: () => null }));
vi.mock("@/hooks/useAccentColor", () => ({
  useAccentColor: () => ({
    bg: "#fff",
    borderColor: "#ddd",
    textPrimary: "#111",
    textSecondary: "#555",
    accentOnSurface: "#123",
    accentColor: "#123",
    cardBg: "#fff",
  }),
}));
vi.mock("@/components/ui/PremiumHeader", () => ({
  PremiumHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/ui/EmptyState", () => ({
  EmptyState: ({ title, actionLabel, onAction }: any) => (
    <div>
      <h2>{title}</h2>
      {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
    </div>
  ),
}));
vi.mock("@/components/garzon/productos/OrderLineInfo", () => ({
  OrderLineInfo: ({ item }: { item: CartItem }) => <span>{item.product.name}</span>,
}));
vi.mock("@/components/shared/ShotMixerSelector", () => ({
  ShotMixerSelector: () => null,
}));

const item: CartItem = {
  product: {
    id: "bottle-a",
    producto_id: "drink-a",
    presentacion_id: "presentation-a",
    category_id: "category-a",
    categoria: "Licores",
    name: "Botella A",
    code: "A",
    price: 10000,
    commission: 1000,
    description: "",
    status: 1,
    foto: "",
    stock_bar: 5,
  },
  quantity: 1,
  selectedHostesses: [],
  selectedRoom: null,
};

describe("PedidoDetalleScreen", () => {
  beforeEach(() => {
    router.back.mockReset();
    router.navigate.mockReset();
    useCartStore.setState({ cart: [item], tipEnabled: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("permite abrir la asignación de anfitriona para la línea pendiente", () => {
    render(<PedidoDetalleScreen />);

    expect(screen.getByText("Falta anfitriona")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Asignar anfitriona para Botella A" }),
    );

    expect(router.navigate).toHaveBeenCalledWith({
      pathname: "/(app)/garzon/productos",
      params: {
        categoryId: "category-a",
        categoryName: "Licores",
        configureProductId: "bottle-a",
        configureType: "hostess",
      },
    });
  });

  it("permite aumentar, reducir y quitar una línea desde el detalle", () => {
    render(<PedidoDetalleScreen />);

    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar cantidad de Botella A" }),
    );
    expect(useCartStore.getState().cart[0].quantity).toBe(2);

    fireEvent.click(
      screen.getByRole("button", { name: "Reducir cantidad de Botella A" }),
    );
    expect(useCartStore.getState().cart[0].quantity).toBe(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar Botella A del pedido" }),
    );
    expect(useCartStore.getState().cart).toEqual([]);
  });

  it("conserva el acompañamiento por unidad al aumentar un corto", () => {
    const mixer = { presentacion_id: "mixer-a", nombre: "Sprite" };
    useCartStore.setState({
      cart: [
        {
          ...item,
          product: {
            ...item.product,
            id: "shot-a",
            tipo_venta: "shot",
            acompanamiento_corto: mixer,
          },
          shortMixers: [mixer],
        },
      ],
    });
    render(<PedidoDetalleScreen />);

    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar cantidad de Botella A" }),
    );

    expect(useCartStore.getState().cart[0].quantity).toBe(2);
    expect(useCartStore.getState().cart[0].shortMixers).toEqual([mixer, mixer]);
  });

  it("mantiene visible el resumen del pedido y desglosa la propina activa", () => {
    useCartStore.setState({ cart: [item], tipEnabled: true, tipPercentage: 10 });

    render(<PedidoDetalleScreen />);

    expect(screen.getByText("Subtotal")).toBeTruthy();
    expect(screen.getByText("Propina (10%)")).toBeTruthy();
    expect(screen.getByText("Total a pagar")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.textContent === "$11.000")).toBeTruthy();
  });

  it("ofrece volver al catálogo cuando se quitó el último producto", () => {
    render(<PedidoDetalleScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar Botella A del pedido" }));

    expect(screen.getByText("Tu pedido está vacío")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Volver a productos" }));

    expect(router.back).toHaveBeenCalled();
  });
});