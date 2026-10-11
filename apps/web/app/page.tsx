import Link from 'next/link';
import { suggestedPayDate } from '@tributo/core';
import { apiGet } from '@/lib/api';
import {
  diasHasta,
  diasLabel,
  formatFechaCorta,
  formatPen,
  formatPeriodo,
} from '@/lib/format';
import type { Dashboard } from '@/lib/types';
import {
  Card,
  Chip,
  DetraccionChip,
  MoreLink,
  PageHeader,
  PrimaryLink,
  Stat,
  urgencyTone,
} from '@/components/ui';
import { Paginated } from '@/components/paginated';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const d = await apiGet<Dashboard>('/dashboard');
  const cur = d.currentPeriod?.summary;

  return (
    <>
      <PageHeader title="Resumen" intro={`Hoy es ${formatFechaCorta(d.today)}. Esto es lo que necesitas saber.`} />

      {/* 1. Lo urgente: el próximo pago + lista de pendientes */}
      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          {d.nextDue ? (
            <NextPayment today={d.today} nextDue={d.nextDue} />
          ) : (
            <Card tone="ok">
              <p className="text-base font-semibold text-ink">Estás al día</p>
              <p className="mt-1 text-sm text-ink2">No tienes declaraciones pendientes con SUNAT.</p>
            </Card>
          )}
        </div>
        <div className="lg:col-span-2">
          <Pending d={d} />
        </div>
      </div>

      {/* 2. Números del mes en curso */}
      {d.currentPeriod && cur && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink">
              {formatPeriodo(d.currentPeriod.period)}
              <span className="ml-2 text-sm font-normal text-ink3">mes en curso</span>
            </h2>
            <MoreLink href={`/periodos/${d.currentPeriod.period}`}>Ver cómo se calcula</MoreLink>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="IGV que debes"
              value={formatPen(cur.igvPagarCents)}
              hint="El IGV que cobraste menos el de tus compras"
            />
            <Stat
              label="Adelanto de renta (negocio)"
              value={formatPen(cur.pagoCuentaCents)}
              hint="1% de tus ventas del mes"
            />
            <Stat
              label="Adelanto de renta (honorarios)"
              value={formatPen(cur.pago616Cents)}
              hint={cur.pago616Cents > 0 ? '8% de recibos sin retención' : 'No te toca este mes'}
            />
            <Stat
              label="Pagarías de tu bolsillo"
              value={formatPen(cur.npsEstimadoCents)}
              tone="info"
              hint="Ya descontadas tus detracciones"
            />
          </div>
        </section>
      )}

      {/* 3. Mirada al año */}
      <div className="mt-8 grid gap-6 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          <Projection d={d} />
        </div>
        <div className="lg:col-span-2">
          <Card title="Avisos recientes">
            {d.recentAlerts.length === 0 ? (
              <p className="text-sm text-ink3">Todavía no se envió ningún aviso.</p>
            ) : (
              <Paginated pageSize={5} label="avisos" className="text-sm">
                {d.recentAlerts.map((a) => (
                  <div
                    key={a._id}
                    className="border-b border-line py-2.5 last:border-b-0"
                  >
                    <div className="text-xs text-ink3">{formatFechaCorta(a.sentAt)}</div>
                    <div className="line-clamp-2 text-ink2">{a.payloadPreview}</div>
                  </div>
                ))}
              </Paginated>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function NextPayment({
  today,
  nextDue,
}: {
  today: string;
  nextDue: NonNullable<Dashboard['nextDue']>;
}) {
  const days = diasHasta(today, nextDue.dueDate);
  const tone = urgencyTone(days);
  const accent = tone === 'urgent' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-ok';
  const s = nextDue.summary;
  // Pagos ya registrados: el F.621 y el F.616 se pagan por separado.
  const f621Hecho = !!nextDue.pagos?.f621;
  const f616Hecho = !!nextDue.pagos?.f616;
  const monto621 = f621Hecho ? 0 : (s?.npsEstimadoCents ?? 0);
  const monto616 = f616Hecho ? 0 : (s?.pago616Cents ?? 0);

  return (
    <Card tone={tone}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-ink2">Próximo pago a SUNAT</div>
        <Chip>{nextDue.source}</Chip>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 sm:items-end">
        <div>
          <div className={`text-3xl font-bold tracking-tight ${accent}`}>{diasLabel(days)}</div>
          <div className="mt-1 text-sm text-ink2">
            Declaración de {formatPeriodo(nextDue.period)}
          </div>
          <div className="text-sm text-ink3">Vence el {formatFechaCorta(nextDue.dueDate)}</div>
        </div>
        <div className="sm:text-right">
          <div className="text-xs text-ink3">Monto a pagar</div>
          <div className="text-3xl font-semibold tabular-nums text-ink">
            {formatPen(monto621)}
          </div>
          {monto616 > 0 && (
            <div className="text-xs text-ink3">+ {formatPen(monto616)} de honorarios (F.616)</div>
          )}
          {(f621Hecho || f616Hecho) && (
            <div className="text-xs text-ok">
              {f621Hecho ? 'F.621 ya pagado' : 'F.616 ya pagado'}
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
        <PrimaryLink href={`/periodos/${nextDue.period}`}>Ver pasos y declarar →</PrimaryLink>
        <span className="text-sm text-ink2">
          Conviene pagar antes del{' '}
          <b className="text-ink">{formatFechaCorta(suggestedPayDate(nextDue.dueDate))}</b>
        </span>
      </div>
    </Card>
  );
}

function Pending({ d }: { d: Dashboard }) {
  const annualDays = diasHasta(d.today, d.rentaAnual.dueDate);
  const items: { key: string; href: string; title: string; sub: string; chip?: string }[] = [
    ...d.detracciones.map((x) => ({
      key: x.id,
      href: '/comprobantes',
      title: `Registrar depósito de detracción · ${formatPen(x.amountCents)}`,
      sub: x.depositDueDate
        ? `Plazo ${formatFechaCorta(x.depositDueDate)} · ${formatPeriodo(x.period)}`
        : formatPeriodo(x.period),
      chip: x.status,
    })),
    {
      key: 'anual',
      href: '/calendario',
      title: `Declaración anual de renta ${d.rentaAnual.ejercicio}`,
      sub: `${formatFechaCorta(d.rentaAnual.dueDate)} · ${diasLabel(annualDays)}`,
    },
  ];

  return (
    <Card title="Pendientes">
      <ul className="-mx-2 divide-y divide-line">
        {items.map((it) => (
          <li key={it.key}>
            <Link
              href={it.href}
              className="group flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-page"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{it.title}</span>
                <span className="block text-xs text-ink3">{it.sub}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {it.chip && <DetraccionChip status={it.chip} />}
                <span aria-hidden className="text-ink3 group-hover:text-brand">
                  ›
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {d.detracciones.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-ink3">
          La detracción es una parte de tu factura que el cliente deposita en tu cuenta del Banco
          de la Nación. Pídele la constancia y regístrala en Ventas.
        </p>
      )}
    </Card>
  );
}

function Projection({ d }: { d: Dashboard }) {
  const p3 = d.projection;
  const p4 = d.projection4ta;
  const rows: { label: string; a: string; b: string; strong?: boolean }[] = [
    { label: 'Ganancia del año', a: formatPen(p3.rentaNetaCents), b: formatPen(p4.rentaNetaTrabajoCents) },
    { label: 'Impuesto del año', a: formatPen(p3.irEstimadoCents), b: formatPen(p4.irAnualCents) },
    {
      label: p4.saldoCents < 0 ? 'Al final pagarías / te devuelven' : 'Al final pagarías',
      a: formatPen(p3.regularizacionEstimadaCents),
      b: p4.saldoCents < 0 ? `${formatPen(-p4.saldoCents)} a favor` : formatPen(p4.saldoCents),
      strong: true,
    },
  ];
  return (
    <Card title="Impuesto a la renta del año (proyección)">
      <p className="-mt-1 mb-3 text-xs text-ink3">
        Estimado con lo registrado hasta hoy. Se ajusta una sola vez, en la declaración anual.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink3">
            <th className="pb-2 font-medium" />
            <th className="pb-2 text-right font-medium">Negocio (facturas)</th>
            <th className="pb-2 text-right font-medium">Honorarios (recibos)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <td className={`py-2.5 pr-2 ${r.strong ? 'font-semibold text-ink' : 'text-ink2'}`}>
                {r.label}
              </td>
              <td className={`py-2.5 text-right tabular-nums ${r.strong ? 'font-semibold' : ''}`}>
                {r.a}
              </td>
              <td className={`py-2.5 text-right tabular-nums ${r.strong ? 'font-semibold' : ''}`}>
                {r.b}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {p3.gastosFaltantesParaTramo10Cents > 0 && (
        <p className="mt-3 rounded-lg bg-info-soft p-3 text-xs leading-relaxed text-info">
          Con {formatPen(p3.gastosFaltantesParaTramo10Cents)} más en compras deducibles, tu negocio
          pagaría la tasa baja (10%).
        </p>
      )}
    </Card>
  );
}
