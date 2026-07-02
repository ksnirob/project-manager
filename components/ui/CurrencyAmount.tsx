import { CURRENCY_SEPARATOR, CURRENCY_SYMBOL } from "@/lib/currency";

interface CurrencyAmountProps {
  value: number;
  prefix?: string;
  className?: string;
}

export function CurrencyAmount({ value, prefix = "", className }: CurrencyAmountProps) {
  return (
    <span className={className}>
      {prefix}
      <span
        className="inline-block text-[1.18em] leading-none [font-family:'Nirmala_UI','Noto_Sans_Bengali',sans-serif]"
        aria-hidden="true"
      >
        {CURRENCY_SYMBOL}
      </span>
      {CURRENCY_SEPARATOR}
      {Number(value || 0).toLocaleString("en-BD")}
    </span>
  );
}
