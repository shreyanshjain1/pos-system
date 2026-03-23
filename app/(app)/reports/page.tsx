import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { money } from '@/lib/format';

export default async function ReportsPage() {
  const session = await auth();
  const shopId = session?.user?.defaultShopId as string;

  const [topProducts, salesAggregate, purchaseAggregate, settings, lowStock] = await Promise.all([
    prisma.saleItem.groupBy({
      by: ['productName'],
      where: { sale: { shopId } },
      _sum: { qty: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5
    }),
    prisma.sale.aggregate({
      where: { shopId },
      _sum: { totalAmount: true },
      _count: true
    }),
    prisma.purchaseOrder.aggregate({
      where: { shopId },
      _sum: { totalAmount: true },
      _count: true
    }),
    prisma.shopSetting.findUnique({ where: { shopId } }),
    prisma.product.findMany({
      where: { shopId, isActive: true, stockQty: { lte: 5 } },
      orderBy: { stockQty: 'asc' },
      take: 10
    })
  ]);

  const currencySymbol = settings?.currencySymbol ?? '₱';

  return (
    <div className="space-y-6">
      <AppHeader title="Reports" subtitle="Track sales performance, purchasing spend, and stock pressure." />
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <div className="text-sm text-stone-500">Total sales</div>
          <div className="mt-2 text-3xl font-black text-stone-900">{money(Number(salesAggregate._sum.totalAmount ?? 0), currencySymbol)}</div>
          <div className="mt-2 text-sm text-stone-600">{salesAggregate._count} transactions</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">Total purchases</div>
          <div className="mt-2 text-3xl font-black text-stone-900">{money(Number(purchaseAggregate._sum.totalAmount ?? 0), currencySymbol)}</div>
          <div className="mt-2 text-sm text-stone-600">{purchaseAggregate._count} purchase entries</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">Low stock products</div>
          <div className="mt-2 text-3xl font-black text-stone-900">{lowStock.length}</div>
          <div className="mt-2 text-sm text-stone-600">Items below threshold</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 text-lg font-black text-stone-900">Top selling products</div>
          <div className="space-y-3">
            {topProducts.length ? topProducts.map((item) => (
              <div key={item.productName} className="rounded-2xl border border-stone-200 p-4">
                <div className="font-semibold text-stone-900">{item.productName}</div>
                <div className="mt-1 text-sm text-stone-600">
                  Qty sold: {item._sum.qty ?? 0} • Revenue: {money(Number(item._sum.lineTotal ?? 0), currencySymbol)}
                </div>
              </div>
            )) : <div className="text-sm text-stone-500">Not enough sales data yet.</div>}
          </div>
        </Card>

        <Card>
          <div className="mb-4 text-lg font-black text-stone-900">Low stock list</div>
          <div className="space-y-3">
            {lowStock.length ? lowStock.map((product) => (
              <div key={product.id} className="rounded-2xl border border-stone-200 p-4">
                <div className="font-semibold text-stone-900">{product.name}</div>
                <div className="mt-1 text-sm text-stone-600">Stock: {product.stockQty} • Reorder point: {product.reorderPoint}</div>
              </div>
            )) : <div className="text-sm text-stone-500">No low-stock items right now.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
