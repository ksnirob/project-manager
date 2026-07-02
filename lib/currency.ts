export const CURRENCY_SYMBOL = "৳";
export const CURRENCY_SEPARATOR = "\u00A0";

export function formatCurrency(value: number, options?: Intl.NumberFormatOptions) {
  return `${CURRENCY_SYMBOL}${CURRENCY_SEPARATOR}${Number(value || 0).toLocaleString("en-BD", options)}`;
}

export function formatCompactCurrency(value: number) {
  const amount = Number(value || 0);
  return `${CURRENCY_SYMBOL}${CURRENCY_SEPARATOR}${amount >= 1000 ? `${(amount / 1000).toFixed(0)}k` : amount.toLocaleString("en-BD")}`;
}
