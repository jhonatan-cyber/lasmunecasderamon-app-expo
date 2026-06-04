export const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-CL").format(Number(digits));
};

export const parseAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};
