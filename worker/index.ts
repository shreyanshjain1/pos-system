import { PrismaClient, NotificationType, WorkerJobStatus, WorkerJobType } from '@prisma/client';

const prisma = new PrismaClient();

async function runLowStockScan(jobId: string, shopId: string) {
  const settings = await prisma.shopSetting.findUnique({ where: { shopId } });
  if (!settings?.lowStockEnabled) return;

  const lowStockProducts = await prisma.product.findMany({
    where: {
      shopId,
      isActive: true,
      stockQty: { lte: settings.lowStockThreshold }
    },
    orderBy: { stockQty: 'asc' }
  });

  for (const product of lowStockProducts) {
    const existing = await prisma.notification.findFirst({
      where: {
        shopId,
        type: NotificationType.LOW_STOCK,
        title: `Low stock: ${product.name}`,
        createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
      }
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          shopId,
          type: NotificationType.LOW_STOCK,
          title: `Low stock: ${product.name}`,
          message: `${product.name} is down to ${product.stockQty} units. Reorder point: ${product.reorderPoint}.`
        }
      });
    }
  }

  await prisma.activityLog.create({
    data: {
      shopId,
      action: 'WORKER_LOW_STOCK_SCAN',
      entityType: 'WorkerJob',
      entityId: jobId,
      description: `Worker scanned ${lowStockProducts.length} low-stock products.`
    }
  });
}

async function runDailySummary(jobId: string, shopId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [sales, purchases] = await Promise.all([
    prisma.sale.aggregate({
      where: { shopId, createdAt: { gte: todayStart } },
      _sum: { totalAmount: true },
      _count: true
    }),
    prisma.purchaseOrder.aggregate({
      where: { shopId, createdAt: { gte: todayStart } },
      _sum: { totalAmount: true },
      _count: true
    })
  ]);

  await prisma.notification.create({
    data: {
      shopId,
      type: NotificationType.DAILY_SUMMARY,
      title: 'Daily summary generated',
      message: `Sales today: ${sales._count} transaction(s), revenue ${Number(sales._sum.totalAmount ?? 0).toFixed(2)}. Purchases: ${purchases._count}, spend ${Number(purchases._sum.totalAmount ?? 0).toFixed(2)}.`
    }
  });

  await prisma.activityLog.create({
    data: {
      shopId,
      action: 'WORKER_DAILY_SUMMARY',
      entityType: 'WorkerJob',
      entityId: jobId,
      description: 'Worker generated daily summary.'
    }
  });
}

async function processOneJob() {
  const job = await prisma.workerJob.findFirst({
    where: {
      status: WorkerJobStatus.QUEUED,
      runAt: { lte: new Date() }
    },
    orderBy: { createdAt: 'asc' }
  });

  if (!job) return false;

  await prisma.workerJob.update({
    where: { id: job.id },
    data: {
      status: WorkerJobStatus.RUNNING,
      startedAt: new Date()
    }
  });

  try {
    if (!job.shopId) {
      throw new Error('Job does not have a shopId.');
    }

    if (job.type === WorkerJobType.LOW_STOCK_SCAN) {
      await runLowStockScan(job.id, job.shopId);
    } else if (job.type === WorkerJobType.DAILY_SUMMARY) {
      await runDailySummary(job.id, job.shopId);
    }

    await prisma.workerJob.update({
      where: { id: job.id },
      data: {
        status: WorkerJobStatus.COMPLETED,
        finishedAt: new Date()
      }
    });
  } catch (error) {
    await prisma.workerJob.update({
      where: { id: job.id },
      data: {
        status: WorkerJobStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown worker error',
        finishedAt: new Date()
      }
    });
  }

  return true;
}

async function main() {
  const once = process.argv.includes('--once');

  if (once) {
    await processOneJob();
    await prisma.$disconnect();
    return;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const processed = await processOneJob();
    if (!processed) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
