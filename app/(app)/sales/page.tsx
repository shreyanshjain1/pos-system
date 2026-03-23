import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { money, dateTime } from '@/lib/format';

export default async function SalesPage() {
  const session = await auth();
  const shopId = session?.user?.defaultShopId as string;

  const [sales, settings] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.shopSetting.findUnique({ where: { shopId } })
  ]);

  const currencySymbol = settings?.currencySymbol ?? '₱';

  return (
    <div className="space-y-6">
      <AppHeader title="Sales" subtitle="Review transaction history and the line items that made up each sale." />
      <Card className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-stone-500">
            <tr>
              <th className="px-3 py-3">Sale</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Cashier</th>
              <th className="px-3 py-3">Payment</th>
              <th className="px-3 py-3">Items</th>
              <th className="px-3 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-t border-stone-200">
                <td className="px-3 py-3 font-semibold text-stone-900">{sale.saleNumber}</td>
                <td className="px-3 py-3 text-stone-600">{dateTime(sale.createdAt)}</td>
                <td className="px-3 py-3 text-stone-600">{sale.cashierName ?? '—'}</td>
                <td className="px-3 py-3 text-stone-600">{sale.paymentMethod}</td>
                <td className="px-3 py-3 text-stone-600">{sale.items.length}</td>
                <td className="px-3 py-3 font-black text-stone-900">{money(Number(sale.totalAmount), currencySymbol)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sales.length ? <div className="px-3 py-6 text-sm text-stone-500">No sales recorded yet.</div> : null}
      </Card>
    </div>
  );
}
