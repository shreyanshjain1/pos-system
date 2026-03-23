import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { purchaseSchema } from '@/lib/auth/validation';

function buildPurchaseNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `PO-${yyyy}${mm}${dd}-${rand}`;
}

export async function GET() {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    if (!shopId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const purchases = await prisma.purchaseOrder.findMany({
      where: { shopId },
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to fetch purchases.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    const userId = session?.user?.id;
    if (!shopId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid purchase payload' }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { shopId, id: { in: parsed.data.items.map((item) => item.productId) } }
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    const totalAmount = parsed.data.items.reduce((sum, item) => sum + item.qty * item.unitCost, 0);

    const purchase = await prisma.$transaction(async (tx) => {
      const purchaseRecord = await tx.purchaseOrder.create({
        data: {
          shopId,
          supplierId: parsed.data.supplierId,
          purchaseNumber: buildPurchaseNumber(),
          totalAmount,
          notes: parsed.data.notes || null,
          items: {
            create: parsed.data.items.map((item) => {
              const product = productMap.get(item.productId);
              return {
                productId: item.productId,
                productName: product?.name ?? 'Unknown product',
                qty: item.qty,
                unitCost: item.unitCost,
                lineTotal: item.qty * item.unitCost
              };
            })
          }
        },
        include: { supplier: true, items: true }
      });

      for (const item of parsed.data.items) {
        const product = productMap.get(item.productId);
        if (!product) continue;

        await tx.product.update({
          where: { id: product.id },
          data: {
            cost: item.unitCost,
            stockQty: { increment: item.qty }
          }
        });

        await tx.inventoryMovement.create({
          data: {
            shopId,
            productId: product.id,
            type: 'PURCHASE_RECEIVED',
            qtyChange: item.qty,
            referenceId: purchaseRecord.id,
            notes: `Purchase ${purchaseRecord.purchaseNumber}`
          }
        });
      }

      await tx.activityLog.create({
        data: {
          shopId,
          userId,
          action: 'PURCHASE_RECEIVED',
          entityType: 'PurchaseOrder',
          entityId: purchaseRecord.id,
          description: `Received purchase ${purchaseRecord.purchaseNumber}`,
          metadata: { totalAmount, itemCount: parsed.data.items.length }
        }
      });

      return purchaseRecord;
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to create purchase.' }, { status: 500 });
  }
}
