'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { money } from '@/lib/format';

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  stockQty: number;
  price: string;
};

type CartLine = {
  productId: string;
  name: string;
  price: number;
  stockQty: number;
  qty: number;
};

export default function CheckoutClient({
  products,
  taxRate,
  currencySymbol
}: {
  products: Product[];
  taxRate: number;
  currencySymbol: string;
}) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [cashierName, setCashierName] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();
    if (!term) return products;
    return products.filter((product) => [product.name, product.barcode ?? ''].join(' ').toLowerCase().includes(term));
  }, [products, query]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = Number(discountAmount || 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = Math.max(subtotal + taxAmount - discount, 0);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, qty: Math.min(item.qty + 1, item.stockQty) }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        stockQty: product.stockQty,
        qty: 1
      }];
    });
  }

  function updateQty(productId: string, qty: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, qty: Math.max(1, Math.min(qty, item.stockQty)) } : item
      )
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  async function completeSale() {
    setError('');
    setMessage('');

    if (!cart.length) {
      setError('Add at least one product to the cart.');
      return;
    }

    setLoading(true);

    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod,
        discountAmount: Number(discountAmount || 0),
        cashierName: cashierName || null,
        notes: notes || null,
        items: cart.map((item) => ({
          productId: item.productId,
          qty: item.qty
        }))
      })
    });

    const data = await response.json().catch(() => ({ error: 'Failed to complete sale.' }));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? 'Failed to complete sale.');
      return;
    }

    setCart([]);
    setDiscountAmount('0');
    setCashierName('');
    setNotes('');
    setMessage(`Sale ${data.sale.saleNumber} completed successfully.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-lg font-black text-stone-900">Product selector</div>
        <Input placeholder="Search by name or barcode..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => addToCart(product)}
              className="rounded-2xl border border-stone-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <div className="font-semibold text-stone-900">{product.name}</div>
              <div className="mt-1 text-sm text-stone-500">Stock: {product.stockQty}</div>
              <div className="mt-2 text-base font-black text-emerald-700">{money(product.price, currencySymbol)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-lg font-black text-stone-900">Cart</div>

        <div className="space-y-3">
          {cart.length ? cart.map((item) => (
            <div key={item.productId} className="rounded-2xl border border-stone-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-stone-900">{item.name}</div>
                  <div className="text-sm text-stone-500">{money(item.price, currencySymbol)} each</div>
                </div>
                <button type="button" className="text-sm font-semibold text-red-600" onClick={() => removeItem(item.productId)}>Remove</button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Input type="number" min={1} max={item.stockQty} value={String(item.qty)} onChange={(e) => updateQty(item.productId, Number(e.target.value))} className="max-w-24" />
                <div className="text-sm text-stone-600">Line total: {money(item.price * item.qty, currencySymbol)}</div>
              </div>
            </div>
          )) : <div className="text-sm text-stone-500">Your cart is empty.</div>}
        </div>

        <div className="mt-6 grid gap-4">
          <Input placeholder="Cashier name" value={cashierName} onChange={(e) => setCashierName(e.target.value)} />
          <Input placeholder="Payment method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          <Input type="number" step="0.01" placeholder="Discount amount" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
          <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="mt-6 space-y-2 rounded-2xl bg-stone-50 p-4 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal, currencySymbol)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{money(taxAmount, currencySymbol)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{money(discount, currencySymbol)}</span></div>
          <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-black text-stone-900">
            <span>Total</span><span>{money(total, currencySymbol)}</span>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

        <Button className="mt-4 w-full" onClick={completeSale} disabled={loading}>
          {loading ? 'Processing sale...' : 'Complete sale'}
        </Button>
      </div>
    </div>
  );
}
