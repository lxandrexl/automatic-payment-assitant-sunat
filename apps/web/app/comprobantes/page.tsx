import { apiGet } from '@/lib/api';
import { formatFecha, formatPen } from '@/lib/format';
import type { Invoice, Settings } from '@/lib/types';
import { Card, Chip } from '@/components/ui';
import { ComprobanteForm } from '@/components/comprobante-form';
import { DetraccionDeposit } from '@/components/detraccion-deposit';

export const dynamic = 'force-dynamic';

export default async function ComprobantesPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const q = searchParams.period ? `?period=${searchParams.period}` : '';
  const [invoices, settings] = await Promise.all([
    apiGet<Invoice[]>(`/invoices${q}`),
    apiGet<Settings>('/settings'),
  ]);

  return (
    <div className="space-y-4">
      <ComprobanteForm
        clients={settings.clients}
        igvRate={settings.igvRate}
        detraccionRate={settings.detraccionRate}
        detraccionThresholdCents={settings.detraccionThresholdCents}
        retencion4taRate={settings.retencion4taRate}
      />

      <Card title="Comprobantes emitidos">
        {invoices.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin comprobantes.</p>
        ) : (
          <ul className="space-y-3">
            {invoices.map((i) => (
              <li key={i._id} className="border-t border-neutral-800 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {i.kind} {i.series}-{i.number}{' '}
                    <span className="text-neutral-500">· {formatFecha(i.issueDate)}</span>
                  </span>
                  <span className="text-sm">{formatPen(i.totalCents)}</span>
                </div>
                {i.detraccion && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                    <span>Detracción {formatPen(i.detraccion.amountCents)}</span>
                    <Chip>{i.detraccion.status}</Chip>
                    {i.detraccion.status !== 'DEPOSITED' && (
                      <DetraccionDeposit invoiceId={i._id} expectedCents={i.detraccion.amountCents} />
                    )}
                  </div>
                )}
                {i.retencion && (
                  <p className="mt-1 text-xs text-neutral-400">
                    Retención 4ta {formatPen(i.retencion.amountCents)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
