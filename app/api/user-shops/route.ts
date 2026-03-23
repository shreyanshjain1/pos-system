import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.userShop.findMany({
      where: { userId: session.user.id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            posType: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({
      data: memberships.map((item) => ({
        id: item.shop.id,
        name: item.shop.name,
        slug: item.shop.slug,
        posType: item.shop.posType,
        role: item.role
      }))
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load shops.' }, { status: 500 });
  }
}
