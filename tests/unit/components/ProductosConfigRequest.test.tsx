import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/types/cart";
import { useCartStore } from "@/store/cartStore";
import ProductosScreen from "@/app/(app)/garzon/productos";

const { router, routeParams, hookResult } = vi.hoisted(() => ({
  router: { back: vi.fn(), navigate: vi.fn(), setParams: vi.fn() },
  routeParams: {
    configureProductId: "bottle-a",
    configureType: "hostess",
    search: undefined as string | undefined,
  },
  hookResult: {} as Record<string, any>,
}));

vi.mock("expo-router", () => ({
  useRouter: () => router,
  useLocalSearchParams: () => routeParams,
}));
vi.mock("react-native", () => ({
  ActivityIndicator: () => null,
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
  RefreshControl: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@expo/vector-icons/Ionicons", () => ({ default: () => null }));
vi.mock("@/hooks/useCartDraft", () => ({ useCartDraft: () => undefined }));
vi.mock("@/hooks/useAccentColor", () => ({
  useAccentColor: () => ({
    accentColor: "#123",
    accentOnSurface: "#123",
    bg: "#fff",
    cardBg: "#fff",
    borderColor: "#ddd",
    textPrimary: "#111",
    textSecondary: "#555",
  }),
}));
vi.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({ isTablet: false, isLandscape: false }),
}));
vi.mock("@/hooks/useGarzonProductos", () => ({
  useGarzonProductos: () => hookResult,
}));
vi.mock("@/components/shared/VirtualizedList", () => ({
  default: () => null,
}));
vi.mock("@/components/shared/ProductCard", () => ({ ProductCard: () => null }));
vi.mock("@/components/ui/PremiumHeader", () => ({ PremiumHeader: () => null }));
vi.mock("@/components/ui/PremiumAlert", () => ({ PremiumAlert: () => null }));
vi.mock("@/components/ui/EmptyState", () => ({ EmptyState: () => null }));
vi.mock("@/components/ui/SearchBar", () => ({
  SearchBar: ({ value, accessibilityLabel }: any) => (
    <input aria-label={accessibilityLabel} value={value} readOnly />
  ),
}));
vi.mock("@/components/shared/EmployeeListError", () => ({
  EmployeeListError: () => null,
}));
vi.mock("@/components/garzon/GarzonOfflineBanner", () => ({
  GarzonOfflineBanner: () => null,
}));
vi.mock("@/components/garzon/productos", () => ({
  GarzonCartBar: () => null,
  GarzonProductosModales: () => null,
}));
vi.mock("@/components/garzon/productos/GarzonProductConfigModal", () => ({
  GarzonProductConfigModal: ({
    visible,
    productId,
    type,
    onClose,
  }: {
    visible: boolean;
    productId: string;
    type: string;
    onClose: () => void;
  }) =>
    visible ? (
      <div data-testid="config-modal" data-product-id={productId} data-type={type}>
        <button type="button" onClick={onClose}>Cerrar selección</button>
      </div>
    ) : null,
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

describe("ProductosScreen solicitud de configuración", () => {
  beforeEach(() => {
    routeParams.configureProductId = "bottle-a";
    routeParams.configureType = "hostess";
    routeParams.search = undefined;
    router.setParams.mockReset();
    useCartStore.setState({ cart: [item], tipEnabled: false });
    Object.assign(hookResult, {
      categoryName: "Licores",
      products: [],
      anfitrionas: [],
      rooms: [],
      clients: [],
      selectedClientId: null,
      setSelectedClientId: vi.fn(),
      metodoPago: "efectivo",
      setMetodoPago: vi.fn(),
      baucherFoto: null,
      baucherPromptVisible: false,
      setBaucherPromptVisible: vi.fn(),
      takeBaucherPhoto: vi.fn(),
      loading: false,
      refreshing: false,
      error: "",
      submitting: false,
      fromCache: false,
      clientModalVisible: false,
      setClientModalVisible: vi.fn(),
      clearCartAlertVisible: false,
      setClearCartAlertVisible: vi.fn(),
      activeConfigItem: null,
      setActiveConfigItem: vi.fn(),
      cart: [item],
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      tipEnabled: false,
      setTipEnabled: vi.fn(),
      clearCart: vi.fn(),
      tipAmount: 0,
      cartTotal: 10000,
      propinaPct: 10,
      onRefresh: vi.fn(),
      submitOrder: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it("abre el selector global para el producto solicitado y limpia los parámetros al cerrar", () => {
    render(<ProductosScreen />);

    const modal = screen.getByTestId("config-modal");
    expect(modal.getAttribute("data-product-id")).toBe("bottle-a");
    expect(modal.getAttribute("data-type")).toBe("hostess");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar selección" }));
    expect(router.setParams).toHaveBeenCalledWith({
      configureProductId: undefined,
      configureType: undefined,
    });
  });

  it("permite asociar un cliente desde el catálogo de productos", () => {
    render(<ProductosScreen />);

    fireEvent.click(
      screen.getByRole("button", { name: "Asociar cliente al pedido (opcional)" }),
    );

    expect(hookResult.setClientModalVisible).toHaveBeenCalledWith(true);
  });

  it("muestra el nombre del cliente asociado en el acceso al selector", () => {
    hookResult.clients = [{ id: "client-a", name: "Ana", lastName: "Pérez" }];
    hookResult.selectedClientId = "client-a";

    render(<ProductosScreen />);

    expect(
      screen.getByRole("button", { name: "Cambiar cliente asociado: Ana Pérez" }),
    ).toBeTruthy();
  });

  it("aplica en el catálogo el término recibido desde la búsqueda global", () => {
    routeParams.search = "Corona";

    render(<ProductosScreen />);

    expect(screen.getByRole("textbox", { name: "Buscar productos" }).getAttribute("value")).toBe("Corona");
  });
});