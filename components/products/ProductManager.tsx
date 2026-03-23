'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { money } from '@/lib/format';

type Category = { id: string; name: string };

type Product = {
  id: string;
  categoryId: string | null;
  sku: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  cost: string;
  price: string;
  stockQty: number;
  reorderPoint: number;
  isActive: boolean;
  category?: { name: string } | null;
};

type ProductManagerProps = {
  products?: Product[];
  initialProducts?: Product[];
  categories: Category[];
  currencySymbol: string;
};

export default function ProductManager({
  products,
  initialProducts,
  categories,
  currencySymbol
}: ProductManagerProps) {
  const safeProducts = products ?? initialProducts ?? [];
  const safeCategories = categories ?? [];

  const [items, setItems] = useState<Product[]>(safeProducts);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    categoryId: '',
    sku: '',
    barcode: '',
    name: '',
    description: '',
    cost: '0',
    price: '0',
    stockQty: '0',
    reorderPoint: '5'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();
    if (!term) return items;

    return items.filter((product) =>
      [product.name, product.sku ?? '', product.barcode ?? '', product.category?.name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [items, query]);

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          stockQty: Number(form.stockQty),
          reorderPoint: Number(form.reorderPoint),
          cost: Number(form.cost),
          price: Number(form.price),
          categoryId: form.categoryId || null,
          description: form.description || null,
          sku: form.sku || null,
          barcode: form.barcode || null
        })
      });

      const data = await response.json().catch(() => ({ error: 'Failed to create product.' }));
      setLoading(false);

      if (!response.ok) {
        setError(data.error ?? 'Failed to create product.');
        return;
      }

      const createdProduct: Product = {
        ...data.product,
        cost: String(data.product.cost),
        price: String(data.product.price)
      };

      setItems((prev) => [createdProduct, ...prev]);
      setForm({
        categoryId: '',
        sku: '',
        barcode: '',
        name: '',
        description: '',
        cost: '0',
        price: '0',
        stockQty: '0',
        reorderPoint: '5'
      });
    } catch {
      setLoading(false);
      setError('Failed to create product.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-lg font-black text-stone-900">Add product</div>

        <form onSubmit={createProduct} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />

          <select
            className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none"
            value={form.categoryId}
            onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
          >
            <option value="">No category</option>
            {safeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <Input
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
          />

          <Input
            placeholder="Barcode"
            value={form.barcode}
            onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
          />

          <Input
            placeholder="Cost"
            type="number"
            step="0.01"
            value={form.cost}
            onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))}
          />

          <Input
            placeholder="Price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
          />

          <Input
            placeholder="Stock Qty"
            type="number"
            value={form.stockQty}
            onChange={(e) => setForm((p) => ({ ...p, stockQty: e.target.value }))}
          />

          <Input
            placeholder="Reorder point"
            type="number"
            value={form.reorderPoint}
            onChange={(e) => setForm((p) => ({ ...p, reorderPoint: e.target.value }))}
          />

          <div className="md:col-span-2 xl:col-span-4">
            <Input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2 xl:col-span-4">
              {error}
            </div>
          ) : null}

          <div className="md:col-span-2 xl:col-span-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save product'}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-black text-stone-900">Product catalog</div>
          <div className="w-full md:w-80">
            <Input
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">SKU / Barcode</th>
                <th className="px-3 py-3">Cost</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">Reorder</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-t border-stone-200">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-stone-900">{product.name}</div>
                    {product.description ? (
                      <div className="text-xs text-stone-500">{product.description}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">{product.category?.name ?? '—'}</td>
                  <td className="px-3 py-3 text-stone-600">
                    {product.sku ?? '—'} / {product.barcode ?? '—'}
                  </td>
                  <td className="px-3 py-3">{money(product.cost, currencySymbol)}</td>
                  <td className="px-3 py-3">{money(product.price, currencySymbol)}</td>
                  <td
                    className={`px-3 py-3 font-semibold ${
                      product.stockQty <= product.reorderPoint ? 'text-red-600' : 'text-stone-900'
                    }`}
                  >
                    {product.stockQty}
                  </td>
                  <td className="px-3 py-3">{product.reorderPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filtered.length ? (
            <div className="py-6 text-sm text-stone-500">No products found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}