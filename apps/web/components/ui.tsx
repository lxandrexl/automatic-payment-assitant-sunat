import Link from 'next/link';

export type Tone = 'neutral' | 'ok' | 'warn' | 'urgent' | 'info';

const TONE_CARD: Record<Tone, string> = {
  neutral: 'border-neutral-800 bg-neutral-900',
  ok: 'border-emerald-500/25 bg-emerald-500/[0.06]',
  warn: 'border-amber-500/30 bg-amber-500/[0.06]',
  urgent: 'border-red-500/40 bg-red-500/[0.08]',
  info: 'border-sky-500/25 bg-sky-500/[0.06]',
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-neutral-100',
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  urgent: 'text-red-400',
  info: 'text-sky-400',
};

/** Semáforo por días restantes hasta un vencimiento. */
export function urgencyTone(days: number): Tone {
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'warn';
  return 'ok';
}

export function Card({
  title,
  action,
  tone = 'neutral',
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border p-4 ${TONE_CARD[tone]}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
      {children}
    </h2>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className={`tabular-nums ${strong ? 'text-lg font-semibold' : 'text-sm'}`}>{value}</span>
    </div>
  );
}

/** Tile con etiqueta arriba y número grande abajo. */
export function Stat({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-neutral-500">{hint}</div>}
    </div>
  );
}

// Etiquetas humanas para los estados (antes se veían crudos: OPEN, PENDING…).
const CHIP_LABEL: Record<string, string> = {
  OPEN: 'Abierto',
  DECLARED: 'Declarado',
  PAID: 'Pagado',
  OFFICIAL: 'Fecha oficial',
  ESTIMATED: 'Fecha estimada',
  PENDING: 'Pendiente',
  OVERDUE: 'Vencida',
  DEPOSITED: 'Depositada',
};

const CHIP_CLS: Record<string, string> = {
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
  const cls = CHIP_CLS[children] ?? 'bg-neutral-700/40 text-neutral-300';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {CHIP_LABEL[children] ?? children}
    </span>
  );
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

// --- Formularios ---
export const inputCls =
  'w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none transition focus:border-emerald-500';

export function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="mb-1 block text-xs text-neutral-400">{label}</span>
      {children}
    </label>
  );
}
