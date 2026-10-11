import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatFechaCorta, formatPen, formatPeriodo, formatUsd } from '@/lib/format';
import type { Invoice, Settings } from '@/lib/types';
import { Card, Chip, KindTag, PageHeader, Segmented, Stat } from '@/components/ui';
import { ComprobanteForm } from '@/components/comprobante-form';
import { CompletarDolares } from '@/components/completar-dolares';
import { DetraccionDeposit } from '@/components/detraccion-deposit';
import { DrawerButton } from '@/components/drawer';
import { Paginated } from '@/components/paginated';

export const dynamic = 'force-dynamic';

const COLS = 'md:grid-cols-[6.5rem_2fr_9.5rem_1fr_1fr_1fr_1rem]';

export default async function VentasPage({
  searchParams,
}: {
  searchParams: { period?: string; kind?: string };
}) {
  const period = searchParams.period;
  const kind = searchParams.kind === 'FACTURA' || searchParams.kind === 'RXH' ? searchParams.kind : null;
  const q = period ? `?period=${period}` : '';
  const [allInvoices, settings] = await Promise.all([
    apiGet<Invoice[]>(`/invoices${q}`),
    apiGet<Settings>('/settings'),
  ]);
  const invoices = kind ? allInvoices.filter((i) => i.kind === kind) : allInvoices;
  const clientName = new Map(settings.clients.map((c) => [c._id, c.name]));
  const clientById = new Map(settings.clients.map((c) => [c._id, c]));
  // Retención hecha en el exterior (en soles, referencial): reduce lo que llega al banco, no el impuesto.
  const exterior = (i: Invoice) =>
    i.foreign ? Math.round(i.foreign.withholdingCents * i.foreign.exchangeRate) : 0;
  const neto = (i: Invoice) =>
    i.totalCents - (i.detraccion?.exactAmountCents ?? i.retencion?.amountCents ?? 0) - exterior(i);

  const sorted = [...invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const totalEmitido = invoices.reduce((a, i) => a + i.totalCents, 0);
  const totalBanco = invoices.reduce((a, i) => a + neto(i), 0);
  const detrPend = invoices.filter((i) => i.detraccion && i.detraccion.status !== 'DEPOSITED').length;

  return (
    <>
      <PageHeader
        title="Ventas"
        intro="Las facturas y recibos por honorarios que emites a tus clientes. Toca una fila para ver el detalle."
        actions={
          <DrawerButton label="Nuevo comprobante" title="Nuevo comprobante">
            <ComprobanteForm
              clients={settings.clients}
              igvRate={settings.igvRate}
              detraccionRate={settings.detraccionRate}
              detraccionThresholdCents={settings.detraccionThresholdCents}
              retencion4taRate={settings.retencion4taRate}
            />
          </DrawerButton>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          items={[
            { label: 'Todos', k: null },
            { label: 'Negocio (facturas)', k: 'FACTURA' },
            { label: 'Honorarios (recibos)', k: 'RXH' },
          ].map((o) => {
            const qs = new URLSearchParams();
            if (period) qs.set('period', period);
            if (o.k) qs.set('kind', o.k);
            return { href: `/comprobantes${qs.size ? `?${qs}` : ''}`, label: o.label, active: o.k === kind };
          })}
        />
      </div>

      {period && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="rounded-full bg-brand-soft px-3 py-1 font-medium text-brand">
            Mostrando {formatPeriodo(period)}
          </span>
          <Link href="/comprobantes" className="text-ink2 underline hover:text-brand">
            Ver todos
          </Link>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Emitido" value={formatPen(totalEmitido)} hint={`${invoices.length} comprobantes`} />
        <Stat label="Te llega al banco" value={formatPen(totalBanco)} tone="ok" hint="Sin la detracción ni la retención" />
        <Stat
          label="Detracciones por confirmar"
          value={String(detrPend)}
          tone={detrPend > 0 ? 'info' : 'neutral'}
          hint={detrPend > 0 ? 'Pide la constancia a tu cliente' : 'Todo al día'}
        />
      </div>

      <Card title={period ? `Comprobantes de ${formatPeriodo(period)}` : 'Comprobantes (el más reciente primero)'}>
        {sorted.length === 0 ? (
          <div className="py-6 text-center text-sm text-ink3">
            Todavía no registraste comprobantes. Usa <b className="text-ink">Nuevo comprobante</b> arriba.
          </div>
        ) : (
          <div className="-mx-4 -mb-4">
            <div
              className={`hidden gap-3 border-y border-line bg-page px-4 py-2 text-xs font-medium text-ink3 md:grid ${COLS}`}
            >
              <span>Fecha</span>
              <span>Documento</span>
              <span>Tipo</span>
              <span className="text-right">Total</span>
              <span className="text-right">Te llega</span>
              <span>Detracción</span>
              <span />
            </div>
            <Paginated pageSize={10} label="comprobantes" className="" footerClass="!mt-0 px-4 pb-4">
              {sorted.map((i) => (
                <details key={i._id} className="group border-b border-line last:border-b-0">
                  <summary
                    className={`grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-page [&::-webkit-details-marker]:hidden ${COLS}`}
                  >
                    <span className="hidden text-sm text-ink2 md:block">{formatFechaCorta(i.issueDate)}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">
                        {i.kind === 'FACTURA' ? 'Factura' : 'Recibo por honorarios'} {i.series}-{i.number}
                      </span>
                      <span className="block truncate text-xs text-ink3">
                        {clientName.get(i.clientId) ?? 'Cliente'}
                        <span className="md:hidden"> · {formatFechaCorta(i.issueDate)} · {i.kind === 'FACTURA' ? 'Negocio' : 'Honorarios'}</span>
                        {i.detraccion && i.detraccion.status !== 'DEPOSITED' && (
                          <span className="font-medium text-warn md:hidden"> · detracción pendiente</span>
                        )}
                      </span>
                    </span>
                    <span className="hidden md:block">
                      <KindTag kind={i.kind} />
                    </span>
                    <span className="text-right text-sm tabular-nums text-ink md:order-none">
                      {formatPen(i.totalCents)}
                    </span>
                    <span className="hidden text-right text-sm font-medium tabular-nums text-ok md:block">
                      {formatPen(neto(i))}
                    </span>
                    <span className="hidden md:block">
                      {i.detraccion ? <Chip>{i.detraccion.status}</Chip> : <span className="text-xs text-ink3">No aplica</span>}
                    </span>
                    <span aria-hidden className="hidden text-ink3 transition group-open:rotate-90 md:block">
                      ›
                    </span>
                  </summary>
                  <div className="grid gap-x-10 gap-y-4 bg-page px-4 py-4 text-sm sm:grid-cols-2 lg:max-w-4xl">
                    <dl className="space-y-1.5">
                      <D k="Base (sin IGV)" v={formatPen(i.baseCents)} />
                      <D k="IGV" v={formatPen(i.igvCents)} />
                      <D k="Total" v={formatPen(i.totalCents)} strong />
                      {i.foreign && (
                        <>
                          <D k="Bruto en dólares" v={formatUsd(i.foreign.grossCents)} />
                          <D k="Tipo de cambio usado" v={i.foreign.exchangeRate.toFixed(3)} />
                          <D k="Retención en el exterior" v={`− ${formatUsd(i.foreign.withholdingCents)}`} />
                        </>
                      )}
                      {i.detraccion && (
                        <D k="Detracción (al Banco de la Nación)" v={`− ${formatPen(i.detraccion.exactAmountCents)}`} />
                      )}
                      {i.retencion && <D k="Retención del cliente" v={`− ${formatPen(i.retencion.amountCents)}`} />}
                      <D
                        k="Te llega al banco"
                        v={
                          i.foreign
                            ? `${formatUsd(i.foreign.grossCents - i.foreign.withholdingCents)} ≈ ${formatPen(neto(i))}`
                            : formatPen(neto(i))
                        }
                        strong
                      />
                    </dl>
                    <div className="space-y-2">
                      {i.foreign?.rateInfo && (
                        <p className="text-xs text-ink3">
                          {i.foreign.rateInfo.source === 'MANUAL'
                            ? 'Tipo de cambio escrito a mano.'
                            : `Tipo de cambio: ${i.foreign.rateInfo.source}, promedio ${i.foreign.rateInfo.kind} de ${i.foreign.rateInfo.dates.map((d, k) => `${formatFechaCorta(d).replace(/ \d{4}$/, '')} (${i.foreign?.rateInfo?.values[k]?.toFixed(3)})`).join(', ')}${i.foreign.rateInfo.provisional ? ' · provisional' : ''}.`}
                        </p>
                      )}
                      {i.kind === 'RXH' && !i.foreign && clientById.get(i.clientId)?.currency === 'USD' && (
                        <div className="rounded-lg bg-warn-soft p-3 text-xs text-warn">
                          <p className="mb-2">Este recibo está solo en soles, pero a este cliente le cobras en dólares.</p>
                          <CompletarDolares
                            invoiceId={i._id}
                            issueDate={i.issueDate}
                            retencionExteriorRate={clientById.get(i.clientId)?.retencionExteriorRate ?? 0}
                          />
                        </div>
                      )}
                      {i.detraccion ? (
                        <>
                          <p className="text-ink2">
                            Plazo del depósito: <b className="text-ink">{formatFechaCorta(i.detraccion.depositDueDate)}</b>
                          </p>
                          {i.detraccion.status === 'DEPOSITED' ? (
                            <p className="text-ok">
                              Depositada · constancia {i.detraccion.constanciaNumber ?? '—'}
                            </p>
                          ) : (
                            <DetraccionDeposit invoiceId={i._id} expectedCents={i.detraccion.amountCents} />
                          )}
                        </>
                      ) : (
                        <p className="text-ink3">Este comprobante no lleva detracción.</p>
                      )}
                    </div>
                  </div>
                </details>
              ))}
            </Paginated>
          </div>
        )}
      </Card>
    </>
  );
}

function D({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-line pt-1.5 font-semibold text-ink' : 'text-ink2'}`}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
