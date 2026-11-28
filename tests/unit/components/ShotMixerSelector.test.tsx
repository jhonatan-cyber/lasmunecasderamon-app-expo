import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShotMixerSelector } from "@/components/shared/ShotMixerSelector";
import type { AcompanamientoBotella } from "@/types/cart";

vi.mock("react-native", () => ({
  ActivityIndicator: () => null,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    disabled,
  }: any) => (
    <button
      type="button"
      role={accessibilityRole || "button"}
      aria-label={accessibilityLabel}
      onClick={onPress}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
}));
vi.mock("@expo/vector-icons/Ionicons", () => ({ default: () => null }));
vi.mock("@/api/client", () => ({
  apiClientSafe: vi.fn(async () => ({ success: true, data: [] })),
}));
vi.mock("@/services/mirror", () => ({
  getMirror: () => ({
    readThroughDetailed: async (_key: string, fetcher: () => Promise<unknown>) => ({
      data: await fetcher(),
    }),
  }),
  MIRROR_MAX_AGE_MS: { catalogo: 60_000 },
}));
vi.mock("@/hooks/useAccentColor", () => ({
  useAccentColor: () => ({
    accentBg: "#eee",
    accentColor: "#933",
    borderColor: "#ddd",
    cardBg: "#fff",
    textPrimary: "#111",
    textSecondary: "#555",
  }),
}));
vi.mock("@/hooks/useConfigValue", () => ({
  useConfigValue: () => "0",
}));
vi.mock("@/components/shared/OrderProductPhoto", () => ({
  OrderProductPhoto: () => null,
}));
vi.mock("@/components/shared/MixerSelectorModal", () => ({
  MixerSelectorModal: () => null,
}));

afterEach(cleanup);

const bottle = (acompanamiento_botella: AcompanamientoBotella) => ({
  nombre: "Botella A",
  cantidad: 1,
  tipo_venta: "botella",
  unidades_acompanamiento: 1,
  acompanamiento_botella,
});

describe("ShotMixerSelector acompañamientos de botella", () => {
  it("oculta agregar al completar el cupo y mantiene la acción para quitar", async () => {
    const onChangeBottle = vi.fn();
    render(
      <ShotMixerSelector
        bottle
        items={[
          bottle([
            { presentacion_id: "soda", unidades: 1, nombre: "Soda" },
          ]),
        ]}
        onChangeBottle={onChangeBottle}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Agregar sabor para Botella A" }),
    ).toBeNull();
    expect(screen.getByText("Soda")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Quitar Soda" }));

    expect(onChangeBottle).toHaveBeenCalledWith(0, []);
  });

  it("muestra agregar cuando todavía faltan acompañamientos", () => {
    render(
      <ShotMixerSelector
        bottle
        compact
        label="Bebida de acompañamiento"
        items={[bottle([])]}
        onChangeBottle={vi.fn()}
      />,
    );

    expect(screen.getByText("Bebida de acompañamiento")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Agregar sabor para Botella A" }),
    ).toBeTruthy();
  });
});