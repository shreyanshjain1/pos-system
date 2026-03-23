import { NextResponse } from 'next/server';
import { ShopRole, ShopType } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { onboardSchema } from '@/lib/auth/validation';
import { slugify } from '@/lib/slug';

async function createUniqueSlug(name: string) {
  const base = slugify(name) || 'shop';
  let attempt = base;
  let i = 2;
  while (true) {
    const hit = await prisma.shop.findUnique({ where: { slug: attempt }, select: { id: true } });
    if (!hit) return attempt;
    attempt = `${base}-${i++}`;
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = onboardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid onboarding data' }, { status: 400 });
    }

    const existing = await prisma.userShop.findFirst({
      where: { userId: session.user.id },
      include: { shop: true },
      orderBy: { createdAt: 'asc' }
    });

    if (existing) {
      return NextResponse.json({ shop: existing.shop });
    }

    const slug = await createUniqueSlug(parsed.data.shopName);

    const result = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: parsed.data.shopName,
          slug,
          posType: parsed.data.posType as ShopType,
          ownerId: session.user!.id
        }
      });

      await tx.userShop.create({
        data: {
          userId: session.user!.id,
          shopId: shop.id,
          role: ShopRole.ADMIN
        }
      });

      await tx.user.update({
        where: { id: session.user!.id },
        data: { defaultShopId: shop.id }
      });

      await tx.shopSetting.create({
        data: {
          shopId: shop.id,
          currencySymbol: '₱',
          taxRate: 12,
          receiptFooter: 'Thank you for shopping with Vertex POS.',
          lowStockEnabled: true,
          lowStockThreshold: 5
        }
      });

      return shop;
    });

    return NextResponse.json({ shop: result }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to create shop.' }, { status: 500 });
  }
}
