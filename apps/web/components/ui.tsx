import Link from 'next/link';

export type Tone = 'neutral' | 'ok' | 'warn' | 'urgent' | 'info';

const TONE_CARD: Record<Tone, string> = {
  neutral: 'border-line bg-surface',
  ok: 'border-line border-l-4 border-l-ok',
  warn: 'border-line border-l-4 border-l-warn',
  urgent: 'border-line border-l-4 border-l-bad',
  info: 'border-line border-l-4 border-l-info',
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-ink',
  ok: 'text-ok',
  warn: 'text-warn',
  urgent: 'text-bad',
  info: 'text-info',
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
    <section className={`rounded-2xl border bg-surface p-4 shadow-sm ${TONE_CARD[tone]}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
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
    <h2 className="mb-2 px-1 text-sm font-semibold text-ink2">{children}</h2>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm text-ink2">{label}</span>
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
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-ink2">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs leading-snug text-ink3">{hint}</div>}
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
  FACTURA: 'Factura',
  RXH: 'Recibo por honorarios',
};

const CHIP_CLS: Record<string, string> = {
  OPEN: 'bg-warn-soft text-warn',
  DECLARED: 'bg-info-soft text-info',
  PAID: 'bg-ok-soft text-ok',
  OFFICIAL: 'bg-ok-soft text-ok',
  ESTIMATED: 'bg-warn-soft text-warn',
  PENDING: 'bg-warn-soft text-warn',
  OVERDUE: 'bg-bad-soft text-bad',
  DEPOSITED: 'bg-ok-soft text-ok',
};

export function Chip({ children }: { children: string }) {
  const cls = CHIP_CLS[children] ?? 'bg-sunken text-ink2';
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
      className="rounded-lg bg-sunken px-3 py-1.5 text-sm text-ink hover:bg-line"
    >
      {children}
    </Link>
  );
}

// --- Formularios ---
export const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand';

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
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

/**
 * Cabecera de página: migas/volver arriba, título, explicación y acción principal
 * a la derecha (patrón Stripe/Mercury: la acción más usada siempre en el mismo lugar).
 */
export function PageHeader({
  title,
  intro,
  back,
  actions,
  badge,
}: {
  title: string;
  intro?: string;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <header className="mb-6 lg:mb-8">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink2 hover:text-brand"
        >
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-[1.75rem]">{title}</h1>
            {badge}
          </div>
          {intro && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink2">{intro}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Selector segmentado por links (p. ej. años): navegable, sin JS. */
export function Segmented({
  items,
}: {
  items: { href: string; label: string; active?: boolean }[];
}) {
  return (
    <div className="inline-flex rounded-lg bg-sunken p-0.5 text-sm">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`rounded-md px-3 py-1.5 font-medium ${
            i.active ? 'bg-surface text-ink shadow-sm' : 'text-ink2 hover:text-ink'
          }`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

/** Enlace "Ver detalle →" discreto para tarjetas. */
export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-brand hover:underline">
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

/** Botón principal en forma de link. */
export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
    >
      {children}
    </Link>
  );
}

/** Explicación plegable "¿Qué es esto?" — nativo, sin JS. */
export function Explain({ summary = '¿Qué significa esto?', children }: { summary?: string; children: React.ReactNode }) {
  return (
    <details className="group mt-3 rounded-lg bg-page px-3 py-2 text-xs text-ink2">
      <summary className="cursor-pointer select-none text-ink2 marker:text-ink3">{summary}</summary>
      <div className="mt-2 space-y-1 leading-relaxed">{children}</div>
    </details>
  );
}

/**
 * Etiqueta de la fuente de ingreso. Siempre el mismo color en toda la app:
 * azul = negocio (facturas, 3.ª categoría), verde azulado = honorarios (RxH, 4.ª).
 */
export function KindTag({ kind, long }: { kind: 'FACTURA' | 'RXH'; long?: boolean }) {
  const f = kind === 'FACTURA';
  const text = f
    ? long ? 'Negocio · Facturas (3.ª categoría)' : 'Negocio'
    : long ? 'Honorarios · Recibos (4.ª categoría)' : 'Honorarios';
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        f ? 'bg-brand-soft text-brand' : 'bg-hono-soft text-hono'
      }`}
    >
      {text}
    </span>
  );
}
