import { describe, expect, it } from 'vitest';
import { compareCronograma, parseCronogramaSunat } from '../src/cronograma-sunat';

// Texto REAL capturado de la página oficial el 2026-07-23 (tras strip de HTML).
const TEXTO_SUNAT_2026 =
  'CRONOGRAMA DE OBLIGACIONES MENSUALES - EJERCICIO 2026 PERÍODO TRIBUTARIO (*) ' +
  'FECHA DE VENCIMIENTO SEGÚN EL ÚLTIMO DÍGITO DEL RUC 0 1 2 y 3 4 y 5 6 y 7 8 y 9 ' +
  'BUENOS CONTRIBUYENTES y UESP ' +
  'Ene-2026 16 Feb 17 Feb 18 Feb 19 Feb 20 Feb 23 Feb 24 Feb ' +
  'Feb-2026 16 Mar 17 Mar 18 Mar 19 Mar 20 Mar 23 Mar 24 Mar ' +
  'Mar-2026 17 Abr 20 Abr 21 Abr 22 Abr 23 Abr 24 Abr 27 Abr ' +
  'Abr-2026 18 May 19 May 20 May 21 May 22 May 25 May 26 May ' +
  'May-2026 15 Jun 16 Jun 17 Jun 18 Jun 19 Jun 22 Jun 23 Jun ' +
  'Jun-2026 15 Jul 16 Jul 17 Jul 20 Jul 21 Jul 22 Jul 24 Jul ' +
  'Jul-2026 18 Ago 19 Ago 20 Ago 21 Ago 24 Ago 25 Ago 26 Ago ' +
  'Ago-2026 15 Set 16 Set 17 Set 18 Set 21 Set 22 Set 23 Set ' +
  'Set-2026 16 Oct 19 Oct 20 Oct 21 Oct 22 Oct 23 Oct 26 Oct ' +
  'Oct-2026 16 Nov 17 Nov 18 Nov 19 Nov 20 Nov 23 Nov 24 Nov ' +
  'Nov-2026 17 Dic 18 Dic 21 Dic 22 Dic 23 Dic 24 Dic 28 Dic ' +
  'Dic-2026 18 Ene 2027 19 Ene 2027 20 Ene 2027 21 Ene 2027 22 Ene 2027 25 Ene 2027 26 Ene 2027 ' +
  '(*) Incluye vencimientos para el pago del Impuesto a las Transacciones Financieras';

describe('parseCronogramaSunat (texto real de la página oficial)', () => {
  const parsed = parseCronogramaSunat(TEXTO_SUNAT_2026, 2026);

  it('parsea las 12 filas con 6 columnas', () => {
    expect(Object.keys(parsed)).toHaveLength(12);
    for (const cols of Object.values(parsed)) expect(cols).toHaveLength(6);
  });

  it('la fila de enero y la de diciembre (cruce de año) son correctas', () => {
    expect(parsed['2026-01']).toEqual([
      '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-23',
    ]);
    expect(parsed['2026-12']).toEqual([
      '2027-01-18', '2027-01-19', '2027-01-20', '2027-01-21', '2027-01-22', '2027-01-25',
    ]);
  });

  it('ignora la columna BC/UESP (7.ª fecha de cada fila)', () => {
    expect(parsed['2026-01']).not.toContain('2026-02-24');
  });

  it('nuestra tabla estática coincide con SUNAT en TODOS los dígitos (0 mismatches)', () => {
    expect(compareCronograma(parsed, 2026)).toEqual([]);
  });

  it('compareCronograma detecta una discrepancia inyectada', () => {
    const alterado = structuredClone(parsed);
    alterado['2026-07']![0] = '2026-08-17'; // SUNAT "dice" 17 en vez de 18 para dígito 0
    const diffs = compareCronograma(alterado, 2026);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatchObject({ period: '2026-07', digit: 0, sunat: '2026-08-17' });
  });

  it('con un año sin publicar devuelve vacío (no filas)', () => {
    expect(parseCronogramaSunat(TEXTO_SUNAT_2026, 2027)).toEqual({});
  });
});
