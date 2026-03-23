import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AppHeader from '@/components/layout/AppHeader';
import ProductManager from '@/components/products/ProductManager';

export default async function ProductsPage() {
  const session = await auth();
  const shopId = session?.user?.defaultShopId as string;

  const [products, categories, settings] = await Promise.all([
    prisma.product.findMany({
      where: { shopId },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.category.findMany({ where: { shopId }, orderBy: { name: 'asc' } }),
    prisma.shopSetting.findUnique({ where: { shopId } })
  ]);

  return (
    <div className="space-y-6">
      <AppHeader title="Products" subtitle="Manage your catalog, stock levels, pricing, and reorder points." />
      <ProductManager
        initialProducts={products.map((product) => ({
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
