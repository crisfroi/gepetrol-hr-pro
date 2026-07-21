export function formatCurrency(
  amount: number,
  currency: string = "XAF",
  locale: string = "es-GQ",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, locale: string = "es-GQ") {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatPercent(n: number, digits: number = 1) {
  return `${n.toFixed(digits)}%`;
}

export function formatDate(d: Date | string, locale: string = "es-GQ") {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}
