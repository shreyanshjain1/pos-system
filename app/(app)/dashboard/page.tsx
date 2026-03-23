import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AppHeader from '@/components/layout/AppHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentSalesCard from '@/components/dashboard/RecentSalesCard';
import LowStockCard from '@/components/dashboard/LowStockCard';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  let shopId = session.user.defaultShopId;

  if (!shopId) {
    const membership = await prisma.userShop.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: { shopId: true }
    });

    if (!membership?.shopId) {
      redirect('/onboard');
    }

    shopId = membership.shopId;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { defaultShopId: shopId }
    });
  }

  const [shop, totalProducts, lowStockProducts, totalSuppliers, recentSales, settings] =
    await Promise.all([
      prisma.shop.findUnique({
        where: { id: shopId }
      }),
      prisma.product.count({
        where: { shopId, isActive: true }
      }),
      prisma.product.findMany({
        where: {
          shopId,
          isActive: true,
          stockQty: {
            lte: prisma.shopSetting.fields.lowStockThreshold
          }
        },
        orderBy: [{ stockQty: 'asc' }, { name: 'asc' }],
        take: 8
      }).catch(async () => {
        const fallbackSettings = await prisma.shopSetting.findUnique({
          where: { shopId },
          select: { lowStockThreshold: true }
        });

        return prisma.product.findMany({
          where: {
            shopId,
            isActive: true,
            stockQty: {
              lte: fallbackSettings?.lowStockThreshold ?? 5
            }
          },
          orderBy: [{ stockQty: 'asc' }, { name: 'asc' }],
          take: 8
        });
      }),
      prisma.supplier.count({
        where: { shopId, isActive: true }
      }),
      prisma.sale.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          items: true
        }
      }),
      prisma.shopSetting.findUnique({
        where: { shopId }
      })
    ]);

  if (!shop) {
    redirect('/onboard');
  }

  const currencySymbol = settings?.currencySymbol ?? '₱';

  return (
    <div className="space-y-6">
      <AppHeader
        title="Dashboard"
        subtitle={`Welcome back. Here is what is happening in ${shop.name}.`}
      />

      <DashboardStats
        totalProducts={totalProducts}
        lowStockCount={lowStockProducts.length}
        totalSuppliers={totalSuppliers}
        totalSales={recentSales.length}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <RecentSalesCard
          sales={recentSales.map((sale) => ({
            ...sale,
            subtotal: sale.subtotal.toString(),
            taxAmount: sale.taxAmount.toString(),
            discountAmount: sale.discountAmount.toString(),
            totalAmount: sale.totalAmount.toString(),
            createdAt: sale.createdAt.toISOString(),
            items: sale.items.map((item) => ({
              ...item,
              unitPrice: item.unitPrice.toString(),
              lineTotal: item.lineTotal.toString()
            }))
          }))}
          currencySymbol={currencySymbol}
        />

        <LowStockCard
          products={lowStockProducts.map((product) => ({
            ...product,
            cost: product.cost.toString(),
            price: product.price.toString()
          }))}
          currencySymbol={currencySymbol}
        />
      </div>
    </div>
  );
}