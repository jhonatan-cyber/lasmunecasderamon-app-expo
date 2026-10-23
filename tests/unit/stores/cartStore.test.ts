import { apiClientSafe } from "@/api/client";
vi.mock("@/api/client", () => ({ apiClientSafe: vi.fn() }));
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCartStore } from "@/store/cartStore";

const mockProduct = {
  id: "prod-1",
  code: "P-001",
  name: "Cerveza Corona",
  category_id: "cat-1",
  price: 15000,
  commission: 0,
  description: "Cerveza fria",
  status: 1,
  foto: "corona.png",
  categoria: "Bebidas",
};

const mockChampagne = {
  id: "prod-2",
  code: "P-002",
  name: "Champagne Moet",
  category_id: "cat-2",
  price: 85000,
  commission: 0,
  description: "Botella premium",
  status: 1,
  foto: "moet.png",
  categoria: "Champana",
};

describe("cartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ cart: [], tipEnabled: false, tipPercentage: 10 });
  });

  it("debe iniciar con carrito vacio y tip deshabilitado", () => {
    const state = useCartStore.getState();
    expect(state.cart).toEqual([]);
    expect(state.tipEnabled).toBe(false);
  });

  it("addToCart: debe agregar un producto nuevo al carrito", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    const cart = useCartStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].product).toEqual(mockProduct);
    expect(cart[0].quantity).toBe(1);
  });

  it("addToCart: debe incrementar quantity si el producto ya existe", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().addToCart(mockProduct as any);
    const cart = useCartStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it("addToCart: debe manejar multiples productos distintos", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().addToCart(mockChampagne as any);
    const cart = useCartStore.getState().cart;
    expect(cart).toHaveLength(2);
    expect(cart[0].quantity).toBe(1);
    expect(cart[1].quantity).toBe(1);
  });

  it("removeFromCart: debe decrementar quantity si > 1", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().removeFromCart("prod-1");
    const cart = useCartStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
  });

  it("removeFromCart: debe eliminar el item si quantity es 1", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().removeFromCart("prod-1");
    const cart = useCartStore.getState().cart;
    expect(cart).toHaveLength(0);
  });

  it("removeFromCart: no debe hacer nada si el producto no existe", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().removeFromCart("non-existent");
    const cart = useCartStore.getState().cart;
    expect(cart).toHaveLength(1);
  });

  it("updateItemHostesses: debe actualizar las anfitrionas seleccionadas", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().updateItemHostesses("prod-1", [1, 2]);
    const cart = useCartStore.getState().cart;
    expect(cart[0].selectedHostesses).toEqual([1, 2]);
  });

  it("updateItemHostesses: no debe afectar otros items", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().addToCart(mockChampagne as any);
    useCartStore.getState().updateItemHostesses("prod-1", [1]);
    const cart = useCartStore.getState().cart;
    expect(cart[1].selectedHostesses).toEqual([]);
    expect(cart[1].selectedHostesses).toEqual([]);
  });

  it("updateItemRoom: debe actualizar la habitacion seleccionada", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().updateItemRoom("prod-1", "room-vip");
    const cart = useCartStore.getState().cart;
    expect(cart[0].selectedRoom).toBe("room-vip");
  });

  it("updateItemRoom: debe permitir limpiar la habitacion (null)", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().updateItemRoom("prod-1", "room-vip");
    useCartStore.getState().updateItemRoom("prod-1", null);
    const cart = useCartStore.getState().cart;
    expect(cart[0].selectedRoom).toBeNull();
  });

  it("setTipEnabled: debe habilitar/deshabilitar la propina", () => {
    useCartStore.getState().setTipEnabled(true);
    expect(useCartStore.getState().tipEnabled).toBe(true);
    useCartStore.getState().setTipEnabled(false);
    expect(useCartStore.getState().tipEnabled).toBe(false);
  });

  it("clearCart: debe vaciar el carrito y deshabilitar tip", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().setTipEnabled(true);
    useCartStore.getState().clearCart();
    const state = useCartStore.getState();
    expect(state.cart).toEqual([]);
    expect(state.tipEnabled).toBe(false);
  });

  it("getSubtotal: debe calcular el subtotal correctamente", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().addToCart(mockChampagne as any);
    const subtotal = useCartStore.getState().getSubtotal();
    expect(subtotal).toBe(115000);
  });

  it("getSubtotal: carrito vacio debe dar 0", () => {
    expect(useCartStore.getState().getSubtotal()).toBe(0);
  });

  it("getTipAmount: debe dar 10% del subtotal si tipEnabled", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().setTipEnabled(true);
    const tip = useCartStore.getState().getTipAmount();
    expect(tip).toBe(1500);
  });

  it("getTipAmount: debe dar 0 si tipEnabled es false", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    const tip = useCartStore.getState().getTipAmount();
    expect(tip).toBe(0);
  });

  it("getTipAmount: debe usar el porcentaje configurado (setTipPercentage)", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().setTipEnabled(true);
    useCartStore.getState().setTipPercentage(15);
    const tip = useCartStore.getState().getTipAmount();
    expect(tip).toBe(2250);
  });

  it("getTotal: subtotal + tip si tipEnabled", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    useCartStore.getState().setTipEnabled(true);
    const total = useCartStore.getState().getTotal();
    expect(total).toBe(16500);
  });

  it("getTotal: solo subtotal si tipEnabled es false", () => {
    useCartStore.getState().addToCart(mockProduct as any);
    const total = useCartStore.getState().getTotal();
    expect(total).toBe(15000);
  });
});

