import { showToast as showToastLazy } from '@/utils/toast-lazy';
import type { Cliente, Anfitriona, Producto, CartItem, CommissionPreview } from "@lasmunecasderamon/types";

export const showToast = (title: string, message: string, type: "success" | "error" | "info" = "error") => {
  showToastLazy({
    type,
    text1: title,
    text2: message,
    visibilityTime: 4000,
  });
};

const getChampagneTierLimit = (precio: number) => {
  if (precio >= 240000) return 5;
  if (precio >= 200000) return 4;
  if (precio >= 140000) return 3;
  if (precio >= 120000) return 2;
  return 1;
};

export let ivaRate = 0.19;

export const setIvaRate = (rate: number) => { ivaRate = rate; };

export const getIvaDecimal = () => ivaRate;

export const getIvaPercent = () => Math.round(ivaRate * 100);

export let expensiveDrinkThreshold = 30000;

export const setExpensiveDrinkThreshold = (v: number) => { expensiveDrinkThreshold = v; };

export const isExpensiveDrink = (producto: { precio?: number; price?: number }) => {
  const precio = Number(producto.precio || producto.price || 0);
  return precio >= expensiveDrinkThreshold;
};

export let cardSplitVenta = 0.51;
export let cardSplitPropina = 0.49;

const roundToThousand = (monto: number) => Math.round(monto / 1000) * 1000;

export const setCardSplit = (ventaPct: number, propinaPct: number) => {
  cardSplitVenta = ventaPct;
  cardSplitPropina = propinaPct;
};

export const getCardSplit = (total: number) => {
  const venta = roundToThousand(total * cardSplitVenta);
  const propina = roundToThousand(Math.max(0, total * cardSplitPropina));
  return { venta, propina };
};

export const isChampagneProduct = (producto: { categoria?: string }) => {
  const cat = (producto.categoria || "").toLowerCase();
  return cat.includes("champaña") || cat.includes("shampaña") || cat.includes("champagne");
};

export const getHostessLimit = (prod: { precio?: number; price?: number; max_anfitrionas?: number | null; categoria?: string }, qty: number = 1) => {
  const max = prod.max_anfitrionas;
  if (max !== null && max !== undefined && max > 0) return max * qty;
  const price = prod.precio ?? prod.price ?? 0;
  if (isChampagneProduct(prod)) {
    return getChampagneTierLimit(price) * qty;
  }
  return qty;
};

export const buildCommissionPreview = (items: CartItem[], hostesses: Anfitriona[]): CommissionPreview => {
  const totalCommission = items.reduce(
    (acc, item) => acc + Number(item.comision || 0) * Number(item.cantidad || 0),
    0,
  );
  const distribution = new Map<string, { id: string; name: string; amount: number }>();

  const addAmount = (hostessId: string | number, amount: number) => {
    if (!hostessId || amount <= 0) return;
    const key = String(hostessId);
    const hostess = hostesses.find((item) => String(item.id_usuario || item.id) === key);
    const current = distribution.get(key);
    distribution.set(key, {
      id: key,
      name: hostess?.nick || `Anfitriona ${key}`,
      amount: (current?.amount || 0) + amount,
    });
  };

  items.forEach((item) => {
    const selectedHostesses = Array.isArray(item.selectedHostesses)
      ? item.selectedHostesses.filter(Boolean)
      : [];
    const itemCommission = Number(item.comision || 0) * Number(item.cantidad || 0);

    if (itemCommission <= 0 || selectedHostesses.length === 0) return;

    if (item.isChampagne) {
      const totalRounded = Math.round(itemCommission);
      const base = Math.floor(totalRounded / selectedHostesses.length);
      const remainder = totalRounded % selectedHostesses.length;

      selectedHostesses.forEach((hostessId, index) => {
        addAmount(hostessId, base + (index === 0 ? remainder : 0));
      });
      return;
    }

    selectedHostesses.forEach((hostessId) => {
      addAmount(hostessId, itemCommission);
    });
  });

  return {
    totalCommission,
    assignedCommission: Array.from(distribution.values()).reduce((acc, item) => acc + item.amount, 0),
    hostessDistribution: Array.from(distribution.values()).sort((a, b) => b.amount - a.amount),
  };
};
