import { describe, expect, it } from "vitest";
import {
  calcularComisionServicio,
  calcularTotalesServicio,
  contarUsuariosServicio,
} from "@/utils/servicioTotales";

const base = {
  precioServicioUnidad: 20000,
  precioHabitacion: 50000,
  tiempoHabitacion: 30,
  cantidadAnfitrionas: 1,
  cantidadClientes: 0,
  comisionHabitacion: 0,
  metodoPago: "efectivo" as const,
  ivaDecimal: 0.19,
};

describe("calcularTotalesServicio · cobro directo (caja)", () => {
  it("multiplica servicio y habitación por la cantidad de anfitrionas", () => {
    const totales = calcularTotalesServicio({
      ...base,
      cantidadAnfitrionas: 2,
      cantidadClientes: 1,
    });

    expect(totales.precioServicio).toBe(40000);
    expect(totales.precioHabitacion).toBe(100000);
    expect(totales.iva).toBe(0);
    expect(totales.total).toBe(140000);
  });

  it("duplica la tarifa en habitaciones de 60 minutos", () => {
    const totales = calcularTotalesServicio({
      ...base,
      tiempoHabitacion: 60,
    });

    expect(totales.precioServicio).toBe(40000);
    expect(totales.precioHabitacion).toBe(100000);
    expect(totales.total).toBe(140000);
  });

  it("con tarjeta suma IVA sobre el servicio y redondea el total a 5000", () => {
    const totales = calcularTotalesServicio({
      ...base,
      precioHabitacion: 30000,
      metodoPago: "tarjeta",
    });

    // 20000 + 30000 + 3800 = 53800 -> 55000, la diferencia se registra como IVA.
    expect(totales.iva).toBe(5000);
    expect(totales.total).toBe(55000);
  });

  it("con habitación con comisión la habitación no se multiplica por personas", () => {
    const totales = calcularTotalesServicio({
      ...base,
      cantidadAnfitrionas: 2,
      cantidadClientes: 3,
      comisionHabitacion: 30000,
    });

    expect(totales.precioServicio).toBe(40000);
    expect(totales.precioHabitacion).toBe(50000);
    expect(totales.total).toBe(90000);
    expect(totales.comisionPorAnfitriona).toBe(15000);
  });

  it("con comisión y tarjeta también redondea el total", () => {
    const totales = calcularTotalesServicio({
      ...base,
      cantidadAnfitrionas: 2,
      comisionHabitacion: 30000,
      metodoPago: "tarjeta",
    });

    // 40000 + 50000 + 7600 = 97600 -> 100000.
    expect(totales.total).toBe(100000);
    expect(totales.iva).toBe(10000);
  });
});

describe("calcularTotalesServicio · solicitud (garzón/barman)", () => {
  it("no aplica el multiplicador de 60 minutos", () => {
    const totales = calcularTotalesServicio({
      ...base,
      tiempoHabitacion: 60,
      politica: "solicitud",
    });

    expect(totales.precioServicio).toBe(20000);
    expect(totales.precioHabitacion).toBe(50000);
    expect(totales.total).toBe(70000);
  });

  it("sin comisión cobra servicio y habitación por persona atendida", () => {
    const totales = calcularTotalesServicio({
      ...base,
      cantidadAnfitrionas: 1,
      cantidadClientes: 3,
      politica: "solicitud",
    });

    // El mayor entre anfitrionas (1) y clientes (3) manda en ambos precios.
    expect(totales.precioServicio).toBe(60000);
    expect(totales.precioHabitacion).toBe(150000);
    expect(totales.total).toBe(210000);
  });

  it("con tarjeta y sin comisión redondea el total", () => {
    const totales = calcularTotalesServicio({
      ...base,
      precioHabitacion: 30000,
      metodoPago: "tarjeta",
      politica: "solicitud",
    });

    expect(totales.iva).toBe(5000);
    expect(totales.total).toBe(55000);
  });

  it("con comisión y tarjeta no redondea el total", () => {
    const totales = calcularTotalesServicio({
      ...base,
      cantidadAnfitrionas: 2,
      comisionHabitacion: 30000,
      metodoPago: "tarjeta",
      politica: "solicitud",
    });

    // 40000 + 50000 + 7600, sin redondeo.
    expect(totales.iva).toBe(7600);
    expect(totales.total).toBe(97600);
  });
});

describe("calcularComisionServicio", () => {
  it("divide la comisión de habitación entre las anfitrionas", () => {
    expect(
      calcularComisionServicio({
        habitacionComision: 30000,
        precioServicioUnidad: 20000,
        totalUsuarios: 2,
      }),
    ).toEqual({ comisionIndividual: 15000, totalComision: 30000 });
  });

  it("sin comisión de habitación usa la comisión individual del servidor", () => {
    expect(
      calcularComisionServicio({
        habitacionComision: 0,
        comisionIndividual: 10000,
        precioServicioUnidad: 20000,
        totalUsuarios: 3,
      }),
    ).toEqual({ comisionIndividual: 10000, totalComision: 30000 });
  });

  it("sin comisión del servidor cae al precio de servicio unitario", () => {
    expect(
      calcularComisionServicio({
        habitacionComision: 0,
        precioServicioUnidad: 20000,
        totalUsuarios: 2,
      }),
    ).toEqual({ comisionIndividual: 20000, totalComision: 40000 });
  });
});

describe("contarUsuariosServicio", () => {
  it("toma el mayor entre total del servidor, ids y nombres", () => {
    expect(
      contarUsuariosServicio({
        totalUsuarios: 1,
        anfitrionasIds: ["a", "b"],
        anfitrionasNombres: ["Ana", "Bea", "Carla"],
      }),
    ).toBe(3);
  });

  it("nunca baja de 1", () => {
    expect(contarUsuariosServicio({ totalUsuarios: 0 })).toBe(1);
  });
});
