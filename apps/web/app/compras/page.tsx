import { apiGet } from '@/lib/api';
import { formatFecha, formatPen } from '@/lib/format';
import type { Purchase } from '@/lib/types';
import { Card } from '@/components/ui';
import { CompraForm } from '@/components/compra-form';

export const dynamic = 'force-dynamic';

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const q = searchParams.period ? `?period=${searchParams.period}` : '';
  const purchases = await apiGet<Purchase[]>(`/purchases${q}`);
  const totalBase = purchases.reduce((a, p) => a + p.baseCents, 0);
  const totalIgv = purchases.reduce((a, p) => a + (p.creditFiscal ? p.igvCents : 0), 0);

  return (
    <div className="space-y-4">
      <CompraForm />

      <Card title="Compras registradas">
        {purchases.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin compras.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {purchases.map((p) => (
                <li key={p._id} className="border-t border-neutral-800 pt-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {p.supplierName} <span className="text-neutral-500">· {p.category}</span>
                    </span>
                    <span>{formatPen(p.totalCents)}</span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {formatFecha(p.issueDate)} · {p.series}-{p.number}
                  </div>
                  {p.bancarizacionWarning && (
                    <p className="mt-1 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                      ⚠️ {p.bancarizacionWarning}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-neutral-800 pt-2 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Total base</span>
                <span>{formatPen(totalBase)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Crédito fiscal (IGV)</span>
                <span>{formatPen(totalIgv)}</span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
