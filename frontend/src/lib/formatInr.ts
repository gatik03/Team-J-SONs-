const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatInr(value: number): string {
  return inr.format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
