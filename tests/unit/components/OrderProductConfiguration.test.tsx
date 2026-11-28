import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/shared/ProductCard";
import { GarzonProductConfigModal } from "@/components/garzon/productos/GarzonProductConfigModal";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import { useCartStore } from "@/store/cartStore";
import { groupProductsByPresentation } from "@/utils/productPresentationGroups";
import { groupProductPresentationRows } from "@/utils/productPresentationRows";

vi.mock('@/components/ui/NotificationBanner', () => ({ NotificationBanner: () => null }));
vi.mock("react-native", () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  View: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  ScrollView: ({ children }: any) => <div>{children}</div>,
  Modal: ({ children, visible }: any) =>
    visible ? <div role="dialog">{children}</div> : null,
  Pressable: ({ children, onPress, accessibilityLabel, accessibilityState, disabled }: any) => (
    <button
      onClick={onPress}
      aria-label={accessibilityLabel}
      aria-pressed={accessibilityState?.selected}
      aria-expanded={accessibilityState?.expanded}
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
  ActivityIndicator: () => <span data-testid="mixer-loading" />,
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Platform: { OS: "web" },
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@expo/vector-icons/Ionicons", () => ({
  default: ({ name }: { name: string }) => <span data-icon={name} />,
}));
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
            categoria_nombre: "Bebidas analcohólicas",
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
            categoria_nombre: "Bebidas analcohólicas",
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
  it("agrupa las modalidades de venta por producto y presentación", () => {
    const bottle = {
      ...product,
      id: "vodka:botella",
      name: "Vodka - Botella sola",
      tipo_venta: "botella" as const,
      commission: 0,
    };
    const otherPresentation = {
      ...bottle,
      id: "vodka-1000:botella",
      presentacion_id: "vodka-1000",
    };

    const groups = groupProductsByPresentation([
      product,
      bottle,
      otherPresentation,
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].variants.map((variant) => variant.id)).toEqual([
      product.id,
      bottle.id,
    ]);
    expect(groups[1].variants).toEqual([otherPresentation]);
  });

  it("pone las tarjetas con varias modalidades en filas individuales", () => {
    const singleVariant = (key: string) => ({ key, variants: [product] });
    const multipleVariants = (key: string) => ({
      key,
      variants: [product, { ...product, id: `${key}:bottle` }],
    });
    const groups = [
      singleVariant("single-1"),
      singleVariant("single-2"),
      multipleVariants("multiple-1"),
      singleVariant("single-3"),
      singleVariant("single-4"),
      singleVariant("single-5"),
      multipleVariants("multiple-2"),
    ];

    const rows = groupProductPresentationRows(groups, 3);

    expect(rows.map((row) => row.map((group) => group.key))).toEqual([
      ["single-1", "single-2"],
      ["multiple-1"],
      ["single-3", "single-4", "single-5"],
      ["multiple-2"],
    ]);
  });

  it("mantiene plegadas las modalidades hasta expandir la tarjeta", () => {
    useCartStore.setState({ cart: [] });
    const bottle = {
      ...product,
      id: "vodka:botella",
      name: "Vodka Botella",
      tipo_venta: "botella" as const,
      shot_anfitriona: false,
      commission: 0,
      price: 30000,
    };
    render(
      <ProductCard
        product={product}
        saleVariants={[product, bottle]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onConfigPress={vi.fn()}
        anfitrionas={[]}
        rooms={[]}
      />,
    );

    const expandButton = screen.getByRole("button", {
      name: `Expandir opciones de venta de ${product.name}`,
    });
    expect(expandButton.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.queryByRole("button", { name: "Abrir Botella sola · $20.000" }),
    ).toBeNull();

    fireEvent.click(expandButton);

    const collapseButton = screen.getByRole("button", {
      name: `Contraer opciones de venta de ${product.name}`,
    });
    expect(collapseButton.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Abrir Botella sola · $30.000" }),
    ).toBeTruthy();
    fireEvent.click(collapseButton);
    expect(
      screen.queryByRole("button", { name: "Abrir Botella sola · $30.000" }),
    ).toBeNull();
  });

  it("abre la modalidad elegida sin un botón general ni un selector duplicado", () => {
    useCartStore.setState({ cart: [] });
    const bottle = {
      ...product,
      id: "vodka:botella",
      name: "Vodka - Botella sola",
      tipo_venta: "botella" as const,
      shot_anfitriona: false,
      price: 30000,
      commission: 3000,
      stock_bar: 1,
    };
    const onConfigPress = vi.fn();

    render(
      <ProductCard
        product={product}
        saleVariants={[product, bottle]}
        onAdd={useCartStore.getState().addToCart}
        onRemove={useCartStore.getState().removeFromCart}
        onConfigPress={onConfigPress}
        anfitrionas={[]}
        rooms={[]}
        layout="list"
      />,
    );

    expect(
      screen.queryByRole("button", { name: `Configurar ${product.name}` }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: `Expandir opciones de venta de ${product.name}`,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Abrir Botella con anfitriona · $30.000" }),
    );
    expect(useCartStore.getState().cart).toHaveLength(0);
    expect(screen.queryByText("Modalidad de venta")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Elegir Botella con anfitriona/ }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `Aumentar ${bottle.name}` }));
    expect(screen.getByRole("button", { name: "Seleccionar anfitriona(s) (máx 1)" })).toBeTruthy();
    expect(screen.queryByText("Seleccionar habitación")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Agregar 1 al pedido" }));
    expect(useCartStore.getState().cart).toHaveLength(1);
    expect(useCartStore.getState().cart[0].product.id).toBe(bottle.id);

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir Corto anfitriona · $20.000" }),
    );
    expect(screen.queryByText("Modalidad de venta")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: `Aumentar ${product.name}` })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: `Aumentar ${product.name}` }));
    expect(screen.getByRole("button", { name: /Soda o gaseosa para Vodka/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar anfitriona(s) (máx 1)" }));
    expect(onConfigPress).toHaveBeenCalledWith(product.id, "hostess");
  });

  it.each(["grid", "list"] as const)(
    "abre directamente el modal y muestra la tarjeta sin flecha en layout %s",
    (layout) => {
      useCartStore.setState({ cart: [] });
      const { container } = render(
        <ProductCard
          product={product}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
          onConfigPress={vi.fn()}
          anfitrionas={[]}
          rooms={[]}
          layout={layout}
        />,
      );

      const productButton = screen.getByRole("button", {
        name: `Configurar ${product.name}`,
      });
      expect(productButton.querySelector('[data-icon="chevron-forward"]')).toBeNull();
      expect(productButton.contains(screen.getByText("Licores"))).toBe(true);
      expect(productButton.contains(screen.getByText("750 ml"))).toBe(true);
      expect(container.querySelector('[data-icon="chevron-forward"]')).toBeNull();
      fireEvent.click(productButton);
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(screen.queryByText("Modalidad de venta")).toBeNull();
      expect(screen.getByText("$20.000")).toBeTruthy();
      expect(screen.getByText("Corto anfitriona")).toBeTruthy();
      expect(screen.queryByText("TRAGO")).toBeNull();
    },
  );

  it("limita la cantidad de botella al stock compartido entre modalidades", () => {
    const bottle = {
      ...product,
      id: "vodka:botella",
      name: "Vodka Botella",
      tipo_venta: "botella" as const,
      commission: 0,
      stock_bar: 1,
    };
    const anotherBottle = {
      ...bottle,
      id: "vodka:botella-en-pedido",
      name: "Vodka Botella en pedido",
    };
    useCartStore.setState({
      cart: [
        {
          product: anotherBottle,
          quantity: 1,
          selectedHostesses: [],
          selectedRoom: null,
        },
      ],
    });

    render(
      <ProductCard
        product={product}
        saleVariants={[product, bottle]}
        onAdd={useCartStore.getState().addToCart}
        onRemove={useCartStore.getState().removeFromCart}
        onConfigPress={vi.fn()}
        anfitrionas={[]}
        rooms={[]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `Expandir opciones de venta de ${product.name}`,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Abrir Botella sola · $20.000" }));

    expect(
      screen.getByRole("button", { name: `Aumentar ${bottle.name}` }).hasAttribute("disabled"),
    ).toBe(true);
    expect(useCartStore.getState().cart).toHaveLength(1);
  });

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
    await waitFor(() =>
      expect(screen.queryByTestId("mixer-loading")).toBeNull(),
    );
    // El selector está bloqueado hasta que se indique al menos una unidad.
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: `Soda o gaseosa para ${product.name}`,
        }).hasAttribute("disabled"),
      ).toBe(true),
    );

    fireEvent.click(
      screen.getByRole("button", { name: `Aumentar ${product.name}` }),
    );
    expect(
      screen
        .getByRole("button", { name: `Soda o gaseosa para ${product.name}` })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
  it("muestra las anfitrionas después de las bebidas de cada corto", async () => {
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
    await waitFor(() =>
      expect(screen.queryByTestId("mixer-loading")).toBeNull(),
    );

    const aumentar = screen.getByRole("button", {
      name: `Aumentar ${product.name}`,
    });
    fireEvent.click(aumentar);
    fireEvent.click(aumentar);

    const primerCorto = screen.getByRole("button", {
      name: `Soda o gaseosa para ${product.name}, corto 1`,
    });
    const segundoCorto = screen.getByRole("button", {
      name: `Soda o gaseosa para ${product.name}, corto 2`,
    });
    const anfitrionas = screen
      .getByText("Seleccionar anfitriona(s) (máx 2)")
      .closest("button");

    expect(anfitrionas).not.toBeNull();
    expect(
      primerCorto.compareDocumentPosition(segundoCorto) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      segundoCorto.compareDocumentPosition(anfitrionas!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
  it("bloquea el selector de botella hasta aumentar el contador", async () => {
    useCartStore.setState({ cart: [] });
    const botella = {
      ...product,
      id: "whisky:botella-acompanamiento-nueva",
      producto_id: "whisky",
      name: "Whisky con acompañamiento",
      tipo_venta: "botella" as const,
      shot_anfitriona: undefined,
      opciones_venta: [
        { tipo: "botella", acompanamiento: { unidades: 4 } },
      ],
    };

    render(
      <ProductCard
        product={botella}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onConfigPress={vi.fn()}
        anfitrionas={[]}
        rooms={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: `Configurar ${botella.name}` }),
    );

    const selector = screen.getByRole("button", {
      name: `Agregar sabor para ${botella.name}`,
    });
    await waitFor(() =>
      expect(screen.queryByTestId("mixer-loading")).toBeNull(),
    );
    expect(selector.hasAttribute("disabled")).toBe(true);

    fireEvent.click(
      screen.getByRole("button", { name: `Aumentar ${botella.name}` }),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: `Agregar sabor para ${botella.name}` })
          .hasAttribute("disabled"),
      ).toBe(false),
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

  it.each([
    {
      type: "hostess" as const,
      trigger: "Cambiar anfitrionas (máx 1)",
      title: "Asignar Anfitrionas (Máx 1)",
    },
  ])("abre el selector de $type sobre el modal de producto", ({ type, trigger, title }) => {
    const bottle = {
      ...product,
      id: `whisky:${type}-config-modal`,
      name: "Whisky Configuración",
      tipo_venta: "botella" as const,
      shot_anfitriona: undefined,
      price: 40000,
      commission: 100,
      opciones_venta: [{ tipo: "botella" }],
    };
    useCartStore.setState({
      cart: [
        {
          product: bottle,
          quantity: 1,
          selectedHostesses: [],
          selectedRoom: null,
        },
      ],
    });

    const ConfigurableProductCard = () => {
      const [activeConfigItem, setActiveConfigItem] = React.useState<{
        productId: string;
        type: "hostess" | "room";
      } | null>(null);

      return (
        <ProductCard
          product={bottle}
          onAdd={useCartStore.getState().addToCart}
          onRemove={vi.fn()}
          onConfigPress={(productId, configType) =>
            setActiveConfigItem({ productId, type: configType })
          }
          onConfigClose={() => setActiveConfigItem(null)}
          activeConfigItem={activeConfigItem}
          anfitrionas={[]}
          rooms={[]}
        />
      );
    };

    render(<ConfigurableProductCard />);
    fireEvent.click(
      screen.getByRole("button", { name: `Configurar ${bottle.name}` }),
    );
    fireEvent.click(screen.getByRole("button", { name: trigger }));

    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].contains(screen.getByText(title))).toBe(true);
    expect(screen.getByText(title)).toBeTruthy();
  });

  it.each(["hostess", "room"] as const)(
    "muestra un botón para cerrar el selector de $type",
    (type) => {
      useCartStore.setState({
        cart: [
          {
            product,
            quantity: 1,
            selectedHostesses: [],
            selectedRoom: null,
          },
        ],
      });

      render(
        <GarzonProductConfigModal
          visible
          productId={product.id}
          type={type}
          hostesses={[]}
          rooms={[]}
          maxHostesses={2}
          bottomInset={0}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Cerrar selección" }),
      ).toBeTruthy();
    },
  );

  it("permite alternar la selección de una anfitriona sin cerrar el selector", async () => {
    useCartStore.setState({
      cart: [
        {
          product,
          quantity: 1,
          selectedHostesses: [],
          selectedRoom: null,
        },
      ],
    });
    const onClose = vi.fn();

    render(
      <GarzonProductConfigModal
        visible
        productId={product.id}
        type="hostess"
        hostesses={[{ id: "ana", name: "Ana", nick: "Ana" }]}
        rooms={[]}
        maxHostesses={2}
        bottomInset={0}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ana" }));
    await waitFor(() =>
      expect(useCartStore.getState().cart[0].selectedHostesses).toEqual([
        "ana",
      ]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Ana" }));
    await waitFor(() =>
      expect(useCartStore.getState().cart[0].selectedHostesses).toEqual([]),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("permite seleccionar y deseleccionar una habitación antes de cerrar", () => {
    const bottle = { ...product, id: "vodka:bottle", tipo_venta: "botella" as const };
    useCartStore.setState({
      cart: [
        {
          product,
          quantity: 1,
          selectedHostesses: [],
          selectedRoom: null,
        },
        {
          product: bottle,
          quantity: 1,
          selectedHostesses: [],
          selectedRoom: null,
        },
      ],
    });
    const onClose = vi.fn();

    render(
      <GarzonProductConfigModal
        visible
        productId={product.id}
        productIds={[product.id, bottle.id]}
        type="room"
        hostesses={[]}
        rooms={[{ id: "room-1", name: "VIP 1" }]}
        maxHostesses={2}
        bottomInset={0}
        onClose={onClose}
      />,
    );

    const room = screen.getByRole("button", { name: "VIP 1" });
    fireEvent.click(room);
    expect(useCartStore.getState().cart.map((item) => item.selectedRoom)).toEqual([
      "room-1",
      "room-1",
    ]);
    fireEvent.click(room);
    expect(useCartStore.getState().cart.map((item) => item.selectedRoom)).toEqual([
      null,
      null,
    ]);
    expect(onClose).not.toHaveBeenCalled();
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

  it("deja la habitación para el detalle del pedido, no para agregar la línea", () => {
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

    expect(screen.queryByText("Seleccionar habitación")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: `Aumentar ${botella.name}`,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Agregar 1 al pedido" }));
    expect(screen.queryByText("Seleccionar habitación")).toBeNull();
    expect(onConfigPress).not.toHaveBeenCalledWith(botella.id, "room");
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
