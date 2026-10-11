import Link from 'next/link';
import { suggestedPayDate, todayLimaIso } from '@tributo/core';
import { apiGet } from '@/lib/api';
import {
  diasHasta,
  diasLabel,
  formatFechaCorta,
  formatPen,
  formatPeriodo,
  formatUsd,
} from '@/lib/format';
import type { Invoice, Period, PeriodSummary, Purchase, Settings } from '@/lib/types';
import { Card, Chip, Explain, KindTag, MoreLink, PageHeader } from '@/components/ui';
import { FormPaymentBox } from '@/components/form-payment';

export const dynamic = 'force-dynamic';

interface PeriodDetail extends Period {
  summary: PeriodSummary;
  invoices: Invoice[];
  purchases: Purchase[];
}

export default async function PeriodoDetalle({ params }: { params: { id: string } }) {
  const [p, settings, all] = await Promise.all([
    apiGet<PeriodDetail>(`/periods/${params.id}`),
    apiGet<Settings>('/settings'),
    apiGet<Period[]>(`/periods?year=${params.id.slice(0, 4)}`).catch(() => [] as Period[]),
  ]);
  const ids = all.map((x) => x._id).sort();
  const i = ids.indexOf(p._id);
  const prev = i > 0 ? ids[i - 1] : null;
  const next = i >= 0 && i < ids.length - 1 ? ids[i + 1] : null;

  const s = p.summary;
  const days = diasHasta(todayLimaIso(), p.dueDate);
  const open = p.status === 'OPEN';

  const facturas = p.invoices.filter((x) => x.kind === 'FACTURA');
  const recibos = p.invoices.filter((x) => x.kind === 'RXH');
  const retenido = recibos.reduce((a, x) => a + (x.retencion?.amountCents ?? 0), 0);
  const adelanto8 = Math.round(s.rxhBrutoCents * settings.retencion4taRate);
  // Cada formulario se paga por separado: lo pendiente es lo que aún no tiene pago registrado.
  const pend621 = p.f621Payment ? 0 : s.npsEstimadoCents;
  const pend616 = p.f616Payment ? 0 : s.pago616Cents;
  const faltaPagar = pend621 + pend616;
  const falta621 = !p.f621Payment && p.status !== 'PAID';
  const falta616 = !p.f616Payment && s.pago616Cents > 0 && p.status !== 'PAID';
  const totalSunat = s.npsEstimadoCents + s.pago616Cents;

  return (
    <>
      <PageHeader
        back={{ href: '/calendario', label: 'Calendario' }}
        title={`Declaración de ${formatPeriodo(p._id)}`}
        intro={`Vence el ${formatFechaCorta(p.dueDate)}${open ? ` · ${diasLabel(days)}` : ''}`}
        badge={<Chip>{p.status}</Chip>}
        actions={
          <>
            {prev && (
              <Link href={`/periodos/${prev}`} className="rounded-lg bg-sunken px-3 py-2 text-sm hover:bg-line">
                ‹ {formatPeriodo(prev).split(' ')[0]}
              </Link>
            )}
            {next && (
              <Link href={`/periodos/${next}`} className="rounded-lg bg-sunken px-3 py-2 text-sm hover:bg-line">
                {formatPeriodo(next).split(' ')[0]} ›
              </Link>
            )}
          </>
        }
      />

      {/* Resumen: dos pagos distintos, uno por cada fuente de ingreso */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          tag={<KindTag kind="FACTURA" />}
          title="Declaración F.621"
          value={formatPen(s.npsEstimadoCents)}
          hint={p.f621Payment ? `Pagado el ${formatFechaCorta(p.f621Payment.paidAt)}` : 'IGV + adelanto de renta de tus facturas'}
        />
        <Tile
          tag={<KindTag kind="RXH" />}
          title="Declaración F.616"
          value={formatPen(s.pago616Cents)}
          hint={
            p.f616Payment
              ? `Pagado el ${formatFechaCorta(p.f616Payment.paidAt)}`
              : s.pago616Cents > 0
              ? 'Adelanto de renta de tus recibos sin retención'
              : s.rxhBrutoCents > 0
                ? 'Tus clientes ya retuvieron: no pagas nada'
                : 'No emitiste recibos este mes'
          }
        />
        <Tile
          title="Falta pagar a SUNAT"
          value={formatPen(faltaPagar)}
          hint={faltaPagar === 0 ? `Todo pagado (total del mes ${formatPen(totalSunat)})` : `De ${formatPen(totalSunat)} en total este mes`}
          strong
        />
      </div>

      {/* Qué hacer + fechas */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <Card title={falta621 || falta616 ? 'Qué hacer' : 'Estado'}>
            {falta621 || falta616 ? (
              <ol className="space-y-3 text-sm text-ink2">
                {falta621 && (
                  <Step n={1}>
                    Presenta el <b className="text-ink">F.621</b> (negocio) en SUNAT Operaciones en Línea y
                    págalo: <b className="text-ink">{formatPen(s.npsEstimadoCents)}</b>.
                  </Step>
                )}
                {falta616 && (
                  <Step n={falta621 ? 2 : 1}>
                    Presenta el <b className="text-ink">F.616</b> (honorarios) y págalo:{' '}
                    <b className="text-ink">{formatPen(s.pago616Cents)}</b>.
                  </Step>
                )}
                <Step n={(falta621 ? 1 : 0) + (falta616 ? 1 : 0) + 1}>
                  Hazlo antes del{' '}
                  <b className="text-ink">{formatFechaCorta(suggestedPayDate(p.dueDate))}</b> y registra cada pago
                  en su tarjeta, más abajo.
                </Step>
              </ol>
            ) : (
              <p className="text-sm text-ink2">
                Este mes ya está <b className="text-ink">{p.status === 'PAID' ? 'pagado' : 'al día'}</b>: no
                tienes nada pendiente con SUNAT.
              </p>
            )}
          </Card>
        </div>
        <Card title="Fechas">
          <dl className="space-y-2 text-sm">
            <Fecha k="Vencimiento" v={formatFechaCorta(p.dueDate)} />
            <Fecha k="Conviene pagar antes del" v={formatFechaCorta(suggestedPayDate(p.dueDate))} />
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink2">Tipo de fecha</dt>
              <dd>
                <Chip>{p.dueDateSource}</Chip>
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Cada fuente de ingreso, por separado */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* NEGOCIO */}
        <div className="space-y-6">
          <Card title="Cálculo del F.621" action={<KindTag kind="FACTURA" long />}>
            <dl className="text-sm">
              <Line label="Facturado en el mes (sin IGV)" value={formatPen(s.ventasBaseCents)} muted />
              <Line label="IGV cobrado en tus facturas" value={formatPen(s.igvVentasCents)} sign="+" />
              <Line label="IGV pagado en tus compras" value={formatPen(s.igvComprasCents)} sign="−" />
              {s.saldoFavorCents > 0 && (
                <Line label="Saldo a favor del mes anterior" value={formatPen(s.saldoFavorCents)} sign="−" />
              )}
              <Line label="IGV a pagar" value={formatPen(s.igvPagarCents)} total />
              <Line label="Adelanto de renta (1% de lo facturado)" value={formatPen(s.pagoCuentaCents)} sign="+" />
              <Line label="Total del mes" value={formatPen(s.totalMesCents)} total />
              <Line label="Detracciones disponibles en el Banco de la Nación" value={formatPen(s.detrDisponibleEstimadaCents)} sign="−" />
              <Line label="Pagas de tu bolsillo (F.621)" value={formatPen(s.npsEstimadoCents)} final />
            </dl>
            <FormPaymentBox period={p._id} form="f621" expectedCents={s.npsEstimadoCents} payment={p.f621Payment ?? null} />
            <Explain summary="¿Por qué resto las detracciones?">
              <p>
                El dinero de detracciones que tienes en el Banco de la Nación solo sirve para pagar
                impuestos. SUNAT lo usa primero, y lo que falta lo pagas tú.
              </p>
            </Explain>
          </Card>

          <ListCard
            title={`Facturas emitidas (${facturas.length})`}
            href={`/comprobantes?period=${p._id}&kind=FACTURA`}
            empty="No emitiste facturas este mes."
          >
            {facturas.map((x) => (
              <Item key={x._id} main={`Factura ${x.series}-${x.number}`} sub={formatFechaCorta(x.issueDate)} amount={formatPen(x.totalCents)} />
            ))}
          </ListCard>

          <ListCard
            title={`Compras (${p.purchases.length})`}
            href={`/compras?period=${p._id}`}
            empty="No registraste compras este mes."
          >
            {p.purchases.map((c) => (
              <Item key={c._id} main={c.supplierName} sub={`${formatFechaCorta(c.issueDate)} · ${c.concept || c.category}`} amount={formatPen(c.totalCents)} />
            ))}
          </ListCard>
        </div>

        {/* HONORARIOS */}
        <div className="space-y-6">
          <Card title="Cálculo del F.616" action={<KindTag kind="RXH" long />}>
            {s.rxhBrutoCents === 0 ? (
              <p className="text-sm text-ink2">
                No emitiste recibos por honorarios este mes, así que no hay nada que pagar por este
                lado.
              </p>
            ) : (
              <dl className="text-sm">
                <Line label="Recibos emitidos este mes (bruto)" value={formatPen(s.rxhBrutoCents)} muted />
                <Line label={`Adelanto de renta (${Math.round(settings.retencion4taRate * 100)}% del bruto)`} value={formatPen(adelanto8)} total />
                <Line label="Ya retenido por tus clientes" value={formatPen(retenido)} sign="−" />
                <Line label="Pagas tú (F.616)" value={formatPen(s.pago616Cents)} final />
              </dl>
            )}
            {(s.rxhBrutoCents > 0 || p.f616Payment) && (
              <FormPaymentBox period={p._id} form="f616" expectedCents={s.pago616Cents} payment={p.f616Payment ?? null} />
            )}
            <Explain summary="¿Cuándo pago yo y cuándo ya lo pagó mi cliente?">
              <p>
                Si tu cliente es peruano y te retiene el 8%, él lo paga a SUNAT por ti: no debes
                nada más. Si no te retiene (por ejemplo, un cliente del exterior), ese 8% lo pagas tú
                con el F.616.
              </p>
            </Explain>
          </Card>

          <ListCard
            title={`Recibos por honorarios (${recibos.length})`}
            href={`/comprobantes?period=${p._id}&kind=RXH`}
            empty="No emitiste recibos este mes."
          >
            {recibos.map((x) => (
              <Item
                key={x._id}
                main={`Recibo ${x.series}-${x.number}`}
                sub={`${formatFechaCorta(x.issueDate)} · ${x.foreign ? `= ${formatPen(x.totalCents)} (TC ${x.foreign.exchangeRate})` : x.retencion ? `retención ${formatPen(x.retencion.amountCents)}` : 'sin retención'}`}
                amount={x.foreign ? formatUsd(x.foreign.grossCents) : formatPen(x.totalCents)}
              />
            ))}
          </ListCard>
        </div>
      </div>
    </>
  );
}

function Tile({
  tag,
  title,
  value,
  hint,
  strong,
}: {
  tag?: React.ReactNode;
  title: string;
  value: string;
  hint: string;
  strong?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${strong ? 'border-brand bg-brand text-white' : 'border-line bg-surface'}`}>
      <div className="flex min-h-[1.5rem] items-center justify-between gap-2">
        <span className={`text-sm font-medium ${strong ? 'text-white/90' : 'text-ink2'}`}>{title}</span>
        {tag}
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${strong ? 'text-white' : 'text-ink'}`}>{value}</div>
      <div className={`mt-1 text-xs ${strong ? 'text-white/80' : 'text-ink3'}`}>{hint}</div>
    </div>
  );
}

