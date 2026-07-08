import { showToast } from '@/hooks/utils/cartUtils';

// Re-export shared showToast from cartUtils to eliminate duplication
export { showToast };

export const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const formatAmountInput = (val: string) => {
  const clean = val.replace(/[^0-9]/g, '');
  if (clean === '') return '0';
  return parseInt(clean, 10)
    .toLocaleString('es-CL')
    .replace(/,/g, '.');
};

export const parseNumericAmount = (val: string) => {
  return parseInt(val.replace(/\./g, '')) || 0;
};
