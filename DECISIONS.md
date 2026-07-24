# DECISIONS.md — resoluciones de ambigüedades del SPEC

Registro de decisiones tomadas donde el SPEC dejaba margen (regla final del SPEC §10).

## 2026-07-23 — Cronograma: solo dígito 0 con data oficial

El SPEC §4.1 pide la tabla oficial 2026 del dígito 0 (dada en el propio SPEC) "y la tabla
completa 0–9/BC por si cambia el RUC". No se encontró fuente verificable para transcribir
los demás dígitos, y fabricar fechas oficiales sería peor que estimarlas. Resolución:

- `cronograma.ts` tiene la estructura `periodo → {dígito → fecha}` lista para la tabla completa.
- Solo el dígito 0 está cargado como OFFICIAL; cualquier otro dígito cae al estimador
  (siguiente hábil >= día 16 del mes siguiente) con source `ESTIMATED`, que ya avisa
  "⚠️ fecha estimada" en los recordatorios.
- Si el RUC cambiara de dígito: pegar la fila correspondiente de la R.S. vigente y listo.

## 2026-07-23 — Feriados: solo nacionales, sin "días no laborables"

`feriados.ts` incluye los feriados nacionales 2026–2027 (fuentes citadas en el archivo).
Los "días no laborables" declarados por decreto para el sector público NO se incluyen:
no mueven los vencimientos SUNAT. Para 2028+ hay que añadir el año al archivo (editable,
como pide el SPEC).

## 2026-07-23 — Cliente RxH no domiciliado (Chile) y F.616

El dueño emitirá el RxH a una empresa chilena. Un no domiciliado no es agente de retención
de SUNAT, así que el supuesto del SPEC §0 ("el RxH no genera declaración mensual porque la
retención 8% cubre el pago a cuenta") no aplica: el pago a cuenta lo hace el emisor vía
**F.616 mensual (8% del bruto − retenido)**, mismo cronograma que el 621. Con ~S/ 108k/año
se supera el límite de suspensión de 4ta (S/ 48,125 en 2026), no hay exención. Implementado:
`clients[].domiciliado` (default true), `computeRxh(..., pagadorRetiene)`, `computePago616`,
campos `rxhBrutoCents`/`pago616Cents` en el summary, línea F.616 en recordatorios y dashboard,
y **proyección anual de 4ta** (`renta4ta.ts`: bruto − 20% tope 24 UIT − 7 UIT − gastos 3 UIT
→ escala 8/14/17/20/30) con `gastos3UitCents` editable en settings. Modelo validado contra el
plan financiero del dueño (Plan_Financiero_Impuestos_Peru_2026.xlsx, hoja RXH_4TA).
Fuera de alcance (consciente): la ruta alternativa de facturar al exterior como
**exportación de servicios** (3ra, sin IGV/detracción, requiere Registro de Exportadores) —
el SPEC la excluye de v1; decisión con contador si algún día conviene.

## 2026-07-23 — Data estática vigilada por watchdog, no reemplazada por APIs

El dueño pidió evaluar APIs para feriados y cronograma. Resultado de la investigación:
(1) **Cronograma SUNAT: no existe API** — se publica por R.S. (PDF/web) cada diciembre;
(2) **Feriados: Nager.Date** (gratis, sin key) cubre Perú pero **incompleta**: verificado en
vivo el 2026-07-23, le faltan los feriados de leyes recientes (06-07, 07-23, 08-06, 12-09).
Decisión: la data estática sigue siendo la fuente de verdad (determinista, testeable, sin
dependencia de terceros en el cálculo de vencimientos) y un job mensual `data-watchdog` la
vigila: cruza feriados contra Nager.Date (ignorando diferencias verificadas y feriados en
fin de semana) y recuerda cargar el cronograma del año siguiente desde noviembre.

## 2026-07-23 — Fechas del core como strings ISO `YYYY-MM-DD`

Toda la matemática de fechas de `packages/core` opera sobre strings ISO en hora de Lima
(sin `Date` en las firmas públicas). La conversión UTC↔Lima ocurre en los bordes (api/worker),
donde vive la zona horaria. Evita bugs de TZ en el dominio puro y hace los tests deterministas.