function ListCard({
  title,
  href,
  empty,
  children,
}: {
  title: string;
  href: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <Card title={title} action={<MoreLink href={href}>Ver todo</MoreLink>}>
      {children.length === 0 ? (
        <p className="text-sm text-ink3">{empty}</p>
      ) : (
        <ul className="-mx-2 divide-y divide-line">{children}</ul>
      )}
    </Card>
  );
}

function Item({ main, sub, amount }: { main: string; sub: string; amount: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-2 py-2.5 text-sm">
      <span>
        <span className="font-medium text-ink">{main}</span>
        <span className="block text-xs text-ink3">{sub}</span>
      </span>
      <span className="tabular-nums">{amount}</span>
    </li>
  );
}

function Fecha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink2">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
        {n}
      </span>
      <span className="pt-0.5 leading-relaxed">{children}</span>
    </li>
  );
}

function Line({
  label,
  value,
  sign,
  muted,
  total,
  final,
}: {
  label: string;
  value: string;
  sign?: '+' | '−';
  muted?: boolean;
  total?: boolean;
  final?: boolean;
}) {
  const base = 'flex items-baseline justify-between gap-4 py-2.5';
  const cls = final
    ? `${base} -mx-2 mt-1 rounded-lg bg-brand-soft px-2 text-base font-semibold text-brand`
    : total
      ? `${base} border-t border-line font-semibold text-ink`
      : `${base} ${muted ? 'text-ink3' : 'text-ink2'}`;
  return (
    <div className={cls}>
      <dt>
        {sign && <span className="mr-2 inline-block w-3 text-ink3">{sign}</span>}
        {label}
      </dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}
