/** Campos de búsqueda comunes a productos y presentaciones. */
export function matchesProductSearch(product: any, term: string): boolean {
  const normalize = (value: unknown) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const fields = [
    "name",
    "nombre",
    "producto_nombre",
    "categoria",
    "categoria_nombre",
    "category_name",
    "presentacion",
    "presentacion_nombre",
    "codigo_barras",
    "barcode",
    "code",
    "codigo",
    "producto_codigo",
    "search_text",
  ];
  const values = fields.map((field) => product?.[field]);
  for (const presentation of product?.presentaciones ??
    product?.presentations ??
    []) {
    values.push(
      presentation.nombre,
      presentation.name,
      presentation.codigo_barras,
    );
  }
  return normalize(values.join(" ")).includes(normalize(term).trim());
}
