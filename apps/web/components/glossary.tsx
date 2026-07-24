'use client';

import { useState } from 'react';
import { Card, inputCls } from '@/components/ui';

interface Term {
  term: string;
  full?: string; // sigla desarrollada
  def: string;
}

// Ordenado de lo más frecuente en la app a lo más específico.
const TERMS: Term[] = [
  {
    term: 'IGV',
    full: 'Impuesto General a las Ventas',
    def: '18% que cobras en tus facturas y pagas a SUNAT, menos el IGV de tus compras (crédito fiscal).',
  },
  {
    term: 'IR',
    full: 'Impuesto a la Renta',
    def: 'El impuesto sobre tus ganancias (de tu negocio y de tus honorarios).',
  },
  {
    term: 'NPS',
    full: 'Número de Pago SUNAT',
    def: 'El código con el que pagas tus tributos en el banco/SOL. En el panel, “NPS estimado” = cuánto te toca pagar realmente en el mes, ya descontadas las detracciones disponibles.',
  },
  {
    term: 'RMT',
    full: 'Régimen MYPE Tributario',
    def: 'El régimen en el que tributas: IR de 10% hasta 15 UIT de ganancia y 29.5% sobre el exceso.',
  },
  {
    term: 'MYPE',
    full: 'Micro y Pequeña Empresa',
    def: 'Categoría de negocio por tamaño de ingresos. Te da plazos y tasas más favorables.',
  },
  {
    term: 'PN',
    full: 'Persona Natural',
    def: 'Tú como individuo (no una empresa/persona jurídica). Tu RUC empieza con 10.',
  },
  {
    term: 'F.621',
    full: 'Formulario Virtual 621',
    def: 'La declaración MENSUAL de IGV + pago a cuenta del IR de 3ra. Es la obligación principal de cada mes.',
  },
  {
    term: 'F.616',
    full: 'Formulario Virtual 616',
    def: 'Pago a cuenta MENSUAL del IR de 4ta. Aplica cuando el cliente NO te retiene el 8% (ej. cliente del exterior).',
  },
  {
    term: 'RxH',
    full: 'Recibo por Honorarios',
    def: 'El comprobante que emites como persona natural por servicios independientes (renta de 4ta). No lleva IGV.',
  },
  {
    term: '3ra categoría',
    def: 'Renta por tu negocio (facturas). Lleva IGV y pago a cuenta del 1%.',
  },
  {
    term: '4ta categoría',
    def: 'Renta por trabajo independiente (recibos por honorarios). No lleva IGV; el pago a cuenta es 8%.',
  },
  {
    term: 'Detracción',
    def: '12% del total de tu factura que el cliente deposita en tu cuenta del Banco de la Nación en vez de pagártelo. Ese dinero SOLO sirve para pagar impuestos SUNAT — es tuyo, retenido.',
  },
  {
    term: 'Constancia',
    def: 'El comprobante del depósito de detracción que hace el cliente. Debes pedírsela y registrarla.',
  },
  {
    term: 'Retención',
    def: 'El 8% que el cliente (si es agente de retención) descuenta de tu RxH y paga a SUNAT por ti. Un cliente no domiciliado no retiene.',
  },
  {
    term: 'Pago a cuenta',
    def: 'Un adelanto mensual del IR (1% de ventas en 3ra; 8% en 4ta) que luego se descuenta del IR anual.',
  },
  {
    term: 'Crédito fiscal',
    def: 'El IGV de tus compras que restas del IGV que debes pagar. Por eso conviene registrar y bancarizar las compras.',
  },
  {
    term: 'Bancarización',
    def: 'Pagar por medio bancario (transferencia, tarjeta, depósito). Obligatorio en compras mayores a S/ 2,000: sin ella pierdes el gasto y el crédito fiscal.',
  },
  {
    term: 'Saldo a favor',
    def: 'Impuesto que pagaste de más y que puedes arrastrar a meses siguientes o pedir en devolución.',
  },
  {
    term: 'Regularización',
    def: 'El ajuste anual: el IR de todo el año menos los pagos a cuenta ya hechos. Positivo = pagas; negativo = saldo a favor.',
  },
  {
    term: 'Base imponible',
    def: 'El monto sobre el que se calcula el impuesto: tu servicio sin IGV.',
  },
  {
    term: 'UIT',
    full: 'Unidad Impositiva Tributaria',
    def: 'Valor de referencia que fija SUNAT cada año (S/ 5,500 en 2026). Muchos límites se miden en UIT.',
  },
  {
    term: 'DJ Anual',
    full: 'Declaración Jurada Anual',
    def: 'La declaración de una vez al año donde regularizas todo el IR (3ra y 4ta). Como MYPE vence en mayo/junio.',
  },
  {
    term: 'Domiciliado / No domiciliado',
    def: 'Si el cliente tiene domicilio fiscal en Perú o en el extranjero. Un no domiciliado (ej. empresa chilena) no te retiene el 8%: ese pago lo haces tú con el F.616.',
  },
  {
    term: 'Deducción 3 UIT',
    def: 'Gastos adicionales (hasta 3 UIT) que una persona natural puede descontar del IR de 4ta, con comprobante electrónico y pago bancario.',
  },
  {
    term: 'Tramo (10% / 29.5%)',
    def: 'Los escalones del IR de 3ra (RMT): 10% hasta 15 UIT de ganancia, 29.5% sobre lo que exceda.',
  },
  {
    term: 'Buenos Contribuyentes',
    def: 'Un grupo especial de SUNAT con vencimientos distintos. No es tu caso (tú vas por el último dígito del RUC).',
  },
];

export function Glossary() {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const shown = query
    ? TERMS.filter(
        (t) =>
          t.term.toLowerCase().includes(query) ||
          t.full?.toLowerCase().includes(query) ||
          t.def.toLowerCase().includes(query),
      )
    : TERMS;

  return (
    <Card title="Diccionario tributario">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar término… (ej. detracción, NPS, F.616)"
        className={`${inputCls} mb-3`}
      />
      {shown.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin resultados para “{q}”.</p>
      ) : (
        <dl className="divide-y divide-neutral-800/70">
          {shown.map((t) => (
            <div key={t.term} className="py-2.5">
              <dt className="text-sm font-semibold text-emerald-400">
                {t.term}
                {t.full && <span className="ml-2 font-normal text-neutral-500">{t.full}</span>}
              </dt>
              <dd className="mt-0.5 text-sm text-neutral-300">{t.def}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
