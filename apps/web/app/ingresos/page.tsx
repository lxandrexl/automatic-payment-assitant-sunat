import { apiGet } from '@/lib/api';
import { formatFecha, formatPen } from '@/lib/format';
import type { IncomeYear, MonthIncome } from '@/lib/types';
import { Card, SectionTitle, Stat } from '@/components/ui';

export const dynamic = 'force-dynamic';

const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic',
];

function nombreMes(period: string): string {
  return MESES[Number(period.slice(5, 7)) - 1] ?? period;
}

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const year = searchParams.year ?? String(new Date().getFullYear());
  const data = await apiGet<IncomeYear>(`/income?year=${year}`);

  return (
    <div className="space-y-6">
      {/* Titular del año */}
      <Card tone="ok" title={`Percibido en ${year} (líquido en banco)`}>
        <div className="text-3xl font-bold text-emerald-400">
          {formatPen(data.totals.netoBancoCents)}
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Lo que realmente entró a tu cuenta bancaria. Aparte tienes{' '}
          {formatPen(data.totals.detraccionDepositoCents)} en tu cuenta de detracciones (BN).
        </p>
      </Card>

      <section>
        <SectionTitle>Resumen del año</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Emitido (facturado)" value={formatPen(data.totals.emitidoCents)} />
          <Stat label="IGV cobrado" value={formatPen(data.totals.igvCents)} hint="lo debes a SUNAT" />
          <Stat
            label="Detracciones (en BN)"
            value={formatPen(data.totals.detraccionDepositoCents)}
            hint="tuyo, solo para impuestos"
          />
          <Stat
            label="Retención 4ta"
            value={formatPen(data.totals.retencionCents)}
            hint="adelanto de tu IR"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Mes a mes</SectionTitle>
        {data.months.length === 0 ? (
          <Card>
            <p className="text-sm text-neutral-500">Sin ingresos registrados en {year}.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.months.map((m) => (
              <MonthCard key={m.period} m={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MonthCard({ m }: { m: MonthIncome }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-semibold">{nombreMes(m.period)}</span>
        <span className="text-right">
          <span className="block text-[11px] uppercase tracking-wide text-neutral-500">
            Percibido neto
          </span>
          <span className="text-xl font-semibold text-emerald-400 tabular-nums">
            {formatPen(m.netoBancoCents)}
          </span>
        </span>
      </div>

      {/* Detalle por comprobante */}
      <ul className="mt-3 space-y-2 border-t border-neutral-800 pt-3">
        {m.lines.map((l) => (
          <li key={l.id} className="text-sm">
            <div className="flex justify-between">
              <span className="font-medium">
                {l.kind === 'FACTURA' ? '🧾' : '📄'} {l.ref}
                <span className="ml-2 text-neutral-500">{formatFecha(l.issueDate)}</span>
              </span>
              <span className="font-semibold text-emerald-400 tabular-nums">
                {formatPen(l.netoBancoCents)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">
              {l.kind === 'FACTURA' ? (
                <>
                  Base {formatPen(l.baseCents)} + IGV {formatPen(l.igvCents)} = total{' '}
                  {formatPen(l.totalCents)} · detracción −{formatPen(l.detraccionDepositoCents)} (BN)
                </>
              ) : (
                <>
                  Bruto {formatPen(l.baseCents)}
                  {l.retencionCents > 0
                    ? ` · retención −${formatPen(l.retencionCents)}`
                    : ' · sin retención (no domiciliado)'}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Totales del mes */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-neutral-800 pt-3 text-center text-xs">
        <div>
          <div className="text-neutral-500">IGV</div>
          <div className="tabular-nums">{formatPen(m.igvCents)}</div>
        </div>
        <div>
          <div className="text-neutral-500">Detracción (BN)</div>
          <div className="tabular-nums">{formatPen(m.detraccionDepositoCents)}</div>
        </div>
        <div>
          <div className="text-neutral-500">Retención</div>
          <div className="tabular-nums">{formatPen(m.retencionCents)}</div>
        </div>
      </div>
    </Card>
  );
}
