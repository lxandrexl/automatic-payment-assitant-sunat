import Link from 'next/link';

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      {title && <h2 className="mb-3 text-sm font-semibold text-neutral-400">{title}</h2>}
      {children}
    </section>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className={strong ? 'text-lg font-semibold' : 'text-sm'}>{value}</span>
    </div>
  );
}

const CHIP: Record<string, string> = {
  OPEN: 'bg-amber-500/15 text-amber-400',
  DECLARED: 'bg-sky-500/15 text-sky-400',
  PAID: 'bg-emerald-500/15 text-emerald-400',
  OFFICIAL: 'bg-emerald-500/15 text-emerald-400',
  ESTIMATED: 'bg-amber-500/15 text-amber-400',
  PENDING: 'bg-amber-500/15 text-amber-400',
  OVERDUE: 'bg-red-500/15 text-red-400',
  DEPOSITED: 'bg-emerald-500/15 text-emerald-400',
};

export function Chip({ children }: { children: string }) {
  const cls = CHIP[children] ?? 'bg-neutral-700/40 text-neutral-300';
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
    >
      {children}
    </Link>
  );
}
