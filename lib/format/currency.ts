export default function formatCurrency(amount: number | null | undefined, opts?: { locale?: string; currency?: string }) {
  const { locale = 'en-PH', currency = 'PHP' } = opts || {}
  const value = typeof amount === 'number' ? amount : Number(amount) || 0
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'symbol' }).format(value)
  } catch (e) {
    // fallback
    return `${currency} ${value.toFixed(2)}`
  }
}
