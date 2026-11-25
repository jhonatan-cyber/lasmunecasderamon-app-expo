import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/shared/ProductCard";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import { useCartStore } from "@/store/cartStore";

vi.mock('@/components/ui/NotificationBanner', () => ({ NotificationBanner: () => null }));
vi.mock("react-native", () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
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
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Platform: { OS: "web" },
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
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
            producto_estado: 1,
            producto_foto: "sprite.png",
            opciones_venta: [
              {
                tipo: "botella",
                corto_anfitriona_habilitado: true,
                colacion_habilitada: true,
              },
            ],
          },
          {
            id: "fanta",
            producto_nombre: "Fanta",
            nombre: "500 ml",
            stock_bar: 100,
            ml_abierta: 0,
            producto_estado: 1,
            producto_foto: "fanta.png",
            opciones_venta: [
              {
                tipo: "botella",
                corto_anfitriona_habilitado: true,
                colacion_habilitada: true,
              },
            ],
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
  it("permite elegir una bebida distinta para cada corto y muestra foto y stock", async () => {
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
    const primerCorto = `Soda o gaseosa para ${product.name}, corto 1`;
    const segundoCorto = `Soda o gaseosa para ${product.name}, corto 2`;
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: primerCorto }).hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: primerCorto }));
    expect(screen.getByText("350 ml abiertos")).toBeTruthy();
    expect(screen.getByAltText("Sprite 500 ml").getAttribute("src")).toContain(
      "sprite.png",
    );
    fireEvent.click(screen.getByRole("button", { name: /Sprite 500 ml/ }));

    fireEvent.click(screen.getByRole("button", { name: segundoCorto }));
    fireEvent.click(screen.getByRole("button", { name: /Fanta 500 ml/ }));

    expect(
      useCartStore.getState().cart[0].shortMixers,
    ).toMatchObject([
      {
        presentacion_id: "sprite",
        ml_por_corto: 150,
        foto: "sprite.png",
      },
      {
        presentacion_id: "fanta",
        ml_por_corto: 150,
        foto: "fanta.png",
      },
    ]);
    expect(
      useCartStore.getState().cart[0].product.acompanamiento_corto,
    ).toMatchObject({ presentacion_id: "sprite" });
  });
  it("guarda una bebida por cada corto nuevo al agregar al pedido", async () => {
    useCartStore.setState({ cart: [] });
    render(
      <ProductCard
        product={product}
        onAdd={useCartStore.getState().addToCart}
        onRemove={vi.fn()}
        onConfigPress={vi.fn()}
        anfitrionas={[]}
        rooms={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: `Configurar ${product.name}` }),
    );
    const aumentar = screen.getByRole("button", {
      name: `Aumentar ${product.name}`,
    });
    fireEvent.click(aumentar);
    fireEvent.click(aumentar);

    const primerCorto = `Soda o gaseosa para ${product.name}, corto 1`;
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: primerCorto }).hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: primerCorto }));
    fireEvent.click(screen.getByRole("button", { name: /Sprite 500 ml/ }));
    fireEvent.click(
      screen.getByRole("button", {
        name: `Soda o gaseosa para ${product.name}, corto 2`,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Fanta 500 ml/ }));

    fireEvent.click(
      screen.getByRole("button", { name: "Agregar 2 al pedido" }),
    );

    const cart = useCartStore.getState().cart;
    expect(cart[0].quantity).toBe(2);
    expect(cart[0].shortMixers?.map((mixer) => mixer?.presentacion_id)).toEqual([
      "sprite",
      "fanta",
    ]);
  });
  it("muestra la bebida de acompañamiento antes de agregar el corto con anfitriona", async () => {
    useCartStore.setState({ cart: [] });
    render(
      <ProductCard
        product={product}
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
    // El selector aparece dentro del modal aunque el corto todavía no esté en
    // el carrito, igual que en el dashboard.
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: `Soda o gaseosa para ${product.name}`,
        }),
      ).toBeTruthy(),
    );
  });
  it("activa el selector de anfitrionas al subir el contador desde cero", () => {
    useCartStore.setState({ cart: [] });
    const onConfigPress = vi.fn();
    const botella = {
      ...product,
      id: "whisky:botella",
      producto_id: "whisky",
      name: "Whisky Botella",
      tipo_venta: "botella" as const,
      shot_anfitriona: undefined,
      price: 40000,
      opciones_venta: [{ tipo: "botella" }],
    };

    render(
      <ProductCard
        product={botella}
        onAdd={useCartStore.getState().addToCart}
        onRemove={vi.fn()}
        onConfigPress={onConfigPress}
        anfitrionas={[]}
        rooms={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: `Configurar ${botella.name}` }),
    );

    const selectorDeshabilitado = screen
      .getByText("Seleccionar anfitriona (máx 1)")
      .closest("button");
    expect(selectorDeshabilitado?.hasAttribute("disabled")).toBe(true);

    const aumentar = screen.getByRole("button", {
      name: `Aumentar ${botella.name}`,
    });
    fireEvent.click(aumentar);
    fireEvent.click(aumentar);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Seleccionar anfitriona(s) (máx 2)",
      }),
    );

    expect(onConfigPress).toHaveBeenCalledWith(botella.id, "hostess");
    expect(useCartStore.getState().cart[0].quantity).toBe(2);
    // El contador no vuelve a cero: sigue mostrando las 2 unidades elegidas.
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("permite repartir el acompañamiento total según la cantidad de botellas", async () => {
    const botella = {
      ...product,
      id: "whisky:botella-acompanamiento",
      producto_id: "whisky",
      presentacion_id: "whisky",
      name: "Whisky Acompañamiento",
      tipo_venta: "botella" as const,
      shot_anfitriona: undefined,
      price: 40000,
      opciones_venta: [
        { tipo: "botella", acompanamiento: { unidades: 4 } },
      ],
    };
    useCartStore.setState({
      cart: [
        {
          product: botella,
          quantity: 2,
          selectedHostesses: [],
          selectedRoom: null,
        },
      ],
    });

    render(
      <ProductCard
        product={botella}
        onAdd={useCartStore.getState().addToCart}
        onRemove={vi.fn()}
        onConfigPress={vi.fn()}
        anfitrionas={[]}
        rooms={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: `Configurar ${botella.name}` }),
    );

    const seleccionarBebida = `Agregar sabor para ${botella.name}`;
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: seleccionarBebida }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: seleccionarBebida }));
    fireEvent.click(screen.getByRole("button", { name: /Fanta 500 ml/ }));

    // 4 unidades por botella × 2 botellas = 8 en total.
    expect(screen.getByText("Stock: 100 · máx 8")).toBeTruthy();
    const agregar = screen.getByRole("button", {
      name: "Agregar una unidad de Fanta 500 ml",
    });
    fireEvent.click(agregar);
    fireEvent.click(agregar);
    fireEvent.click(agregar);

    expect(
      useCartStore.getState().cart[0].product.acompanamiento_botella,
    ).toMatchObject([{ presentacion_id: "fanta", unidades: 4 }]);
  });

  it("activa el selector de habitación al subir el contador desde cero", () => {
    useCartStore.setState({ cart: [] });
    const onConfigPress = vi.fn();
    const botella = {
      ...product,
      id: "whisky:botella-room",
      producto_id: "whisky",
      name: "Whisky Habitación",
      tipo_venta: "botella" as const,
      shot_anfitriona: undefined,
      price: 40000,
      opciones_venta: [{ tipo: "botella" }],
    };

    render(
      <ProductCard
        product={botella}
        onAdd={useCartStore.getState().addToCart}
        onRemove={vi.fn()}
        onConfigPress={onConfigPress}
        anfitrionas={[]}
        rooms={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: `Configurar ${botella.name}` }),
    );

    const selectorHabitacion = screen
      .getByText("Seleccionar habitación")
      .closest("button");
    expect(selectorHabitacion?.hasAttribute("disabled")).toBe(true);

    fireEvent.click(
      screen.getByRole("button", {
        name: `Aumentar ${botella.name}`,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Seleccionar habitación" }),
    );

    expect(onConfigPress).toHaveBeenCalledWith(botella.id, "room");
    expect(useCartStore.getState().cart[0].quantity).toBe(1);
  });

  it("avisa cuando el corto anfitriona no tiene ml de acompañamiento configurados", () => {
    useCartStore.setState({ cart: [] });
    render(
      <ProductCard
        product={{
          ...product,
          id: "vodka:shot-anfitriona-sin-ml",
          opciones_venta: [{ tipo: "shot" }],
        }}
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
    expect(
      screen.getByText(
        "Configura los ml de bebida para corto anfitriona en este producto.",
      ),
    ).toBeTruthy();
  });
  it("el resumen muestra el precio y la comisión", () => {
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
      />,
    );
    expect(screen.getByText(/Precio c\/u:/)).toBeTruthy();
    expect(screen.getByText(/Comisión:/)).toBeTruthy();
  });
});
