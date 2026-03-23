import { PrismaClient, ShopRole, ShopType, PurchaseStatus, WorkerJobType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@vertexpos.local';
  const passwordHash = await bcrypt.hash('password123', 12);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Vertex Admin',
        passwordHash,
      }
    });
  }

  const existingShop = await prisma.shop.findFirst({ where: { ownerId: user.id } });
  if (existingShop) {
    console.log('Seed already exists.');
    return;
  }

  const shop = await prisma.shop.create({
    data: {
      name: 'Vertex Demo Store',
      slug: 'vertex-demo-store',
      posType: ShopType.RETAIL,
      ownerId: user.id,
    }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultShopId: shop.id }
  });

  await prisma.userShop.create({
    data: {
      userId: user.id,
      shopId: shop.id,
      role: ShopRole.ADMIN,
    }
  });

  const [catBeverages, catSnacks] = await Promise.all([
    prisma.category.create({
      data: { shopId: shop.id, name: 'Beverages', slug: 'beverages' }
    }),
    prisma.category.create({
      data: { shopId: shop.id, name: 'Snacks', slug: 'snacks' }
    }),
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: {
        shopId: shop.id,
        categoryId: catBeverages.id,
        sku: 'BEV-001',
        barcode: '480001000001',
        name: 'Mineral Water 500ml',
        description: 'Sample bottled water',
        cost: 10,
        price: 18,
        stockQty: 42,
        reorderPoint: 10,
      }
    }),
    prisma.product.create({
      data: {
        shopId: shop.id,
        categoryId: catBeverages.id,
        sku: 'BEV-002',
        barcode: '480001000002',
        name: 'Iced Tea Bottle',
        description: 'Sample iced tea',
        cost: 18,
        price: 30,
        stockQty: 7,
        reorderPoint: 10,
      }
    }),
    prisma.product.create({
      data: {
        shopId: shop.id,
        categoryId: catSnacks.id,
        sku: 'SNK-001',
        barcode: '480001000003',
        name: 'Potato Chips',
        description: 'Sample chips',
        cost: 12,
        price: 22,
        stockQty: 30,
        reorderPoint: 8,
      }
    }),
  ]);

  const supplier = await prisma.supplier.create({
    data: {
      shopId: shop.id,
      name: 'Metro Supply Hub',
      contactName: 'Lara Gomez',
      email: 'lara@metrosupply.local',
      phone: '09171234567',
      address: 'Manila',
      notes: 'Primary beverage supplier'
    }
  });

  await prisma.purchaseOrder.create({
    data: {
      shopId: shop.id,
      supplierId: supplier.id,
      purchaseNumber: 'PO-0001',
      status: PurchaseStatus.RECEIVED,
      totalAmount: 560,
      notes: 'Initial stock load',
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            qty: 20,
            unitCost: 10,
            lineTotal: 200,
          },
          {
            productId: products[1].id,
            productName: products[1].name,
            qty: 20,
            unitCost: 18,
            lineTotal: 360,
          }
        ]
      }
    }
  });

  await prisma.shopSetting.create({
    data: {
      shopId: shop.id,
      currencySymbol: '₱',
      taxRate: 12,
      receiptFooter: 'Thank you for shopping with Vertex POS.',
      lowStockEnabled: true,
      lowStockThreshold: 10,
    }
  });

  await prisma.workerJob.createMany({
    data: [
      { shopId: shop.id, type: WorkerJobType.LOW_STOCK_SCAN },
      { shopId: shop.id, type: WorkerJobType.DAILY_SUMMARY },
    ]
  });

  console.log('Seeded successfully');
  console.log('Login: admin@vertexpos.local / password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
