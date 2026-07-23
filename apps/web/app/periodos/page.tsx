import { apiGet } from '@/lib/api';
import { formatFecha, formatPen } from '@/lib/format';
import type { Period } from '@/lib/types';
import { Card, Chip, LinkButton } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PeriodosPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const year = searchParams.year ?? String(new Date().getFullYear());
  const periods = await apiGet<Period[]>(`/periods?year=${year}`);

  return (
    <Card title={`Periodos ${year}`}>
      {periods.length === 0 ? (
        <p className="text-sm text-neutral-400">Sin periodos registrados este año.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-1">Periodo</th>
                <th>Vence</th>
                <th>Estado</th>
                <th className="text-right">IGV</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p._id} className="border-t border-neutral-800">
                  <td className="py-2 font-medium">{p._id}</td>
                  <td>{formatFecha(p.dueDate)}</td>
                  <td>
                    <Chip>{p.status}</Chip>
                  </td>
                  <td className="text-right">{formatPen(p.summary?.igvPagarCents ?? 0)}</td>
                  <td className="text-right">
                    <LinkButton href={`/periodos/${p._id}`}>Ver</LinkButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
