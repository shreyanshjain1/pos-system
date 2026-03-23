import AppHeader from '@/components/layout/AppHeader';
import StatsGrid from '@/components/dashboard/StatsGrid';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { money, dateTime } from '@/lib/format';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  const shopId = session?.user?.defaultShopId as string;

  const [shop, productsCount, lowStockCount, salesToday, notifications, recentSales, activities, settings] =
    await Promise.all([
      prisma.shop.findUnique({ where: { id: shopId } }),
      prisma.product.count({ where: { shopId, isActive: true } }),
      prisma.product.count({
        where: {
          shopId,
          isActive: true,
          OR: [{ stockQty: { lte: 0 } }, { stockQty: { lte: 5 } }]
        }
      }),
      prisma.sale.aggregate({
        where: {
          shopId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.notification.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        take: 6
      }),
      prisma.sale.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.activityLog.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        take: 6
      }),
      prisma.shopSetting.findUnique({ where: { shopId } })
    ]);

  const currencySymbol = settings?.currencySymbol ?? '₱';

  return (
    <div className="space-y-6">
      <AppHeader
        title="Dashboard"
        subtitle={`Welcome back${shop ? ` to ${shop.name}` : ''}. Monitor revenue, stock pressure, and recent activity.`}
        action={
          <div className="flex gap-3">
            <Link href="/checkout"><Button>New Sale</Button></Link>
            <form action="/api/worker/run-now" method="post">
              <Button variant="secondary" type="submit">Run Worker Scan</Button>
            </form>
          </div>
        }
      />

      <StatsGrid
        cards={[
          { label: 'Products', value: String(productsCount), helper: 'Active sellable items' },
          { label: 'Low Stock', value: String(lowStockCount), helper: 'Needs replenishment' },
          { label: 'Sales Today', value: String(salesToday._count), helper: 'Completed transactions' },
          { label: 'Revenue Today', value: money(Number(salesToday._sum.totalAmount ?? 0), currencySymbol), helper: 'Gross receipts' }
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-black text-stone-900">Recent sales</div>
            <Link href="/sales" className="text-sm font-semibold text-emerald-600">View all</Link>
          </div>
          <div className="space-y-3">
            {recentSales.length ? recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3">
                <div>
                  <div className="font-semibold text-stone-900">{sale.saleNumber}</div>
                  <div className="text-sm text-stone-600">{dateTime(sale.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-stone-900">{money(Number(sale.totalAmount), currencySymbol)}</div>
                  <div className="text-sm text-stone-500">{sale.paymentMethod}</div>
                </div>
              </div>
            )) : <div className="text-sm text-stone-500">No sales yet.</div>}
          </div>
        </Card>

        <Card>
          <div className="mb-4 text-lg font-black text-stone-900">Notifications</div>
          <div className="space-y-3">
            {notifications.length ? notifications.map((note) => (
              <div key={note.id} className="rounded-2xl border border-stone-200 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-stone-900">{note.title}</div>
                  <Badge>{note.type.replaceAll('_', ' ')}</Badge>
                </div>
                <div className="mt-1 text-sm text-stone-600">{note.message}</div>
                <div className="mt-2 text-xs text-stone-500">{dateTime(note.createdAt)}</div>
              </div>
            )) : <div className="text-sm text-stone-500">No notifications yet.</div>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 text-lg font-black text-stone-900">Recent activity</div>
        <div className="grid gap-3">
          {activities.length ? activities.map((activity) => (
            <div key={activity.id} className="rounded-2xl border border-stone-200 px-4 py-3">
              <div className="font-semibold text-stone-900">{activity.action}</div>
              <div className="mt-1 text-sm text-stone-600">{activity.description}</div>
              <div className="mt-2 text-xs text-stone-500">{dateTime(activity.createdAt)}</div>
            </div>
          )) : <div className="text-sm text-stone-500">No activity recorded yet.</div>}
        </div>
      </Card>
    </div>
  );
}
