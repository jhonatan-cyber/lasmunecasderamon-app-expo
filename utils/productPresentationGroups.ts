import type { Product } from "@/types/cart";

export interface ProductPresentationGroup {
  key: string;
  variants: Product[];
}

export function groupProductsByPresentation(
  products: Product[],
): ProductPresentationGroup[] {
  const groups = new Map<string, ProductPresentationGroup>();

  for (const product of products) {
    const presentationId = String(product.presentacion_id ?? "");
    const key = presentationId
      ? `${product.producto_id ?? ""}:${presentationId}`
      : String(product.id);
    const group = groups.get(key);

    if (group) {
      group.variants.push(product);
    } else {
      groups.set(key, { key, variants: [product] });
    }
  }

  return Array.from(groups.values());
}