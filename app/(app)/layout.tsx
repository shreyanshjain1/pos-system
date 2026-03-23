import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AppSidebar from '@/components/layout/AppSidebar';
import { prisma } from '@/lib/prisma';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const membership = await prisma.userShop.findFirst({
    where: {
      userId: session.user.id,
      ...(session.user.defaultShopId ? { shopId: session.user.defaultShopId } : {})
    },
    include: { shop: true },
    orderBy: { createdAt: 'asc' }
  });

  if (!membership) {
    redirect('/onboard');
  }

  return (
    <div className="md:flex">
      <AppSidebar />
      <main className="min-h-screen flex-1 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
