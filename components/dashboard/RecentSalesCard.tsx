type SaleItem = {
  id: string;
  productName: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
};

type Sale = {
  id: string;
  saleNumber: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  paymentMethod: string;
  notes: string | null;
  cashierName: string | null;
  createdAt: string;
  items: SaleItem[];
};

type Props = {
  sales: Sale[];
  currencySymbol: string;
};

function money(value: string | number, currencySymbol: string) {
  const numeric = typeof value === "number" ? value : Number(value);
  return `${currencySymbol}${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString();
}

export default function RecentSalesCard({ sales, currencySymbol }: Props) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-stone-900">Recent sales</h2>
          <p className="text-sm text-stone-500">Latest transactions recorded in this shop.</p>
        </div>
      </div>

      <div className="space-y-3">
        {sales.length ? (
          sales.map((sale) => (
            <div key={sale.id} className="rounded-2xl border border-stone-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-stone-900">{sale.saleNumber}</div>
                  <div className="text-sm text-stone-500">
                    {sale.cashierName || "No cashier name"} • {sale.paymentMethod}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-stone-900">
                    {money(sale.totalAmount, currencySymbol)}
                  </div>
                  <div className="text-xs text-stone-500">{dateTime(sale.createdAt)}</div>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {sale.items.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-stone-600">
                    <span>
                      {item.productName} • {item.qty} × {money(item.unitPrice, currencySymbol)}
                    </span>
                    <span>{money(item.lineTotal, currencySymbol)}</span>
                  </div>
                ))}
                {sale.items.length > 4 ? (
                  <div className="text-xs text-stone-500">
                    +{sale.items.length - 4} more item(s)
                  </div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
            No sales yet.
          </div>
        )}
      </div>
    </section>
  );
}