import { suggestedPayDate } from '@tributo/core';
import { apiGet } from '@/lib/api';
import { formatFecha, formatPen } from '@/lib/format';
import type { Dashboard } from '@/lib/types';
import { Card, Chip, Row, SectionTitle, Stat, urgencyTone } from '@/components/ui';
import { DeclareButton } from '@/components/declare-button';

export const dynamic = 'force-dynamic';

function daysBetween(todayIso: string, dueIso: string): number {
  const a = new Date(`${todayIso}T00:00:00Z`).getTime();
  const b = new Date(`${dueIso.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function daysLabel(days: number): string {
  if (days < 0) return `vencido hace ${-days} d`;
  if (days === 0) return 'vence HOY';
  if (days === 1) return 'vence mañana';
  return `faltan ${days} días`;
}

export default async function Home() {
  const d = await apiGet<Dashboard>('/dashboard');

  return (
    <div className="space-y-6">
      {/* HERO — lo único que importa de un vistazo */}
      {d.nextDue ? (
        <HeroDeadline today={d.today} nextDue={d.nextDue} />
      ) : (
        <Card tone="ok">
          <p className="text-sm text-emerald-300">✅ No tienes vencimientos abiertos.</p>
        </Card>
      )}

      {/* Detracciones por cobrar — solo si hay algo que hacer */}
      {d.detracciones.length > 0 && (
        <Card
          tone={d.detracciones.some((x) => x.status === 'OVERDUE') ? 'urgent' : 'warn'}
          title="Detracciones por verificar"
        >
          <ul className="space-y-2">
            {d.detracciones.map((det) => (
              <li key={det.id} className="flex items-center justify-between gap-2">
                <span className="text-sm">
                  <span className="font-medium tabular-nums">{formatPen(det.amountCents)}</span>
                  <span className="text-neutral-500"> · {det.period}</span>
                  {det.depositDueDate && (
                    <span className="text-neutral-500"> · límite {formatFecha(det.depositDueDate)}</span>
                  )}
                </span>
                <Chip>{det.status}</Chip>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Mes en curso — números clave como tiles */}
      {d.currentPeriod && (
        <section>
          <SectionTitle>Mes en curso · {d.currentPeriod.period}</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="IGV a pagar" value={formatPen(d.currentPeriod.summary.igvPagarCents)} />
            <Stat label="Pago a cuenta 3ra" value={formatPen(d.currentPeriod.summary.pagoCuentaCents)} />
            <Stat
              label="NPS estimado"
              value={formatPen(d.currentPeriod.summary.npsEstimadoCents)}
              tone="info"
              hint="a pagar en el F.621"
            />
            {d.currentPeriod.summary.pago616Cents > 0 && (
              <Stat
                label="F.616 (4ta)"
                value={formatPen(d.currentPeriod.summary.pago616Cents)}
                tone="info"
                hint="RxH sin retención"
              />
            )}
          </div>
        </section>
      )}

      {/* Proyección anual — 3ra y 4ta, compacto lado a lado */}
      <section>
        <SectionTitle>Proyección del año</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Negocio · 3ra (RMT)">
            <Row label="Renta neta" value={formatPen(d.projection.rentaNetaCents)} />
            <Row label="IR estimado" value={formatPen(d.projection.irEstimadoCents)} />
            <Row
              label="Regularización"
              value={formatPen(d.projection.regularizacionEstimadaCents)}
              strong
            />
            {d.projection.gastosFaltantesParaTramo10Cents > 0 && (
              <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-300">
                💡 Con {formatPen(d.projection.gastosFaltantesParaTramo10Cents)} más en gastos
                deducibles te quedas en el tramo del 10%.
              </p>
            )}
          </Card>
          <Card title="Honorarios · 4ta">
            <Row label="Renta neta trabajo" value={formatPen(d.projection4ta.rentaNetaTrabajoCents)} />
            <Row label="IR anual estimado" value={formatPen(d.projection4ta.irAnualCents)} />
            <Row
              label={d.projection4ta.saldoCents >= 0 ? 'Saldo por pagar' : 'Saldo a favor'}
              value={formatPen(Math.abs(d.projection4ta.saldoCents))}
              strong
            />
          </Card>
        </div>
      </section>

      {/* DJ Anual */}
      <AnnualDeadline today={d.today} ra={d.rentaAnual} />

      {/* Alertas */}
      <Card title="Últimas alertas">
        {d.recentAlerts.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin alertas todavía.</p>
        ) : (
          <ul className="divide-y divide-neutral-800/70 text-sm">
            {d.recentAlerts.map((a) => (
              <li key={a._id} className="flex justify-between gap-3 py-2">
                <span className="line-clamp-2 text-neutral-300">{a.payloadPreview}</span>
                <span className="shrink-0 text-xs text-neutral-500">{formatFecha(a.sentAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function HeroDeadline({
  today,
  nextDue,
}: {
  today: string;
  nextDue: NonNullable<Dashboard['nextDue']>;
}) {
  const days = daysBetween(today, nextDue.dueDate);
  const tone = urgencyTone(days);
  const accent =
    tone === 'urgent' ? 'text-red-400' : tone === 'warn' ? 'text-amber-400' : 'text-emerald-400';
  const s = nextDue.summary;
  const totalF621 = s ? s.npsEstimadoCents : 0;

  return (
    <Card tone={tone} action={<Chip>{nextDue.source}</Chip>} title="Próximo vencimiento">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={`text-3xl font-bold ${accent}`}>{daysLabel(days)}</div>
          <div className="mt-1 text-sm text-neutral-400">
            F.621{s && s.pago616Cents > 0 ? ' + F.616' : ''} · periodo {nextDue.period}
          </div>
          <div className="text-sm text-neutral-400">vence {formatFecha(nextDue.dueDate)}</div>
          <div className="text-xs text-emerald-500/80">
            💡 pagar antes del {formatFecha(suggestedPayDate(nextDue.dueDate))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">A pagar (NPS)</div>
          <div className="text-2xl font-semibold tabular-nums">{formatPen(totalF621)}</div>
          {s && s.pago616Cents > 0 && (
            <div className="text-xs text-neutral-400">+ {formatPen(s.pago616Cents)} F.616</div>
          )}
        </div>
      </div>
      <div className="mt-4">
        <DeclareButton period={nextDue.period} />
      </div>
    </Card>
  );
}

function AnnualDeadline({
  today,
  ra,
}: {
  today: string;
  ra: Dashboard['rentaAnual'];
}) {
  const days = daysBetween(today, ra.dueDate);
  return (
    <Card title="Declaración Jurada Anual" action={<Chip>{ra.source}</Chip>}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Ejercicio {ra.ejercicio}</div>
          <div className="text-sm text-neutral-400">{formatFecha(ra.dueDate)}</div>
        </div>
        <div className="text-right text-sm text-neutral-400">{daysLabel(days)}</div>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Cronograma MYPE/PN. Regulariza el IR de 3ra y 4ta (ver proyección arriba).
      </p>
    </Card>
  );
}
