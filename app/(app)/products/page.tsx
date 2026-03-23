import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AppHeader from '@/components/layout/AppHeader';
import ProductManager from '@/components/products/ProductManager';

export default async function ProductsPage() {
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

  const [products, categories, settings] = await Promise.all([
    prisma.product.findMany({
      where: { shopId },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.category.findMany({
      where: { shopId },
      orderBy: { name: 'asc' }
    }),
    prisma.shopSetting.findUnique({
      where: { shopId }
    })
  ]);

  return (
    <div className="space-y-6">
      <AppHeader
        title="Products"
        subtitle="Manage your catalog, pricing, stock levels, and category organization."
      />
      <ProductManager
        products={products.map((product) => ({
          ...product,
          cost: product.cost.toString(),
          price: product.price.toString()
        }))}
        categories={categories}
        currencySymbol={settings?.currencySymbol ?? '₱'}
      />
    </div>
  );
}