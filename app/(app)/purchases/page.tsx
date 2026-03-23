import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AppHeader from '@/components/layout/AppHeader';
import PurchaseManager from '@/components/purchases/PurchaseManager';

export default async function PurchasesPage() {
  const session = await auth();
  const shopId = session?.user?.defaultShopId as string;

  const [suppliers, products, purchases, settings] = await Promise.all([
    prisma.supplier.findMany({
      where: { shopId, isActive: true },
      orderBy: { name: 'asc' }
    }),
    prisma.product.findMany({
      where: { shopId, isActive: true },
      orderBy: { name: 'asc' }
    }),
    prisma.purchaseOrder.findMany({
      where: { shopId },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.shopSetting.findUnique({ where: { shopId } })
  ]);

  return (
    <div className="space-y-6">
      <AppHeader
        title="Purchases"
        subtitle="Receive inventory from suppliers and update stock automatically."
      />
      <PurchaseManager
        suppliers={suppliers}
        products={products.map((product) => ({
          ...product,
          cost: product.cost.toString()
        }))}
        purchases={purchases.map((purchase) => ({
          ...purchase,
          totalAmount: purchase.totalAmount.toString(),
          createdAt: purchase.createdAt.toISOString()
        }))}
        currencySymbol={settings?.currencySymbol ?? '₱'}
      />
    </div>
  );
}