it("preserva la soda y los ml en el pedido offline y exige seleccionarlos", () => {
  const corto = {
    ...mockProduct,
    id: "pres-1:shot_anfitriona:0",
    producto_id: "prod-1",
    presentacion_id: "pres-1",
    tipo_venta: "shot" as const,
    shot_anfitriona: true,
    commission: 1000,
    opciones_venta: [
      { tipo: "shot", precio: 20000, ml_acompanamiento_anfitriona: 100 },
    ],
  };
  useCartStore.setState({
    cart: [
      {
        product: corto,
        quantity: 2,
        selectedHostesses: [1],
        selectedRoom: null,
      },
    ],
    tipEnabled: false,
  });
  expect(
    useCartStore.getState().buildOrderPayload({ codigo: "ABC", meseroId: "u1" })
      .success,
  ).toBe(false);
  const mixer = {
    presentacion_id: "soda-1",
    ml_por_corto: 100,
    nombre: "Soda",
  };
  useCartStore.setState({
    cart: [
      {
        product: { ...corto, acompanamiento_corto: mixer },
        quantity: 2,
        selectedHostesses: [1],
        selectedRoom: null,
      },
    ],
  });
  const payload = useCartStore
    .getState()
    .buildOrderPayload({ codigo: "ABC", meseroId: "u1" });
  expect(payload.success).toBe(true);
  if (!payload.success) throw new Error(payload.errors.join(", "));
  expect(payload.data.detalles[0]).toMatchObject({
    productoId: "prod-1",
    presentacion_id: "pres-1",
    tipo_venta: "shot",
    acompanamiento_corto: mixer,
    comision: 2000,
  });
});

it("applies configured bottle prices and commission for the selected hostess count", async () => {
  useCartStore.setState({ cart: [] });
  useCartStore
    .getState()
    .addToCart({
      ...mockProduct,
      presentacion_id: "bottle",
      producto_id: "vodka",
      opciones_venta: [{ tipo: "botella", precio: 20000, comision: 7000 }],
    });
  vi.mocked(apiClientSafe).mockResolvedValueOnce({
    success: true,
    data: [{ anfitrionas: 2, precio: 30000, comision: 12000 }],
  } as any);
  await useCartStore.getState().updateItemHostesses("prod-1", [1, 2]);
  expect(useCartStore.getState().cart[0].product.price).toBe(30000);
  expect(useCartStore.getState().cart[0].product.commission).toBe(12000);
  await useCartStore.getState().updateItemHostesses("prod-1", []);
  expect(useCartStore.getState().cart[0].product.price).toBe(20000);
});

describe("Pedidos de cortos por anfitriona", () => {
  const short = {
    ...mockProduct,
    producto_id: "vodka",
    presentacion_id: "vodka-750",
    tipo_venta: "shot" as const,
    shot_anfitriona: true,
    commission: 3000,
    opciones_venta: [
      { tipo: "shot", precio: 20000, ml_acompanamiento_anfitriona: 150 },
    ],
  };
  const ids = [
    "a9df26ba-849d-47da-9331-069281791a71",
    "fa4d0931-fc78-40eb-ae7e-723679f735df",
  ];
  beforeEach(() => useCartStore.setState({ cart: [], tipEnabled: false }));
  it("conserva los UUID y limita la selección a una anfitriona por unidad", async () => {
    useCartStore.getState().addToCart(short);
    useCartStore.getState().addToCart(short);
    await useCartStore
      .getState()
      .updateItemHostesses(short.id, [...ids, "extra"]);
    expect(useCartStore.getState().cart[0].selectedHostesses).toEqual(ids);
    useCartStore.getState().removeFromCart(short.id);
    expect(useCartStore.getState().cart[0].selectedHostesses).toEqual([ids[0]]);
  });
  it("envía ml dla bebida y la comisión total para dos cortos", async () => {
    useCartStore.getState().addToCart(short);
    useCartStore.getState().addToCart(short);
    await useCartStore.getState().updateItemHostesses(short.id, ids);
    useCartStore
      .getState()
      .updateItemMixer(short.id, {
        presentacion_id: "sprite",
        ml_por_corto: 150,
        nombre: "Sprite",
        foto: "sprite.png",
      });
    const result = useCartStore
      .getState()
      .buildOrderPayload({ meseroId: "garzon", codigo: "PEDIDO" });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(result.errors.join(";"));
    expect(result.data.detalles[0]).toMatchObject({
      selectedHostesses: ids,
      cantidad: 2,
      comision: 6000,
      acompanamiento_corto: { presentacion_id: "sprite", ml_por_corto: 150 },
    });
    expect(result.data.usuarios.map((user) => user.usuarioId)).toEqual(ids);
  });
  it("usa el número de bebidas configurado por botella", () => {
    const bottle = {
      ...mockProduct,
      tipo_venta: "botella" as const,
      opciones_venta: [{ tipo: "botella", acompanamiento: { unidades: 4 } }],
    };
    useCartStore.getState().addToCart(bottle);
    useCartStore
      .getState()
      .updateItemMixer(bottle.id, {
        presentacion_id: "sprite",
        unidades: 1,
        nombre: "Sprite",
      });
    expect(
      useCartStore.getState().cart[0].product.acompanamiento_botella,
    ).toMatchObject({ unidades: 4 });
  });
});
