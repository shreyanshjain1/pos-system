import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { supplierSchema } from '@/lib/auth/validation';

export async function GET() {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    if (!shopId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const suppliers = await prisma.supplier.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to fetch suppliers.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    const userId = session?.user?.id;
    if (!shopId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid supplier data' }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        shopId,
        name: parsed.data.name,
        contactName: parsed.data.contactName || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null
      }
    });

    await prisma.activityLog.create({
      data: {
        shopId,
        userId,
        action: 'SUPPLIER_CREATED',
        entityType: 'Supplier',
        entityId: supplier.id,
        description: `Created supplier ${supplier.name}`
      }
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to create supplier.' }, { status: 500 });
  }
}
