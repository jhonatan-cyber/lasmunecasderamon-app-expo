import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClientSafe } from "@/api/client";
import { useCartStore } from "@/store/cartStore";
import { OrderCreateSchema } from "@lasmunecasderamon/validations";

// Vitest hoistea `vi.mock` por encima de los imports: el store recibe el mock.
vi.mock("@/api/client", () => ({ apiClientSafe: vi.fn() }));

/**
 * Contrato del pedido entre la app y el dashboard.
 *
 * El servidor valida `POST /api/orders` con
 * `lasmunecasderamon-dashboard/lib/business/schemas/order.ts` → `OrderCreateSchema`.
 * Un payload que no lo cumpla recibe 400: `withRoute` lo traduce a "Error de
 * validación de datos" y el outbox archiva la intención como `fallida` (un 4xx no
 * se reintenta), así que el pedido se pierde para la operación.
 *
 * El servidor y la app mantienen dos copias del esquema (repos distintos), y por
 * eso se desincronizaron: el dashboard pasó a exigir `metodoPago` y la app siguió
 * enviando el pedido sin él. Estas aserciones fijan del lado del cliente los
 * campos que el dashboard exige; el lado servidor está fijado en
 * `lasmunecasderamon-dashboard/tests/unit/modules/pedido-cerrado.test.ts`
 * ("rechaza datos incompletos…" incluye `metodoPago: undefined`).
 */

/** Campos de primer nivel que `OrderCreateSchema` del dashboard exige. */
const CAMPOS_EXIGIDOS_POR_EL_DASHBOARD = [
  "codigo",
  "meseroId",
  "subtotal",
  "total",
  "metodoPago",
  "detalles",
] as const;

/** `metodo_pago` del pedido: el dashboard solo acepta estos tres. */
const METODOS_DE_PAGO_DEL_PEDIDO = ["efectivo", "tarjeta", "transferencia"] as const;

const hostessId = "a9df26ba-849d-47da-9331-069281791a71";

const botella = {
  id: "prod-1",
  code: "P-001",
  name: "Vodka Absolut",
  category_id: "cat-1",
  producto_id: "prod-1",
  presentacion_id: "vodka-750",
  price: 20000,
  commission: 3000,
  description: "Botella 750 ml",
  status: 1,
  foto: "absolut.png",
  categoria: "Bebidas",
  stock_bar: 10,
  tipo_venta: "botella" as const,
};

async function armarCarrito() {
  vi.mocked(apiClientSafe).mockResolvedValue({
    success: true,
    // Con una anfitriona el precio y la comisión no cambian: así la aserción de
    // importes habla del contrato y no de la tabla de tramos.
    data: [{ anfitrionas: 1, precio: 20000, comision: 3000 }],
  } as never);
  useCartStore.setState({ cart: [], tipEnabled: false, tipPercentage: 10 });
  useCartStore.getState().addToCart(botella);
  useCartStore.getState().addToCart(botella);
  await useCartStore.getState().updateItemHostesses(botella.id, [hostessId]);
  useCartStore.getState().setTipEnabled(true);
}

function construir(metodoPago?: (typeof METODOS_DE_PAGO_DEL_PEDIDO)[number]) {
  const result = useCartStore
    .getState()
    .buildOrderPayload({ meseroId: "u-garzon", codigo: "PEDIDO01", metodoPago });
  if (!result.success) throw new Error(result.errors.join("; "));
  return result.data;
}

/** Mismo payload, pero pagado con transferencia y con la foto del baucher adjunta. */
function construirConBaucher() {
  const result = useCartStore.getState().buildOrderPayload({
    meseroId: "u-garzon",
    codigo: "PEDIDO01",
    metodoPago: "transferencia",
    baucherFoto: "data:image/jpeg;base64,SG9sYQ==",
  });
  if (!result.success) throw new Error(result.errors.join("; "));
  return result.data;
}

