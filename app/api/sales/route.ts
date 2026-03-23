import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { saleSchema } from '@/lib/auth/validation';

function buildSaleNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `S-${yyyy}${mm}${dd}-${rand}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    const userId = session?.user?.id;

    if (!shopId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = saleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid sale payload' }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: {
        shopId,
        id: { in: parsed.data.items.map((item) => item.productId) }
      }
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    for (const item of parsed.data.items) {
      const product = productMap.get(item.productId);
      if (!product) return NextResponse.json({ error: 'One or more products were not found.' }, { status: 404 });
      if (product.stockQty < item.qty) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}.` }, { status: 400 });
      }
    }

    const subtotal = parsed.data.items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      return sum + Number(product.price) * item.qty;
    }, 0);

    const settings = await prisma.shopSetting.findUnique({ where: { shopId } });
    const taxAmount = subtotal * (Number(settings?.taxRate ?? 0) / 100);
    const discountAmount = parsed.data.discountAmount ?? 0;
    const totalAmount = Math.max(subtotal + taxAmount - discountAmount, 0);

    const sale = await prisma.$transaction(async (tx) => {
      const saleRecord = await tx.sale.create({
        data: {
          shopId,
          saleNumber: buildSaleNumber(),
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          paymentMethod: parsed.data.paymentMethod,
          notes: parsed.data.notes || null,
          cashierName: parsed.data.cashierName || null,
          items: {
            create: parsed.data.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: product.id,
                productName: product.name,
                qty: item.qty,
                unitPrice: product.price,
                lineTotal: Number(product.price) * item.qty
              };
            })
          }
        },
        include: {
          items: true
        }
      });

      for (const item of parsed.data.items) {
        const product = productMap.get(item.productId)!;
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: { decrement: item.qty } }
        });

        await tx.inventoryMovement.create({
          data: {
            shopId,
            productId: product.id,
            type: 'SALE',
            qtyChange: -item.qty,
            referenceId: saleRecord.id,
            notes: `Sale ${saleRecord.saleNumber}`
          }
        });
      }

      await tx.activityLog.create({
        data: {
          shopId,
          userId,
          action: 'SALE_COMPLETED',
          entityType: 'Sale',
          entityId: saleRecord.id,
          description: `Completed sale ${saleRecord.saleNumber}`,
          metadata: {
            itemCount: parsed.data.items.length,
            totalAmount
          }
        }
      });

      await tx.workerJob.create({
        data: {
          shopId,
          type: 'LOW_STOCK_SCAN',
          createdById: userId
        }
      });

      return saleRecord;
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to complete sale.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    if (!shopId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sales = await prisma.sale.findMany({
      where: { shopId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ sales });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to fetch sales.' }, { status: 500 });
  }
}
