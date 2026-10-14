import { expect, it } from "vitest";
import { individualShorts } from "@/hooks/utils/individualShorts";
it("separa cortos conservando precio, bebida y una anfitriona por unidad", () => {
  const result = individualShorts([
    {
      tipo_venta: "shot",
      quantity: 2,
      precio: 10000,
      acompanamiento_corto: { ml_por_corto: 150 },
      anfitrionas: ["lola", "sami"],
    },
  ]);
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({
    quantity: 1,
    precio: 10000,
    anfitrionas: ["lola"],
    acompanamiento_corto: { ml_por_corto: 150 },
  });
  expect(result[1].anfitrionas).toEqual(["sami"]);
  expect(
    individualShorts([{ tipo_venta: "botella", quantity: 2 }])[0].quantity,
  ).toBe(2);
});
