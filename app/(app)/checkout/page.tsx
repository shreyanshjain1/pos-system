import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AppHeader from '@/components/layout/AppHeader';
import CheckoutClient from '@/components/checkout/CheckoutClient';

export default async function CheckoutPage() {
  const session = await auth();
  const shopId = session?.user?.defaultShopId as string;

  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      where: { shopId, isActive: true },
      orderBy: { name: 'asc' }
    }),
    prisma.shopSetting.findUnique({ where: { shopId } })
  ]);

  return (
    <div className="space-y-6">
      <AppHeader title="Checkout" subtitle="Create a sale, deduct stock automatically, and record payment method." />
      <CheckoutClient
        products={products.map((product) => ({
          ...product,
          price: product.price.toString()
        }))}
        taxRate={Number(settings?.taxRate ?? 0)}
        currencySymbol={settings?.currencySymbol ?? '₱'}
      />
    </div>
  );
}
