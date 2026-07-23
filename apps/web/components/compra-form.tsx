'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toCents } from '@tributo/core';
import { mutate } from '@/lib/mutate';
import { Card } from '@/components/ui';

const CATEGORIES = [
  'EQUIPO',
  'SOFTWARE_CLOUD',
  'INTERNET',
  'CELULAR',
  'CONTADOR',
  'OFICINA',
  'OTROS',
];

export function CompraForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    issueDate: new Date().toISOString().slice(0, 10),
    supplierName: '',
    supplierRuc: '',
    series: '',
    number: '',
    category: 'OTROS',
    baseSoles: '',
    bancarizado: true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls =
    'w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500';

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await mutate('/purchases', 'POST', {
        issueDate: form.issueDate,
        supplierName: form.supplierName,
        supplierRuc: form.supplierRuc,
        series: form.series,
        number: form.number,
        category: form.category,
        baseCents: toCents(Number(form.baseSoles) || 0),
        bancarizado: form.bancarizado,
      });
      setForm((f) => ({ ...f, supplierName: '', supplierRuc: '', series: '', number: '', baseSoles: '' }));
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Nueva compra">
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} className={inputCls} />
        <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input value={form.supplierName} onChange={(e) => set('supplierName', e.target.value)} placeholder="Proveedor" className={inputCls} />
        <input value={form.supplierRuc} onChange={(e) => set('supplierRuc', e.target.value)} placeholder="RUC (11 díg.)" className={inputCls} />
        <input value={form.series} onChange={(e) => set('series', e.target.value)} placeholder="Serie" className={inputCls} />
        <input value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="Número" className={inputCls} />
        <input type="number" value={form.baseSoles} onChange={(e) => set('baseSoles', e.target.value)} placeholder="Base (S/)" className={inputCls} />
        <label className="flex items-center gap-2 px-1 text-sm text-neutral-300">
          <input type="checkbox" checked={form.bancarizado} onChange={(e) => set('bancarizado', e.target.checked)} />
          Bancarizado
        </label>
      </div>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      <button
        onClick={submit}
        disabled={busy || !form.supplierRuc || !form.baseSoles}
        className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Registrar compra'}
      </button>
    </Card>
  );
}
