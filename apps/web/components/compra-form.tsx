'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toCents } from '@tributo/core';
import { mutate } from '@/lib/mutate';
import { Card, Field, inputCls } from '@/components/ui';

const CATEGORIES: Record<string, string> = {
  EQUIPO: 'Equipo',
  SOFTWARE_CLOUD: 'Software / Cloud',
  INTERNET: 'Internet',
  CELULAR: 'Celular',
  CONTADOR: 'Contador',
  OFICINA: 'Oficina',
  OTROS: 'Otros',
};

export function CompraForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    issueDate: new Date().toISOString().slice(0, 10),
    supplierName: '',
    supplierRuc: '',
    series: '',
    number: '',
    concept: '',
    category: 'OTROS',
    baseSoles: '',
    bancarizado: true,
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

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
        concept: form.concept || undefined,
        category: form.category,
        baseCents: toCents(Number(form.baseSoles) || 0),
        bancarizado: form.bancarizado,
        notes: form.notes || undefined,
      });
      setForm((f) => ({
        ...f,
        supplierName: '',
        supplierRuc: '',
        series: '',
        number: '',
        concept: '',
        baseSoles: '',
        notes: '',
      }));
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Nueva compra">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha de emisión">
          <input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Categoría">
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Proveedor" full>
          <input value={form.supplierName} onChange={(e) => set('supplierName', e.target.value)} placeholder="Razón social" className={inputCls} />
        </Field>
        <Field label="RUC del proveedor">
          <input value={form.supplierRuc} onChange={(e) => set('supplierRuc', e.target.value)} placeholder="20xxxxxxxxx" className={inputCls} />
        </Field>
        <Field label="Base imponible (S/)">
          <input type="number" value={form.baseSoles} onChange={(e) => set('baseSoles', e.target.value)} placeholder="0.00" className={inputCls} />
        </Field>
        <Field label="Serie">
          <input value={form.series} onChange={(e) => set('series', e.target.value)} placeholder="F001" className={inputCls} />
        </Field>
        <Field label="Número">
          <input value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="123" className={inputCls} />
        </Field>
        <Field label="Concepto" full>
          <input
            value={form.concept}
            onChange={(e) => set('concept', e.target.value)}
            placeholder="Descripción del bien o servicio"
            className={inputCls}
          />
        </Field>
        <Field label="Notas (opcional)" full>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Observaciones internas"
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </Field>
        <label className="col-span-2 flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300">
          <input type="checkbox" checked={form.bancarizado} onChange={(e) => set('bancarizado', e.target.checked)} />
          Pagado por medio bancario (obligatorio si supera S/ 2,000)
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
