export function money(value: number | string | null | undefined, currencySymbol = '₱') {
  const amount = typeof value === 'string' ? Number(value) : value ?? 0;
  return `${currencySymbol}${amount.toFixed(2)}`;
}

export function dateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
