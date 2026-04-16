/**
 * Display quantities in plain English: up to `maxDecimals` fractional digits,
 * trimming trailing zeros (e.g. 5, 5.1 — not 5.00).
 */
export function formatDisplayQuantity(value: number, maxDecimals = 1): string {
  if (!Number.isFinite(value)) return "0";
  const d = Math.max(0, Math.min(6, Math.floor(maxDecimals)));
  const rounded = Math.round(value * 10 ** d) / 10 ** d;
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  }).format(rounded);
}
