type Props = {
  totalProducts: number;
  lowStockCount: number;
  totalSuppliers: number;
  totalSales: number;
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "blue" | "purple";
}) {
  const toneClasses: Record<typeof tone, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <div className="text-sm font-semibold uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-3 text-4xl font-black leading-none">{value}</div>
    </div>
  );
}

export default function DashboardStats({
  totalProducts,
  lowStockCount,
  totalSuppliers,
  totalSales,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Products" value={totalProducts} tone="emerald" />
      <StatCard label="Low Stock" value={lowStockCount} tone="amber" />
      <StatCard label="Suppliers" value={totalSuppliers} tone="blue" />
      <StatCard label="Recent Sales" value={totalSales} tone="purple" />
    </div>
  );
}