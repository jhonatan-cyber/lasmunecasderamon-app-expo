/** Validate personal-list responses and normalize database numeric strings. */
export function normalizeEmployeeRecords<T>(
  value: unknown,
  numericFields: readonly string[],
): T[] {
  if (!Array.isArray(value))
    throw new Error('La respuesta del listado no es válida');
  return value.map((row) => {
    if (!row || typeof row !== 'object')
      throw new Error('El registro no es válido');
    const result = { ...row };
    for (const field of numericFields) {
      if (!(field in result)) continue;
      const number = Number(result[field] ?? 0);
      if (!Number.isFinite(number))
        throw new Error('El importe o estado no es válido');
      result[field] = number;
    }
    return result as T;
  });
}
