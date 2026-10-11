import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatFechaCorta, formatPen, formatPeriodo } from '@/lib/format';
import type { Purchase } from '@/lib/types';
import { Card, PageHeader, Stat } from '@/components/ui';
import { CompraForm } from '@/components/compra-form';
import { DrawerButton } from '@/components/drawer';
import { Paginated } from '@/components/paginated';

export const dynamic = 'force-dynamic';

const CAT_LABEL: Record<string, string> = {
  EQUIPO: 'Equipo',
  SOFTWARE_CLOUD: 'Software / Cloud',
  INTERNET: 'Internet',
  CELULAR: 'Celular',
  CONTADOR: 'Contador',
  OFICINA: 'Oficina',
  OTROS: 'Otros',
};

const COLS = 'md:grid-cols-[6.5rem_2fr_1fr_8rem_1rem]';

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = searchParams.period;
  const purchases = await apiGet<Purchase[]>(`/purchases${period ? `?period=${period}` : ''}`);
  const totalBase = purchases.reduce((a, p) => a + p.baseCents, 0);
  const totalIgv = purchases.reduce((a, p) => a + (p.creditFiscal ? p.igvCents : 0), 0);
  const avisos = purchases.filter((p) => p.bancarizacionWarning).length;
  const ordenadas = [...purchases].sort((a, b) => b.issueDate.localeCompare(a.issueDate));

  return (
    <>
      <PageHeader
        title="Compras"
        intro="Tus gastos con factura. El IGV que pagaste en ellos se descuenta del IGV que debes cada mes."
        actions={
          <DrawerButton label="Nueva compra" title="Nueva compra">
            <CompraForm />
          </DrawerButton>
        }
      />

      {period && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="rounded-full bg-brand-soft px-3 py-1 font-medium text-brand">
            Mostrando {formatPeriodo(period)}
          </span>
          <Link href="/compras" className="text-ink2 underline hover:text-brand">
            Ver todas
          </Link>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Gastado (sin IGV)" value={formatPen(totalBase)} hint={`${purchases.length} compras`} />
        <Stat label="IGV que recuperas" value={formatPen(totalIgv)} tone="ok" hint="Crédito fiscal" />
        <Stat
          label="Con observaciones"
          value={String(avisos)}
          tone={avisos > 0 ? 'info' : 'neutral'}
          hint={avisos > 0 ? 'Revisa la bancarización' : 'Todo en orden'}
        />
      </div>

      <Card title="Compras registradas (la más reciente primero)">
        {ordenadas.length === 0 ? (
          <div className="py-6 text-center text-sm text-ink3">
            Todavía no registraste compras. Usa <b className="text-ink">Nueva compra</b> arriba.
          </div>
        ) : (
          <div className="-mx-4 -mb-4">
            <div
              className={`hidden gap-3 border-y border-line bg-page px-4 py-2 text-xs font-medium text-ink3 md:grid ${COLS}`}
            >
              <span>Fecha</span>
              <span>Proveedor</span>
              <span>Categoría</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            <Paginated pageSize={10} label="compras" className="" footerClass="!mt-0 px-4 pb-4">
              {ordenadas.map((p) => (
                <details key={p._id} className="group border-b border-line last:border-b-0">
                  <summary
                    className={`grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-page [&::-webkit-details-marker]:hidden ${COLS}`}
                  >
                    <span className="hidden text-sm text-ink2 md:block">{formatFechaCorta(p.issueDate)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {p.supplierName}
                        {p.bancarizacionWarning && (
                          <span className="ml-2 rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-warn">
                            Revisar
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-ink3">
                        {p.concept || 'Sin concepto'}
                        <span className="md:hidden"> · {formatFechaCorta(p.issueDate)}</span>
                      </span>
                    </span>
                    <span className="hidden text-sm text-ink2 md:block">{CAT_LABEL[p.category] ?? p.category}</span>
                    <span className="text-right text-sm tabular-nums text-ink">{formatPen(p.totalCents)}</span>
                    <span aria-hidden className="hidden text-ink3 transition group-open:rotate-90 md:block">
                      ›
                    </span>
                  </summary>
                  <div className="grid gap-x-10 gap-y-4 bg-page px-4 py-4 text-sm sm:grid-cols-2 lg:max-w-4xl">
                    <dl className="space-y-1.5 text-ink2">
                      <Row2 k="Documento" v={`${p.series}-${p.number}`} />
                      <Row2 k="RUC del proveedor" v={p.supplierRuc} />
                      <Row2 k="Base (sin IGV)" v={formatPen(p.baseCents)} />
                      <Row2 k="IGV" v={formatPen(p.igvCents)} />
                      <Row2 k="Total" v={formatPen(p.totalCents)} strong />
                    </dl>
                    <div className="space-y-2 text-ink2">
                      <p>
                        Crédito fiscal: <b className="text-ink">{p.creditFiscal ? 'Sí' : 'No'}</b> · Gasto deducible:{' '}
                        <b className="text-ink">{p.deductibleIR ? 'Sí' : 'No'}</b>
                      </p>
                      <p>
                        Pagado por banco: <b className="text-ink">{p.bancarizado ? 'Sí' : 'No'}</b>
                      </p>
                      {p.bancarizacionWarning && (
                        <p className="rounded-lg bg-warn-soft p-2.5 text-xs text-warn">{p.bancarizacionWarning}</p>
                      )}
                      {p.notes && <p className="text-xs text-ink3">Nota: {p.notes}</p>}
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

function Row2({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-line pt-1.5 font-semibold text-ink' : ''}`}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
