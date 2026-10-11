import { todayLimaIso } from '@tributo/core';
import { apiGet } from '@/lib/api';
import { formatFechaCorta, formatPen, formatPeriodo, formatUsd } from '@/lib/format';
import type { IncomeYear, MonthIncome } from '@/lib/types';
import { Card, KindTag, PageHeader, Segmented, Stat } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const current = Number(todayLimaIso().slice(0, 4));
  const year = Number(searchParams.year ?? current);
  const data = await apiGet<IncomeYear>(`/income?year=${year}`);
  const months = [...data.months].sort((a, b) => b.period.localeCompare(a.period));

  return (
    <>
      <PageHeader
        title="Ingresos"
        intro="Cuánto facturaste y cuánto llegó realmente a tu banco, mes por mes."
        actions={
          <Segmented
            items={[year - 1, year, year + 1].map((y) => ({
              href: `/ingresos?year=${y}`,
              label: String(y),
              active: y === year,
            }))}
          />
        }
      />

      <Card tone="ok">
        <div className="text-sm font-medium text-ink2">Llegó a tu banco en {year}</div>
        <div className="mt-1 text-4xl font-bold tracking-tight tabular-nums text-ink">
          {formatPen(data.totals.netoBancoCents)}
        </div>
        <p className="mt-2 text-sm text-ink2">
          Aparte tienes {formatPen(data.totals.detraccionDepositoCents)} en tu cuenta de detracciones
          (Banco de la Nación): es tuyo, pero solo sirve para pagar impuestos.
        </p>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Facturado" value={formatPen(data.totals.emitidoCents)} hint="Total emitido" />
        <Stat label="IGV cobrado" value={formatPen(data.totals.igvCents)} hint="Lo debes a SUNAT" />
        <Stat label="Detracciones" value={formatPen(data.totals.detraccionDepositoCents)} hint="En el Banco de la Nación" />
        <Stat label="Retenciones" value={formatPen(data.totals.retencionCents)} hint="Adelanto de tu impuesto" />
      </div>

      <h2 className="mb-3 mt-8 text-base font-semibold text-ink">Mes a mes</h2>
      {months.length === 0 ? (
        <Card>
          <p className="py-4 text-center text-sm text-ink3">Sin ingresos registrados en {year}.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {months.map((m, idx) => (
            <Month key={m.period} m={m} open={idx === 0} />
          ))}
        </div>
      )}
    </>
  );
}

function Month({ m, open }: { m: MonthIncome; open: boolean }) {
  return (
    <details open={open} className="group rounded-2xl border border-line bg-surface shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-ink3 transition group-open:rotate-90">
            ›
          </span>
          <span className="text-sm font-semibold text-ink">{formatPeriodo(m.period)}</span>
          <span className="text-xs text-ink3">· {m.lines.length} comprobantes</span>
        </span>
        <span className="text-right">
          <span className="block text-xs text-ink3">Llegó al banco</span>
          <span className="text-lg font-semibold tabular-nums text-ink">{formatPen(m.netoBancoCents)}</span>
        </span>
      </summary>
      <div className="border-t border-line">
        <ul className="divide-y divide-line">
          {m.lines.map((l) => (
            <li key={l.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_auto] sm:gap-4">
              <div>
                <div className="font-medium text-ink">
                  {l.kind === 'FACTURA' ? 'Factura' : 'Recibo por honorarios'} {l.ref}
                  <span className="ml-2 font-normal text-ink3">{formatFechaCorta(l.issueDate)}</span>
                  <span className="ml-2 align-middle">
                    <KindTag kind={l.kind} />
                  </span>
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-ink3">
                  {l.kind === 'FACTURA'
                    ? `Base ${formatPen(l.baseCents)} + IGV ${formatPen(l.igvCents)} = ${formatPen(l.totalCents)} · detracción − ${formatPen(l.detraccionDepositoCents)}`
                    : l.retencionCents > 0
                      ? `Bruto ${formatPen(l.baseCents)} · retención − ${formatPen(l.retencionCents)}`
                      : l.foreign
                        ? `Bruto ${formatUsd(l.foreign.grossCents)} (declaras ${formatPen(l.baseCents)}) · retención en el exterior − ${formatUsd(l.foreign.withholdingCents)} · llegan ${formatUsd(l.foreign.grossCents - l.foreign.withholdingCents)}`
                        : `Bruto ${formatPen(l.baseCents)} · sin retención (cliente no domiciliado)`}
                </div>
              </div>
              <div className="font-semibold tabular-nums text-ink sm:text-right">{formatPen(l.netoBancoCents)}</div>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-3 gap-2 rounded-b-2xl bg-page px-4 py-3 text-xs">
          <T k="IGV del mes" v={formatPen(m.igvCents)} />
          <T k="Detracción (BN)" v={formatPen(m.detraccionDepositoCents)} />
          <T k="Retención" v={formatPen(m.retencionCents)} />
        </div>
      </div>
    </details>
  );
}

function T({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-ink3">{k}</div>
      <div className="font-medium tabular-nums text-ink">{v}</div>
    </div>
  );
}
