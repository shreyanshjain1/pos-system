import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AppHeader from '@/components/layout/AppHeader';
import SupplierManager from '@/components/suppliers/SupplierManager';

export default async function SuppliersPage() {
  const session = await auth();
  const shopId = session?.user?.defaultShopId as string;

  const suppliers = await prisma.supplier.findMany({
    where: { shopId },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <AppHeader title="Suppliers" subtitle="Manage vendors for stock-in and purchasing workflows." />
      <SupplierManager initialSuppliers={suppliers} />
    </div>
  );
}
