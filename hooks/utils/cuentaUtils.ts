import Toast from "react-native-toast-message";

export const showToast = (title: string, message: string, type: "success" | "error" | "info" = "error") => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: 4000,
  });
};

export const isChampagneProduct = (producto: any) => {
  const cat = (producto.categoria || "").toLowerCase();
  return cat.includes("champaña") || cat.includes("shampaña") || cat.includes("champagne");
};

export const getChampagneLimit = (precio: number) => {
  if (precio >= 240000) return 5;
  if (precio >= 200000) return 4;
  if (precio >= 160000) return 3;
  if (precio >= 120000) return 2;
  return 1;
};

export const getHostessLimit = (prod: any, qty: number) => {
  const price = prod.precio ?? prod.price ?? 0;
  if (isChampagneProduct(prod)) {
    return getChampagneLimit(price) * qty;
  }
  return qty;
};

export const buildCommissionPreview = (items: any[], hostesses: any[]) => {
  const totalCommission = items.reduce(
    (acc, item) => acc + Number(item.comision || 0) * Number(item.cantidad || 0),
    0,
  );
  const distribution = new Map<string, { id: string; name: string; amount: number }>();

  const addAmount = (hostessId: string | number, amount: number) => {
    if (!hostessId || amount <= 0) return;
    const key = String(hostessId);
    const hostess = hostesses.find((item: any) => String(item.id_usuario || item.id) === key);
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

      selectedHostesses.forEach((hostessId: string | number, index: number) => {
        addAmount(hostessId, base + (index === 0 ? remainder : 0));
      });
      return;
    }

    selectedHostesses.forEach((hostessId: string | number) => {
      addAmount(hostessId, itemCommission);
    });
  });

  return {
    totalCommission,
    assignedCommission: Array.from(distribution.values()).reduce((acc, item) => acc + item.amount, 0),
    hostessDistribution: Array.from(distribution.values()).sort((a, b) => b.amount - a.amount),
  };
};
