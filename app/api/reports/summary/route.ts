import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    if (!shopId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [salesAggregate, purchaseAggregate, lowStockCount] = await Promise.all([
      prisma.sale.aggregate({
        where: { shopId },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.purchaseOrder.aggregate({
        where: { shopId },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.product.count({
        where: { shopId, isActive: true, stockQty: { lte: 5 } }
      })
    ]);

    return NextResponse.json({
      revenue: Number(salesAggregate._sum.totalAmount ?? 0),
      salesCount: salesAggregate._count,
      purchaseSpend: Number(purchaseAggregate._sum.totalAmount ?? 0),
      purchaseCount: purchaseAggregate._count,
      lowStockCount
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load summary.' }, { status: 500 });
  }
}
