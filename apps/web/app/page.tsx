import { apiGet } from '@/lib/api';
import { formatFecha, formatPen } from '@/lib/format';
import type { Dashboard } from '@/lib/types';
import { Card, Chip, Row } from '@/components/ui';
import { DeclareButton } from '@/components/declare-button';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const d = await apiGet<Dashboard>('/dashboard');

  return (
    <div className="space-y-4">
      <Card title="Próximo vencimiento">
        {d.nextDue ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Periodo {d.nextDue.period}</span>
              <Chip>{d.nextDue.source}</Chip>
            </div>
            <Row label="Vence" value={formatFecha(d.nextDue.dueDate)} />
            <Row label="Días restantes" value={daysLeft(d.today, d.nextDue.dueDate)} strong />
            <DeclareButton period={d.nextDue.period} />
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Sin vencimientos abiertos.</p>
        )}
      </Card>

      {d.currentPeriod && (
        <Card title={`Mes en curso (${d.currentPeriod.period})`}>
          <Row label="IGV a pagar" value={formatPen(d.currentPeriod.summary.igvPagarCents)} />
          <Row label="Pago a cuenta 3ra" value={formatPen(d.currentPeriod.summary.pagoCuentaCents)} />
          <Row label="NPS estimado" value={formatPen(d.currentPeriod.summary.npsEstimadoCents)} strong />
          {d.currentPeriod.summary.pago616Cents > 0 && (
            <Row label="F.616 (4ta)" value={formatPen(d.currentPeriod.summary.pago616Cents)} strong />
          )}
        </Card>
      )}

      <Card title="Detracciones">
        {d.detracciones.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin detracciones pendientes.</p>
        ) : (
          <ul className="space-y-2">
            {d.detracciones.map((det) => (
              <li key={det.id} className="flex items-center justify-between">
                <span className="text-sm">
                  {det.period} · {formatPen(det.amountCents)}
                  {det.depositDueDate && (
                    <span className="text-neutral-500"> · límite {formatFecha(det.depositDueDate)}</span>
                  )}
                </span>
                <Chip>{det.status}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Proyección anual — negocio (RMT)">
        <Row label="Renta neta" value={formatPen(d.projection.rentaNetaCents)} />
        <Row label="IR estimado" value={formatPen(d.projection.irEstimadoCents)} />
        <Row label="Regularización estimada" value={formatPen(d.projection.regularizacionEstimadaCents)} />
        {d.projection.gastosFaltantesParaTramo10Cents > 0 && (
          <p className="mt-2 rounded bg-amber-500/10 p-2 text-sm text-amber-300">
            Te faltan {formatPen(d.projection.gastosFaltantesParaTramo10Cents)} en gastos para quedarte
            en el tramo 10%.
          </p>
        )}
      </Card>

      <Card title="Proyección anual — RxH (4ta)">
        <Row label="Renta neta de trabajo" value={formatPen(d.projection4ta.rentaNetaTrabajoCents)} />
        <Row label="IR anual estimado" value={formatPen(d.projection4ta.irAnualCents)} />
        <Row
          label={d.projection4ta.saldoCents >= 0 ? 'Saldo por pagar' : 'Saldo a favor'}
          value={formatPen(Math.abs(d.projection4ta.saldoCents))}
          strong
        />
      </Card>

      <Card title="Últimas alertas">
        {d.recentAlerts.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin alertas.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {d.recentAlerts.map((a) => (
              <li key={a._id} className="flex justify-between gap-2">
                <span className="truncate text-neutral-300">{a.payloadPreview}</span>
                <span className="shrink-0 text-neutral-500">{formatFecha(a.sentAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function daysLeft(todayIso: string, dueIso: string): string {
  const a = new Date(`${todayIso}T00:00:00Z`).getTime();
  const b = new Date(`${dueIso.slice(0, 10)}T00:00:00Z`).getTime();
  const days = Math.round((b - a) / 86_400_000);
  if (days < 0) return `vencido hace ${-days} d`;
  if (days === 0) return 'HOY';
  return `${days} días`;
}
