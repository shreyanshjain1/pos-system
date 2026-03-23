import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const shopId = session?.user?.defaultShopId;
    const userId = session?.user?.id;
    if (!shopId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.workerJob.createMany({
      data: [
        { shopId, type: 'LOW_STOCK_SCAN', createdById: userId },
        { shopId, type: 'DAILY_SUMMARY', createdById: userId }
      ]
    });

    const referer = request.headers.get('referer');
    return NextResponse.redirect(new URL(referer || '/dashboard', request.url));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to queue worker jobs.' }, { status: 500 });
  }
}
