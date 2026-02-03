// utils/money.js

// Convert rupees (4999) to paise (499900)
export function toPaise(amountRupees) {
  const n = Number(amountRupees);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

// Convert paise (499900) to rupees (4999)
export function toRupees(amountPaise) {
  const n = Number(amountPaise);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / 100);
}
