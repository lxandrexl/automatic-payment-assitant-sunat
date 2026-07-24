import { apiGet } from '@/lib/api';
import { formatFecha, formatPen } from '@/lib/format';
import type { Invoice, Period, Purchase, PeriodSummary } from '@/lib/types';
import { Card, Chip, Row } from '@/components/ui';

export const dynamic = 'force-dynamic';

interface PeriodDetail extends Period {
  summary: PeriodSummary;
  invoices: Invoice[];
  purchases: Purchase[];
}

export default async function PeriodoDetalle({ params }: { params: { id: string } }) {
  const p = await apiGet<PeriodDetail>(`/periods/${params.id}`);

  return (
    <div className="space-y-4">
      <Card title={`Periodo ${p._id}`}>
        <div className="mb-2 flex items-center gap-2">
          <Chip>{p.status}</Chip>
          <Chip>{p.dueDateSource}</Chip>
          <span className="text-sm text-neutral-400">vence {formatFecha(p.dueDate)}</span>
        </div>
        <Row label="Ventas (base)" value={formatPen(p.summary.ventasBaseCents)} />
        <Row label="IGV ventas" value={formatPen(p.summary.igvVentasCents)} />
        <Row label="IGV compras" value={formatPen(p.summary.igvComprasCents)} />
        <Row label="IGV a pagar" value={formatPen(p.summary.igvPagarCents)} />
        <Row label="Saldo a favor" value={formatPen(p.summary.saldoFavorCents)} />
        <Row label="Pago a cuenta" value={formatPen(p.summary.pagoCuentaCents)} />
        <Row label="Total del mes" value={formatPen(p.summary.totalMesCents)} strong />
        <Row label="NPS estimado" value={formatPen(p.summary.npsEstimadoCents)} strong />
        {p.summary.pago616Cents > 0 && (
          <Row label="F.616 (4ta, RxH sin retención)" value={formatPen(p.summary.pago616Cents)} strong />
        )}
      </Card>

      <Card title="Comprobantes">
        {p.invoices.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin comprobantes.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {p.invoices.map((i) => (
              <li key={i._id} className="flex justify-between border-t border-neutral-800 py-1">
                <span>
                  {i.kind} {i.series}-{i.number}
                </span>
                <span>{formatPen(i.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Compras">
        {p.purchases.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin compras.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {p.purchases.map((c) => (
              <li key={c._id} className="flex justify-between border-t border-neutral-800 py-1">
                <span>
                  {c.supplierName} · {c.category}
                </span>
                <span>{formatPen(c.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
