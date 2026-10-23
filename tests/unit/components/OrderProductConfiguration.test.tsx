import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/shared/ProductCard";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import { useCartStore } from "@/store/cartStore";

vi.mock("react-native", () => ({
  View: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  ScrollView: ({ children }: any) => <div>{children}</div>,
  Modal: ({ children, visible }: any) =>
    visible ? <div role="dialog">{children}</div> : null,
  Pressable: ({ children, onPress, accessibilityLabel, disabled }: any) => (
    <button
      onClick={onPress}
      aria-label={accessibilityLabel}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  TextInput: ({ value, onChangeText, accessibilityLabel }: any) => (
    <input
      value={value}
      onChange={(event) => onChangeText(event.target.value)}
      aria-label={accessibilityLabel}
    />
  ),
  Image: ({ source, accessibilityLabel }: any) => (
    <img src={source.uri} alt={accessibilityLabel} />
  ),
  ActivityIndicator: () => null,
  Platform: { OS: "web" },
}));
vi.mock("@expo/vector-icons/Ionicons", () => ({ default: () => <span /> }));
vi.mock("@/hooks/useAccentColor", () => ({
  useAccentColor: () => ({
    accentColor: "#123",
    cardBg: "#fff",
    textPrimary: "#000",
    textSecondary: "#555",
    borderColor: "#ddd",
  }),
}));
vi.mock("@/hooks/useConfigValue", () => ({ useConfigValue: () => "50" }));
vi.mock("@/api/base-url", () => ({ BASE_URL: "http://localhost:3000" }));
vi.mock("@/services/mirror", () => ({
  MIRROR_MAX_AGE_MS: { catalogo: 1000 },
  getMirror: () => ({
    readThroughDetailed: async () => ({
      fromCache: false,
      data: {
        success: true,
        data: [
          {
            id: "sprite",
            producto_nombre: "Sprite",
            nombre: "500 ml",
            stock_bar: 0,
            ml_abierta: 350,
            producto_foto: "sprite.png",
          },
        ],
      },
    }),
  }),
}));

const product = {
  id: "vodka:shot-anfitriona",
  producto_id: "vodka",
  presentacion_id: "vodka",
  name: "Vodka Corto anfitriona",
  producto_nombre: "Vodka",
  presentacion_nombre: "750 ml",
  foto: "vodka.png",
  categoria: "Licores",
  code: "V",
  category_id: "licores",
  description: "",
  status: 1,
  price: 20000,
  commission: 3000,
  tipo_venta: "shot" as const,
  shot_anfitriona: true,
  opciones_venta: [{ tipo: "shot", ml_acompanamiento_anfitriona: 150 }],
};
const item = {
  product,
  quantity: 2,
  selectedHostesses: ["ana", "bea"],
  selectedRoom: null,
};

describe("Configuración de producto en Expo", () => {
  it("selecciona la bebida dentro del modal del producto y muestra foto y stock", async () => {
    useCartStore.setState({ cart: [item] });
    render(
      <ProductCard
        product={product}
        cartItem={item}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onConfigPress={vi.fn()}
        anfitrionas={[]}
        rooms={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: `Configurar ${product.name}` }),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: `Soda o gaseosa para ${product.name}` })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: `Soda o gaseosa para ${product.name}`,
      }),
    );
    expect(screen.getByText("0 en bar · 350 ml abiertos")).toBeTruthy();
    expect(screen.getByAltText("Sprite 500 ml").getAttribute("src")).toContain(
      "sprite.png",
    );
    fireEvent.click(screen.getByRole("button", { name: /Sprite 500 ml/ }));
    expect(
      useCartStore.getState().cart[0].product.acompanamiento_corto,
    ).toMatchObject({
      presentacion_id: "sprite",
      ml_por_corto: 150,
      foto: "sprite.png",
    });
  });
  it("el resumen muestra las anfitrionas y el consumo total por ml", () => {
    render(
      <OrderLineInfo
        item={{
          ...item,
          product: {
            ...product,
            acompanamiento_corto: {
              presentacion_id: "sprite",
              nombre: "Sprite",
              ml_por_corto: 150,
            },
          },
        }}
        anfitrionas={[
          { id: "ana", nick: "Ana" },
          { id: "bea", nick: "Bea" },
        ]}
        rooms={[]}
      />,
    );
    expect(screen.getByText("Anfitrionas: Ana, Bea")).toBeTruthy();
    expect(screen.getByText("Bebida total: 300 ml")).toBeTruthy();
    expect(screen.getByText("Subtotal: $40.000")).toBeTruthy();
  });
});
