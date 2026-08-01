import { apiGet } from '@/lib/api';
import { formatFecha, formatPen } from '@/lib/format';
import type { Purchase } from '@/lib/types';
import { Card } from '@/components/ui';
import { CompraForm } from '@/components/compra-form';
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

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const q = searchParams.period ? `?period=${searchParams.period}` : '';
  const purchases = await apiGet<Purchase[]>(`/purchases${q}`);
  const totalBase = purchases.reduce((a, p) => a + p.baseCents, 0);
  const totalIgv = purchases.reduce((a, p) => a + (p.creditFiscal ? p.igvCents : 0), 0);

  // Más reciente arriba (por fecha de emisión).
  const ordenadas = [...purchases].sort((a, b) => b.issueDate.localeCompare(a.issueDate));

  return (
    <div className="space-y-4">
      <CompraForm />

      <Card title="Compras registradas">
        {purchases.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin compras.</p>
        ) : (
          <>
            <Paginated pageSize={6} label="compras">
              {ordenadas.map((p) => (
                <div key={p._id} className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      {p.supplierName}{' '}
                      <span className="text-neutral-500">· {CAT_LABEL[p.category] ?? p.category}</span>
                    </span>
                    <span className="tabular-nums">{formatPen(p.totalCents)}</span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {formatFecha(p.issueDate)} · {p.series}-{p.number}
                    {p.concept && ` · ${p.concept}`}
                  </div>
                  {p.notes && <p className="mt-1 text-xs text-neutral-400">📝 {p.notes}</p>}
                  {p.bancarizacionWarning && (
                    <p className="mt-1 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                      ⚠️ {p.bancarizacionWarning}
                    </p>
                  )}
                </div>
              ))}
            </Paginated>

            <div className="mt-3 border-t border-neutral-800 pt-3 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Total base</span>
                <span className="tabular-nums">{formatPen(totalBase)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Crédito fiscal (IGV)</span>
                <span className="tabular-nums">{formatPen(totalIgv)}</span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
