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

## 2026-07-23 — Fechas del core como strings ISO `YYYY-MM-DD`

Toda la matemática de fechas de `packages/core` opera sobre strings ISO en hora de Lima
(sin `Date` en las firmas públicas). La conversión UTC↔Lima ocurre en los bordes (api/worker),
donde vive la zona horaria. Evita bugs de TZ en el dominio puro y hace los tests deterministas.
