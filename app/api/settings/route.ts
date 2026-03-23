import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { settingSchema } from '@/lib/auth/validation';

export async function GET() {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    if (!shopId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await prisma.shopSetting.findUnique({ where: { shopId } });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load settings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    const userId = session?.user?.id;
    if (!shopId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = settingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid settings payload' }, { status: 400 });
    }

    const settings = await prisma.shopSetting.upsert({
      where: { shopId },
      update: {
        currencySymbol: parsed.data.currencySymbol,
        taxRate: parsed.data.taxRate,
        receiptFooter: parsed.data.receiptFooter || null,
        lowStockEnabled: parsed.data.lowStockEnabled,
        lowStockThreshold: parsed.data.lowStockThreshold
      },
      create: {
        shopId,
        currencySymbol: parsed.data.currencySymbol,
        taxRate: parsed.data.taxRate,
        receiptFooter: parsed.data.receiptFooter || null,
        lowStockEnabled: parsed.data.lowStockEnabled,
        lowStockThreshold: parsed.data.lowStockThreshold
      }
    });

    await prisma.activityLog.create({
      data: {
        shopId,
        userId,
        action: 'SETTINGS_UPDATED',
        entityType: 'ShopSetting',
        entityId: settings.id,
        description: 'Updated shop settings'
      }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to save settings.' }, { status: 500 });
  }
}
