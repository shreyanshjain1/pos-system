import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

export async function requireActiveShop() {
  const user = await requireUser();

  const membership = await prisma.userShop.findFirst({
    where: {
      userId: user.id,
      ...(user.defaultShopId ? { shopId: user.defaultShopId } : {})
    },
    include: {
      shop: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (!membership) {
    return null;
  }

  return membership;
}
