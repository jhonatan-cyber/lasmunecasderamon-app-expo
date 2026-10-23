/** Each short has its own mixer and hostess assignment. */
export function individualShorts<
  T extends {
    tipo_venta?: string;
    quantity: number;
    anfitrionas?: (string | number)[];
  },
>(items: T[]): T[] {
  return items.flatMap((item) =>
    item.tipo_venta === "shot" && item.quantity > 1
      ? Array.from({ length: item.quantity }, (_, index) => ({
          ...item,
          quantity: 1,
          cantidad: 1,
          anfitrionas:
            item.anfitrionas?.[index] === undefined
              ? []
              : [item.anfitrionas[index]],
        }))
      : [item],
  );
}
