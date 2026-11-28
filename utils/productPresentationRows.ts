import type { ProductPresentationGroup } from "@/utils/productPresentationGroups";

export function groupProductPresentationRows(
  groups: ProductPresentationGroup[],
  columns: number,
): ProductPresentationGroup[][] {
  const rowLimit = Math.max(1, Math.floor(columns));
  const rows: ProductPresentationGroup[][] = [];
  let currentRow: ProductPresentationGroup[] = [];

  for (const group of groups) {
    if (group.variants.length > 1) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }
      rows.push([group]);
      continue;
    }

    currentRow.push(group);
    if (currentRow.length === rowLimit) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  if (currentRow.length > 0) rows.push(currentRow);

  return rows;
}