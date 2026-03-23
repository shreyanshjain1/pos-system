export default function AppHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">{title}</div>
        {subtitle ? <p className="mt-2 text-sm text-stone-600">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
