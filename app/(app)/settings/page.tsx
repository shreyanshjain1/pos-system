import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import SettingsForm from '@/components/settings/SettingsForm';

export default async function SettingsPage() {
  const session = await auth();
  const shopId = session?.user?.defaultShopId as string;
  const settings = await prisma.shopSetting.findUnique({ where: { shopId } });

  return (
    <SettingsForm
      initial={{
        currencySymbol: settings?.currencySymbol ?? '₱',
        taxRate: String(Number(settings?.taxRate ?? 12)),
        receiptFooter: settings?.receiptFooter ?? 'Thank you for shopping with Vertex POS.',
        lowStockEnabled: settings?.lowStockEnabled ?? true,
        lowStockThreshold: String(settings?.lowStockThreshold ?? 5)
      }}
    />
  );
}
