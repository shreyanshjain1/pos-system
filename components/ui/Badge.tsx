export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">{children}</span>;
}
