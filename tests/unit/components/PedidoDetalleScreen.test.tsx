import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/types/cart";
import { useCartStore } from "@/store/cartStore";
import PedidoDetalleScreen from "@/app/(app)/garzon/pedido-detalle";

const { router } = vi.hoisted(() => ({
  router: { back: vi.fn(), navigate: vi.fn() },
}));

vi.mock("expo-router", () => ({ useRouter: () => router }));
vi.mock("react-native", () => ({
  Pressable: ({ children, onPress, accessibilityLabel, accessibilityRole, accessibilityState, disabled }: any) => (
    <button
      type="button"
      role={accessibilityRole || "button"}
      aria-label={accessibilityLabel}
      aria-expanded={accessibilityState?.expanded}
      aria-pressed={accessibilityState?.selected}
      onClick={onPress}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  Modal: ({ visible, children }: any) => visible ? <div role="dialog">{children}</div> : null,
  ScrollView: ({ children }: any) => <div>{children}</div>,
  ActivityIndicator: () => null,
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Platform: { OS: "web" },
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@expo/vector-icons/Ionicons", () => ({ default: () => null }));
vi.mock("expo-image", () => ({ Image: () => null }));
vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return {
    ...actual,
    apiClientSafe: vi.fn(async (endpoint: string) => {
      if (endpoint === "/hostesses") {
        return {
          success: true,
          data: [
            { id: "hostess-a", nick: "Ana" },
            { id: "hostess-b", nick: "Bea" },
          ],
        };
      }
      if (endpoint.startsWith("/rooms")) {
        return {
          success: true,
          data: [{ id: "room-a", name: "Sala 1", status: 1 }],
        };
      }
      return { success: true, data: [] };
    }),
  };
});
vi.mock("@/services/mirror", () => ({
  getMirror: () => ({
    readThroughDetailed: async (_key: string, fetcher: () => Promise<unknown>) => ({
      data: await fetcher(),
    }),
  }),
  MIRROR_KEYS: { anfitrionas: "hostesses", roomsAvailable: "rooms-available" },
  MIRROR_MAX_AGE_MS: { catalogo: 60_000 },
}));
vi.mock("@/hooks/useConfigValue", () => ({
  useConfigValue: (_category: string, key: string, defaultValue: unknown) =>
    key === "tope_precio_acompañamiento" ? "5000" : defaultValue,
}));
vi.mock("@/hooks/useBaucherPhoto", () => ({
  useBaucherPhoto: (_context: string, controlledPhoto: any) => ({
    baucherFoto: controlledPhoto.baucherFoto,
    takeBaucherPhoto: vi.fn(),
  }),
}));
vi.mock("@/components/ui/PremiumAlert", () => ({ PremiumAlert: () => null }));
vi.mock("@/components/ui/AppModal", () => ({
  AppModal: ({ visible, children }: any) =>
    visible ? <div role="dialog">{children}</div> : null,
}));
vi.mock("@/components/ui/AnimatedView", () => ({
  AnimatedView: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/cajero/forms/PaymentMethodSelect", () => ({
  PaymentMethodSelect: ({ methods, selectedMethod, onSelect }: any) => (
    <div>
      {methods.map((method: string) => (
        <button
          key={method}
          type="button"
          aria-label={`Pago ${method}`}
          aria-pressed={selectedMethod === method}
          onClick={() => onSelect(method)}
        >
          {method}
        </button>
      ))}
    </div>
  ),
}));
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
  ShotMixerSelector: ({ label }: { label: string }) => <span>{label}</span>,
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
    useCartStore.setState({
      cart: [item],
      tipEnabled: false,
      metodoPago: "efectivo",
      baucherFoto: null,
    } as never);
  });

  afterEach(() => {
    cleanup();
  });

  it("permite asignar anfitrionas distintas a cada producto", async () => {
    const secondItem = {
      ...item,
      product: { ...item.product, id: "bottle-b", name: "Botella B" },
    };
    useCartStore.setState({ cart: [item, secondItem] });
    render(<PedidoDetalleScreen />);

    expect(screen.queryByRole("button", { name: "Seleccionar anfitrionas" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expandir detalles de Botella A" }));
    fireEvent.click(await screen.findByRole("button", { name: "Asignar anfitrionas para Botella A" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ana" }));

    await waitFor(() => {
      expect(useCartStore.getState().cart[0].selectedHostesses).toEqual(["hostess-a"]);
    });

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.getByText("Ana")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Expandir detalles de Botella B" }));
    fireEvent.click(await screen.findByRole("button", { name: "Asignar anfitrionas para Botella B" }));
    fireEvent.click(screen.getByRole("radio", { name: "Bea" }));

    await waitFor(() => {
      expect(useCartStore.getState().cart.map((cartItem) => cartItem.selectedHostesses)).toEqual([
        ["hostess-a"],
        ["hostess-b"],
      ]);
    });
  });

  it("asigna una sola habitación a todos los productos que la requieren", async () => {
    const bottleA = {
      ...item,
      product: { ...item.product, price: 30000 },
    };
    const bottleB = {
      ...item,
      product: {
        ...item.product,
        id: "bottle-b",
        name: "Botella B",
        price: 30000,
      },
    };
    useCartStore.setState({ cart: [bottleA, bottleB], tipEnabled: false });
    render(<PedidoDetalleScreen />);

    fireEvent.click(await screen.findByRole("button", { name: "Seleccionar habitación" }));
    fireEvent.click(screen.getByRole("button", { name: "Sala 1, LIBRE" }));

    expect(useCartStore.getState().cart.map((cartItem) => cartItem.selectedRoom)).toEqual([
      "room-a",
      "room-a",
    ]);
    expect(screen.getByText("Sala 1")).toBeTruthy();
    expect(screen.queryByText("Cambiar")).toBeNull();
    expect(screen.queryByRole("button", { name: /habitación para Botella/ })).toBeNull();
  });

  it("conserva anfitrionas distintas y unifica la habitación al abrir el detalle", async () => {
    const assigned = (id: string, name: string, hostessId: string, roomId: string) => ({
      ...item,
      product: {
        ...item.product,
        id,
        name,
        price: 30000,
        tipo_venta: "shot" as const,
        shot_anfitriona: true,
      },
      selectedHostesses: [hostessId],
      selectedRoom: roomId,
    });
    useCartStore.setState({
      cart: [
        assigned("shot-a", "Corto A", "hostess-a", "room-a"),
        assigned("shot-b", "Corto B", "hostess-b", "room-b"),
      ],
    });
    render(<PedidoDetalleScreen />);

    await waitFor(() => {
      expect(useCartStore.getState().cart.map((cartItem) => cartItem.selectedHostesses)).toEqual([
        ["hostess-a"],
        ["hostess-b"],
      ]);
      expect(useCartStore.getState().cart.map((cartItem) => cartItem.selectedRoom)).toEqual([
        "room-a",
        "room-a",
      ]);
    });
  });

  it("inicia todas las tarjetas plegadas y permite desplegar sus detalles", () => {
    const secondItem = {
      ...item,
      product: { ...item.product, id: "bottle-b", name: "Botella B" },
    };
    useCartStore.setState({ cart: [item, secondItem] });
    render(<PedidoDetalleScreen />);

    const cardToggle = screen.getByRole("button", { name: "Expandir detalles de Botella A" });
    expect(cardToggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Aumentar cantidad de Botella A" })).toBeNull();
    expect(screen.getByRole("button", { name: "Expandir detalles de Botella B" })).toBeTruthy();

    fireEvent.click(cardToggle);

    expect(screen.getByRole("button", { name: "Contraer detalles de Botella A" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Aumentar cantidad de Botella A" })).toBeTruthy();
  });

  it("muestra el subtotal sin el excedente de bebida y lo suma al total", async () => {
    const itemWithExpensiveMixer = {
      ...item,
      product: {
        ...item.product,
        tipo_venta: "botella" as const,
        unidades_acompanamiento: 1,
        acompanamiento_botella: {
          presentacion_id: "mixer-a",
          unidades: 1,
          precio: 8000,
        },
      },
    };
    useCartStore.setState({ cart: [itemWithExpensiveMixer] });
    render(<PedidoDetalleScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Expandir detalles de Botella A" }));

    expect(screen.getByText("Bebida de acompañamiento")).toBeTruthy();
    expect(
      await screen.findByText("Excedente de bebida"),
    ).toBeTruthy();
    expect(screen.getByText("+$3.000")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.textContent === "$10.000")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.textContent === "$13.000")).toBeTruthy();
    expect(useCartStore.getState().getTotal()).toBe(13000);
  });

  it("permite aumentar, reducir y quitar una línea desde el detalle", () => {
    render(<PedidoDetalleScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Expandir detalles de Botella A" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Expandir detalles de Botella A" }));

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
    expect(screen.getAllByText("Propina (10%)")).toHaveLength(2);
    expect(screen.getByText("Total a pagar")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.textContent === "$11.000")).toBeTruthy();
  });

  it("permite elegir el método de pago y activar la propina desde el detalle", () => {
    render(<PedidoDetalleScreen />);

    const productName = screen.getByText("Botella A");
    const cashPayment = screen.getByRole("button", { name: "Pago efectivo" });
    expect(productName.compareDocumentPosition(cashPayment) & 4).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Volver a productos" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Pago tarjeta" }));
    expect(useCartStore.getState().metodoPago).toBe("tarjeta");

    fireEvent.click(screen.getByRole("button", { name: "Activar propina" }));
    expect(useCartStore.getState().tipEnabled).toBe(true);
  });

  it("muestra la captura del comprobante al elegir transferencia", () => {
    render(<PedidoDetalleScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Pago transferencia" }));

    expect(
      screen.getByRole("button", { name: "Sacar foto del baucher (obligatoria)" }),
    ).toBeTruthy();
  });

  it("envía el pedido desde el pie del detalle", () => {
    render(<PedidoDetalleScreen />);

    expect(screen.getByRole("button", { name: "Enviar pedido" })).toBeTruthy();
  });

  it("no ofrece volver a productos y conserva el estado vacío", () => {
    render(<PedidoDetalleScreen />);
    expect(screen.queryByRole("button", { name: "Volver a productos" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expandir detalles de Botella A" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar Botella A del pedido" }));

    expect(screen.getByText("Tu pedido está vacío")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Volver a productos" })).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });
});