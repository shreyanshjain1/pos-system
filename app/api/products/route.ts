import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { categorySchema, productSchema } from '@/lib/auth/validation';
import { slugify } from '@/lib/slug';

export async function GET() {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    if (!shopId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const products = await prisma.product.findMany({
      where: { shopId },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to fetch products.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    const userId = session?.user?.id;
    if (!shopId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product data' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        shopId,
        categoryId: parsed.data.categoryId || null,
        sku: parsed.data.sku || null,
        barcode: parsed.data.barcode || null,
        name: parsed.data.name,
        description: parsed.data.description || null,
        cost: parsed.data.cost,
        price: parsed.data.price,
        stockQty: parsed.data.stockQty,
        reorderPoint: parsed.data.reorderPoint,
        isActive: parsed.data.isActive
      },
      include: {
        category: { select: { name: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        shopId,
        userId,
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: product.id,
        description: `Created product ${product.name}`
      }
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to create product.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    if (!shopId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid category name.' }, { status: 400 });
    }

    const slugBase = slugify(parsed.data.name);
    let slug = slugBase;
    let i = 2;
    while (await prisma.category.findFirst({ where: { shopId, slug }, select: { id: true } })) {
      slug = `${slugBase}-${i++}`;
    }

    const category = await prisma.category.create({
      data: {
        shopId,
        name: parsed.data.name,
        slug
      }
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to create category.' }, { status: 500 });
  }
}
