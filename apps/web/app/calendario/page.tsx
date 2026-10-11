import Link from 'next/link';
import { getDueDate, getRentaAnualDueDate, suggestedPayDate, todayLimaIso } from '@tributo/core';
import { apiGet } from '@/lib/api';
import {
  diasHasta,
  diasLabel,
  formatFechaCorta,
  formatPen,
  formatPeriodo,
} from '@/lib/format';
import type { Period, Settings } from '@/lib/types';
import { Card, Chip, PageHeader, Segmented } from '@/components/ui';

export const dynamic = 'force-dynamic';

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
    return { period, due, existing: byId.get(period) };
  });

  // El próximo vencimiento pendiente es el que se resalta.
  const proximo = meses.find((m) => {
    const st = m.existing?.status;
    return m.due.date >= today && st !== 'PAID' && st !== 'DECLARED';
  });

  const ejercicio = getRentaAnualDueDate(year - 1, digit).date >= today ? year - 1 : year;
  const dj = getRentaAnualDueDate(ejercicio, digit);

  return (
    <>
      <PageHeader
        title="Calendario"
        intro="Cada mes presentas una declaración a SUNAT. Toca un mes para ver cuánto pagas y cómo declararlo."
        actions={
          <Segmented
            items={[year - 1, year, year + 1].map((y) => ({
              href: `/calendario?year=${y}`,
              label: String(y),
              active: y === year,
            }))}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2"><Card title="Declaraciones mensuales">
          <div className="-mx-4 -mb-4 overflow-hidden rounded-b-2xl lg:col-span-2">
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 border-y border-line bg-page px-4 py-2 text-xs font-medium text-ink3 md:grid">
              <span>Mes</span>
              <span>Vence</span>
              <span>Pagar antes del</span>
              <span>Monto</span>
              <span className="w-24 text-right">Estado</span>
            </div>
            {meses.map((m) => {
              const st = monthStatus(m.existing, m.due.date, today);
              const esProximo = proximo?.period === m.period;
              const pasado = !m.existing && m.due.date < today;
              const monto = m.existing?.summary?.npsEstimadoCents;
              return (
                <Link
                  key={m.period}
                  href={m.existing ? `/periodos/${m.period}` : `/comprobantes?period=${m.period}`}
                  className={`group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-line px-4 py-3 last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] ${
                    esProximo ? 'bg-brand-soft/60' : 'hover:bg-page'
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${pasado ? 'text-ink3' : 'text-ink'}`}>
                      {formatPeriodo(m.period).split(' ')[0]}
                      {esProximo && (
                        <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                          Siguiente
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink3 md:hidden">
                      vence {formatFechaCorta(m.due.date)}
                      {m.existing?.status === 'OPEN' && ` · ${diasLabel(diasHasta(today, m.due.date))}`}
                    </div>
                  </div>
                  <div className="hidden text-sm text-ink2 md:block">
                    {formatFechaCorta(m.due.date)}
                    {m.due.source === 'ESTIMATED' && <span className="text-ink3"> (est.)</span>}
                    {m.existing?.status === 'OPEN' && (
                      <span className="block text-xs text-ink3">{diasLabel(diasHasta(today, m.due.date))}</span>
                    )}
                  </div>
                  <div className="hidden text-sm text-ink2 md:block">
                    {pasado ? '—' : formatFechaCorta(suggestedPayDate(m.due.date))}
                  </div>
                  <div className="hidden text-sm tabular-nums text-ink md:block">
                    {monto != null ? formatPen(monto) : '—'}
                  </div>
                  <div className="flex items-center justify-end gap-2 md:w-24">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    <span aria-hidden className="text-ink3 group-hover:text-brand md:hidden">›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
        </div>

        <div className="space-y-6">
          <Card title="Declaración anual de renta" action={<Chip>{dj.source}</Chip>}>
            <div className="text-lg font-semibold text-ink">Año {ejercicio}</div>
            <div className="text-sm text-ink2">
              {formatFechaCorta(dj.date)} · {diasLabel(diasHasta(today, dj.date))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink3">
              Una vez al año ajustas el impuesto a la renta de tu negocio y de tus honorarios
              (normalmente mayo o junio).
            </p>
          </Card>
          <Card title="Detracciones">
            <p className="text-xs leading-relaxed text-ink3">
              Vencen el 5.º día hábil del mes siguiente a cada factura (o la fecha de pago, lo que
              ocurra primero). Las ves por comprobante en Ventas.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function monthStatus(
  period: Period | undefined,
  dueIso: string,
  today: string,
): { label: string; cls: string } {
  const status = period?.status;
  if (status === 'PAID') return { label: 'Pagado', cls: 'bg-ok-soft text-ok' };
  if (status === 'DECLARED') return { label: 'Declarado', cls: 'bg-info-soft text-info' };
  if (status === 'OPEN') {
    const d = diasHasta(today, dueIso);
    if (period?.f621Payment || period?.f616Payment) {
      // F.621 y F.616 se pagan por separado: mostrar cuál falta.
      const falta = period.f621Payment ? 'Falta F.616' : 'Falta F.621';
      return { label: falta, cls: d < 0 ? 'bg-bad-soft text-bad' : 'bg-info-soft text-info' };
    }
    if (d < 0) return { label: 'Vencido', cls: 'bg-bad-soft text-bad' };
    return { label: 'Pendiente', cls: d <= 3 ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn' };
  }
  if (dueIso < today) return { label: 'Sin datos', cls: 'bg-sunken text-ink3' };
  return { label: 'Próximo', cls: 'bg-sunken text-ink2' };
}