describe("contrato del payload de pedido con el dashboard", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await armarCarrito();
  });

  it("incluye todos los campos que exige el servidor", () => {
    const payload = construir();
    for (const campo of CAMPOS_EXIGIDOS_POR_EL_DASHBOARD) {
      expect(payload, `falta ${campo}`).toHaveProperty(campo);
    }
  });

  it("envía el método de pago y por defecto es efectivo", () => {
    expect(construir().metodoPago).toBe("efectivo");
  });

  it("acepta los tres métodos que admite el dashboard", () => {
    for (const metodo of METODOS_DE_PAGO_DEL_PEDIDO) {
      // Transferencia solo se arma con el baucher adjunta (nueva regla).
      const payload =
        metodo === "transferencia" ? construirConBaucher() : construir(metodo);
      expect(payload.metodoPago).toBe(metodo);
    }
  });

  it("pasa el esquema que valida el payload en el dispositivo", () => {
    const payload = construir("tarjeta");
    const parsed = OrderCreateSchema.safeParse(payload);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("rechaza un pedido sin método de pago, igual que el servidor", () => {
    const { metodoPago: _omitido, ...sinMetodo } = construir();
    expect(OrderCreateSchema.safeParse(sinMetodo).success).toBe(false);
  });

  it("exige la foto del baucher cuando el pago es transferencia", () => {
    // El carrito ni siquiera arma el payload: la app no deja enviar sin foto.
    const sinFoto = useCartStore.getState().buildOrderPayload({
      meseroId: "u-garzon",
      codigo: "PEDIDO01",
      metodoPago: "transferencia",
    });
    expect(sinFoto.success).toBe(false);

    // Y el esquema del dispositivo rechaza igual un payload armado a mano.
    const { metodoPago: _metodo, ...base } = construir();
    const payload = { ...base, metodoPago: "transferencia" };
    const parsed = OrderCreateSchema.safeParse(payload);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(false);
    expect(
      parsed.success === false &&
        parsed.error.issues.some((issue: any) => issue.path.includes("baucher_foto"))
    ).toBe(true);
  });

  it("acepta transferencia cuando la foto del baucher viene como data URL", () => {
    const payload = construirConBaucher();
    const parsed = OrderCreateSchema.safeParse(payload);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(payload.baucher_foto).toBe("data:image/jpeg;base64,SG9sYQ==");
  });

  it("rechaza una foto del baucher que no sea una imagen en base64", () => {
    const payload = {
      ...construirConBaucher(),
      baucher_foto: "https://cdn.example.com/baucher.jpg",
    };
    expect(OrderCreateSchema.safeParse(payload).success).toBe(false);
  });

  it("rechaza una foto del baucher en un formato que no está admitido", () => {
    const payload = {
      ...construirConBaucher(),
      baucher_foto: "data:application/pdf;base64,SG9sYQ==",
    };
    expect(OrderCreateSchema.safeParse(payload).success).toBe(false);
  });

  it("rechaza una foto del baucher que supere el tope de 3 MB", () => {
    const payload = {
      ...construirConBaucher(),
      baucher_foto: `data:image/jpeg;base64,${"A".repeat(4_000_001)}`,
    };
    const parsed = OrderCreateSchema.safeParse(payload);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(false);
    expect(
      parsed.success === false &&
        parsed.error.issues.some((issue: any) => issue.message.includes("tamaño máximo"))
    ).toBe(true);
  });

  it.each(["prepago", "mixto"])(
    "rechaza %s: el pedido solo se guarda con un método concreto",
    metodo => {
      const payload = { ...construir(), metodoPago: metodo };
      expect(OrderCreateSchema.safeParse(payload).success).toBe(false);
    }
  );

  it("mantiene las invariantes de importes y comisiones del servidor", () => {
    const payload = construir();
    const subtotalDetalles = payload.detalles.reduce(
      (sum, detalle) => sum + detalle.subtotal,
      0
    );

    expect(payload.subtotal).toBe(subtotalDetalles);
    expect(payload.total).toBe(payload.subtotal + payload.propina);
    for (const detalle of payload.detalles) {
      expect(detalle.subtotal).toBe(detalle.precio * detalle.cantidad);
      // El dashboard rechaza comisión sin anfitrionas (y viceversa).
      if (detalle.comision > 0) {
        expect(detalle.selectedHostesses.length).toBeGreaterThan(0);
        expect(detalle.generaComision).toBe(1);
      } else {
        expect(detalle.selectedHostesses).toHaveLength(0);
      }
    }
    expect(payload.usuarios.map(usuario => usuario.usuarioId)).toContain(hostessId);
  });
});
