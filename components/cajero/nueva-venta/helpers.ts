import Toast from 'react-native-toast-message';

export const showToast = (
  title: string,
  message: string,
  type: 'success' | 'error' = 'error',
) => {
  Toast.show({ type, text1: title, text2: message, visibilityTime: 4000 });
};

export const isChampagneProduct = (producto: any) => {
  const cat = (producto.categoria || '').toLowerCase();
  return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
};

export const getChampagneLimit = (precio: number) => {
  if (precio >= 240000) return 5;
  if (precio >= 200000) return 4;
  if (precio >= 160000) return 3;
  if (precio >= 120000) return 2;
  return 1;
};

export const getHostessLimit = (prod: any) => {
  const price = prod.precio ?? prod.price ?? 0;
  if (isChampagneProduct(prod)) {
    return getChampagneLimit(price);
  }
  return 1;
};
