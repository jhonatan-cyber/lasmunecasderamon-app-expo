import { describe, expect, it } from "vitest";

import {
  esHabitacionSoloVentas,
  habitacionesParaServicio,
} from "@/utils/habitaciones";

describe("habitaciones para servicio", () => {
  it("una habitación sin precio, comisión ni duración es solo ventas", () => {
    expect(
      esHabitacionSoloVentas({ precio: 0, comision_anfitriona: 0, tiempo: 0 }),
    ).toBe(true);
    expect(esHabitacionSoloVentas({ price: 0, comision_anfitriona: 0, time: 0 })).toBe(
      true,
    );
  });

  it("con comisión configurada ya sirve para servicios aunque no tenga precio", () => {
    expect(
      esHabitacionSoloVentas({ precio: 0, comision_anfitriona: 15000, tiempo: 0 }),
    ).toBe(false);
  });

  it("la lista conserva ocupadas e inactivas y descarta solo las de ventas", () => {
    const rooms = [
      { id: 1, name: "Suite", price: 50000, time: 60, status: 1 },
      { id: 2, name: "Ocupada", price: 50000, time: 60, status: 2 },
      { id: 3, name: "Inactiva", price: 50000, time: 60, status: 0 },
      { id: 4, name: "Solo ventas", price: 0, time: 0, status: 1 },
    ];

    expect(habitacionesParaServicio(rooms).map((room) => room.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it("acepta la forma cruda de la base (nombre/precio/tiempo)", () => {
    expect(
      habitacionesParaServicio([
        { id_habitacion: "a", nombre: "Privado", precio: 80000, tiempo: 60 },
        { id_habitacion: "b", nombre: "Barra", precio: 0, tiempo: 0 },
      ]).map((room) => room.nombre),
    ).toEqual(["Privado"]);
  });
});