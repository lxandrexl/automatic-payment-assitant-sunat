import Link from 'next/link';
import { getDueDate, getRentaAnualDueDate, suggestedPayDate, todayLimaIso } from '@tributo/core';
import { apiGet } from '@/lib/api';
import { formatFecha } from '@/lib/format';
import type { Period, Settings } from '@/lib/types';
import { Card, Chip, SectionTitle, type Tone } from '@/components/ui';

export const dynamic = 'force-dynamic';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function daysBetween(todayIso: string, dueIso: string): number {
  const a = new Date(`${todayIso}T00:00:00Z`).getTime();
  const b = new Date(`${dueIso.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function daysLabel(days: number): string {
  if (days < 0) return `hace ${-days} d`;
  if (days === 0) return 'HOY';
  if (days === 1) return 'mañana';
  return `en ${days} d`;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const today = todayLimaIso();
  const year = Number(searchParams.year ?? today.slice(0, 4));
  const [periods, settings] = await Promise.all([
    apiGet<Period[]>(`/periods?year=${year}`),
    apiGet<Settings>('/settings'),
  ]);
  const digit = settings.rucLastDigit;
  const byId = new Map(periods.map((p) => [p._id, p]));

  const meses = Array.from({ length: 12 }, (_, i) => {
    const period = `${year}-${String(i + 1).padStart(2, '0')}`;
    const due = getDueDate(period, digit);
    return { period, monthIdx: i, due, existing: byId.get(period) };
  });

  // El próximo vencimiento (mensual) a resaltar.
  const proximo = meses.find((m) => {
    const st = m.existing?.status;
    return m.due.date >= today && st !== 'PAID' && st !== 'DECLARED';
  });

  // DJ Anual: la próxima que realmente te toca (ejercicio en curso o el que cierra).
  const ejercicio = getRentaAnualDueDate(year - 1, digit).date >= today ? year - 1 : year;
  const dj = getRentaAnualDueDate(ejercicio, digit);

  return (
    <div className="space-y-6">
      <Card title="Calendario tributario">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{year}</span>
          <div className="flex gap-1 text-sm">
            <Link href={`/calendario?year=${year - 1}`} className="rounded-lg bg-neutral-800 px-3 py-1.5 hover:bg-neutral-700">
              ← {year - 1}
            </Link>
            <Link href={`/calendario?year=${year + 1}`} className="rounded-lg bg-neutral-800 px-3 py-1.5 hover:bg-neutral-700">
              {year + 1} →
            </Link>
          </div>
        </div>
      </Card>

      <section>
        <SectionTitle>Declaración mensual (F.621 / F.616)</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-neutral-800">
          {meses.map((m) => {
            const st = monthStatus(m.existing?.status, m.due.date, today);
            const esProximo = proximo?.period === m.period;
            const noAplica = !m.existing && m.due.date < today;
            return (
              <RowLink
                key={m.period}
                href={m.existing ? `/periodos/${m.period}` : `/comprobantes?period=${m.period}`}
                highlight={esProximo}
              >
                <div className="min-w-0">
                  <div className={`text-sm font-medium ${noAplica ? 'text-neutral-600' : ''}`}>
                    {MESES[m.monthIdx]}
                  </div>
                  <div className="text-xs text-neutral-500">
                    vence {formatFecha(m.due.date)}
                    {m.due.source === 'ESTIMATED' && ' · estimada'}
                  </div>
                  {!noAplica && (
                    <div className="text-xs text-emerald-500/80">
                      💡 pagar antes del {formatFecha(suggestedPayDate(m.due.date))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-right">
                  {!noAplica && (
                    <span className="text-xs text-neutral-400">{daysLabel(daysBetween(today, m.due.date))}</span>
                  )}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
              </RowLink>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Declaración Jurada Anual</SectionTitle>
        <Card tone="info">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Ejercicio {ejercicio}</div>
              <div className="text-sm text-neutral-400">
                vence {formatFecha(dj.date)} · {daysLabel(daysBetween(today, dj.date))}
              </div>
            </div>
            <Chip>{dj.source}</Chip>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Regulariza el IR de 3ra y 4ta. Cronograma MYPE/PN (plazo ampliado, mayo/junio).
          </p>
        </Card>
      </section>

      <p className="px-1 text-xs text-neutral-600">
        Las detracciones vencen el 5.º día hábil del mes siguiente a cada factura (o la fecha de
        pago, lo que ocurra primero). Se listan por comprobante en Emitir e Inicio.
      </p>
    </div>
  );
}

function monthStatus(
  status: string | undefined,
  dueIso: string,
  today: string,
): { label: string; cls: string } {
  if (status === 'PAID') return { label: 'Pagado', cls: 'bg-emerald-500/15 text-emerald-400' };
  if (status === 'DECLARED') return { label: 'Declarado', cls: 'bg-sky-500/15 text-sky-400' };
  if (status === 'OPEN') {
    const d = daysBetween(today, dueIso);
    const tone: Tone = d < 0 ? 'urgent' : d <= 3 ? 'urgent' : d <= 7 ? 'warn' : 'ok';
    const cls =
      tone === 'urgent'
        ? 'bg-red-500/15 text-red-400'
        : tone === 'warn'
          ? 'bg-amber-500/15 text-amber-400'
          : 'bg-amber-500/15 text-amber-400';
    return { label: d < 0 ? 'Vencido' : 'Pendiente', cls };
  }
  if (dueIso < today) return { label: '—', cls: 'bg-neutral-800 text-neutral-600' };
  return { label: 'Próximo', cls: 'bg-neutral-700/40 text-neutral-300' };
}

function RowLink({
  href,
  highlight,
  children,
}: {
  href: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3 last:border-b-0 ${
        highlight ? 'bg-emerald-500/[0.06]' : 'hover:bg-neutral-900'
      }`}
    >
      {children}
    </Link>
  );
}
