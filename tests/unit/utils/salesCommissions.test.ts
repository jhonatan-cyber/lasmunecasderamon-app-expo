import { describe, expect, it } from "vitest";
import { sumSalesCommissions } from "@/utils/salesCommissions";

describe("sumSalesCommissions", () => {
  it("suma comisiones de ventas, excluye anuladas y otros tipos", () => {
    const records = [
      { tipo: "venta", estado: 1, comision: 1200 },
      { tipo: "venta", estado: 2, monto: 800 },
      { tipo: "venta", estado: 0, comision: 500 },
      { tipo: "servicio", estado: 2, comision: 3000 },
    ];

    expect(sumSalesCommissions(records)).toBe(2000);
  });

  it("devuelve cero cuando no hay comisiones", () => {
    expect(sumSalesCommissions([])).toBe(0);
  });
});