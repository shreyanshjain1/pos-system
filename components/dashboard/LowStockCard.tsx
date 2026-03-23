type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  cost: string;
  price: string;
  stockQty: number;
  reorderPoint: number;
  isActive: boolean;
  shopId: string;
  categoryId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type Props = {
  products: Product[];
  currencySymbol: string;
};

function money(value: string | number, currencySymbol: string) {
  const numeric = typeof value === "number" ? value : Number(value);
  return `${currencySymbol}${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function LowStockCard({ products, currencySymbol }: Props) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-stone-900">Low stock alerts</h2>
        <p className="text-sm text-stone-500">Products that need restocking soon.</p>
      </div>

      <div className="space-y-3">
        {products.length ? (
          products.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-stone-900">{product.name}</div>
                  <div className="text-sm text-stone-500">
                    SKU: {product.sku || "—"} • Barcode: {product.barcode || "—"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-amber-700">{product.stockQty}</div>
                  <div className="text-xs text-stone-500">
                    Reorder at {product.reorderPoint}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-stone-600">
                <span>Price: {money(product.price, currencySymbol)}</span>
                <span>Cost: {money(product.cost, currencySymbol)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
            No low-stock products right now.
          </div>
        )}
      </div>
    </section>
  );
}