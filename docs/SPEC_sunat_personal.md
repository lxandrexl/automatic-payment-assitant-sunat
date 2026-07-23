# SPEC — "Tributo" · Panel tributario personal SUNAT (Perú)

> **Documento de especificación para Claude Code.** Implementar exactamente lo descrito.
> Donde diga `DECISIÓN:` es una decisión ya tomada — no proponer alternativas.
> Donde diga `FUERA DE ALCANCE:` no implementar, ni siquiera como stub.
>
> **Rev 2026-07-23 (acordado con el dueño):** (1) el watcher del Buzón SOL usa **IMAP con app
> password** en vez de Gmail API/OAuth; (2) el acceso es **Cloudflare Tunnel + Cloudflare Access**
> en `tributo.inhousequeue.app` en vez de Tailscale; (3) se despliega en la **VM Oracle existente**
> del proyecto inhousequeue (stack compose separado) con build nativo en la caja (sin GHCR/buildx).

---

## 0. Contexto de negocio (leer antes de codear)

Aplicación **estrictamente personal y single-user** para gestionar las obligaciones
tributarias del dueño en Perú:

- Contribuyente: **persona natural con negocio** (RUC 10), régimen **MYPE Tributario (RMT)**,
  afecto a **IGV** y **Renta 3ra** desde 20/07/2026, y a **Renta 4ta** (recibos por honorarios).
- Actividad: desarrollo de software (CIIU 6201). Servicios sujetos a **detracción 12%**
  (código 037, "demás servicios gravados con IGV") cuando la factura supera S/ 700.
- Operación mensual real (volumen mínimo — diseñar para esto, no para escala):
  - **1 factura** a un solo cliente empresa: base S/ 9,000 + IGV 18% = S/ 10,620.
    El cliente deposita detracción 12% (S/ 1,274.40) a la cuenta del Banco de la Nación
    del dueño y paga el neto (S/ 9,345.60) por transferencia el último día útil del mes.
  - **1 recibo por honorarios (RxH)** a otro cliente: S/ 9,000 brutos, retención 8%
    (S/ 720), neto S/ 8,280.
  - **~5–15 facturas de compra** (gastos deducibles con crédito fiscal).
- Obligación mensual: **Formulario 621** (IGV + pago a cuenta 1% de renta) según
  cronograma SUNAT por último dígito de RUC (**dígito = 0** → primer grupo en vencer).
- El RxH no genera declaración mensual (la retención 8% cubre el pago a cuenta);
  solo importa para el registro anual.

**Objetivo del sistema:** que el dueño nunca se pase un vencimiento, se entere de
notificaciones del Buzón SOL el mismo día, verifique cada depósito de detracción,
y tenga el semáforo del mes en una pantalla.

**FUERA DE ALCANCE (v1):** emisión de comprobantes (se emiten manualmente en SEE-SOL),
integración SIRE, scraping de SOL con Clave SOL (PROHIBIDO guardar la Clave SOL en
cualquier forma), multi-usuario, autenticación de terceros, facturación a varios clientes,
exportación de servicios, PLAME/planilla.

---

## 1. Stack y restricciones de infraestructura

`DECISIÓN:` Todo lo siguiente es fijo.

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22 LTS, TypeScript 5 estricto (`"strict": true`) |
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| API | **NestJS 10** (REST, sin GraphQL) |
| Frontend | **Next.js 14+ (App Router)**, Tailwind CSS, sin librería de componentes pesada (usar componentes propios simples) |
| DB | **MongoDB Atlas M0** (free tier) vía **Mongoose 8** |
| Jobs | `node-cron` dentro de un proceso worker dedicado (NO serverless) |
| Push | **Bot de Telegram** (canal principal) + email SMTP Gmail como respaldo |
| Buzón SOL | **IMAP Gmail** (`imap.gmail.com`, mismo app password que SMTP) — watcher de correos de cortesía de SUNAT; NO scraping de SOL |
| Deploy | Docker Compose (stack propio) en la **VM Oracle existente de inhousequeue** (ARM/Ampere, 4 OCPU/24 GB); CI/CD con **GitHub Actions** por SSH |
| Acceso | **Cloudflare Tunnel + Cloudflare Access** en `tributo.inhousequeue.app` (solo `web` se publica; la API queda interna). Cero puertos inbound en la VM |
| Zona horaria | `America/Lima` en TODO (crons, fechas mostradas, cálculos de vencimiento). Guardar en Mongo como UTC, convertir en presentación y en schedulers |

Restricciones duras:
- **Cero servicios pagados.** Nada de AWS, ni colas gestionadas, ni APM de pago.
- Imágenes Docker `linux/arm64` (la VM es Ampere). Multi-stage build, base `node:22-alpine`.
- RAM objetivo total < 1 GB (API + worker + web).
- Un solo archivo `.env` por app; plantillas `.env.example` completas y comentadas.
- **PROHIBIDO** en todo el repo: Clave SOL, tokens, secretos hardcodeados. Secretos solo
  por env vars / GitHub Secrets. Añadir un check de CI con `gitleaks` (action gratuita).

---

## 2. Estructura del monorepo

```
tributo/
├── apps/
│   ├── api/          # NestJS: REST + lógica de dominio
│   ├── worker/       # proceso de crons: vencimientos, buzón, detracción, resumen
│   └── web/          # Next.js dashboard
├── packages/
│   ├── core/         # dominio puro sin IO: tipos, cálculo tributario, cronograma
│   └── notify/       # cliente Telegram + email (usado por api y worker)
├── docker-compose.yml
├── .github/workflows/
│   ├── ci.yml        # lint + typecheck + tests + gitleaks
│   └── deploy.yml    # build arm64 + ssh deploy
├── SPEC.md           # este archivo
└── README.md         # setup local, deploy, runbook operativo
```

`DECISIÓN:` `packages/core` no importa nada de Nest/Next/Mongoose. Es TypeScript puro
con tests unitarios exhaustivos. Toda la matemática tributaria vive ahí.

---

## 3. Modelo de datos (Mongoose, DB `tributo`)

Todas las colecciones llevan `createdAt`/`updatedAt` (timestamps de Mongoose).
Montos en **céntimos enteros** (`amountCents: number`) para evitar flotantes;
el core expone helpers `toCents`/`fromCents`. Moneda única PEN.

### 3.1 `settings` (documento único, `_id: "singleton"`)
```ts
{
  _id: "singleton",
  ruc: string,                 // "10727357730"
  rucLastDigit: number,        // derivado, 0
  regimen: "RMT",
  uitCents: number,            // 550000 (S/ 5,500 — UIT 2026). Editable
  igvRate: number,             // 0.18
  detraccionRate: number,      // 0.12
  detraccionThresholdCents: number, // 70000 (S/ 700)
  detraccionCode: string,      // "037"
  pagoCuentaRate: number,      // 0.01
  retencion4taRate: number,    // 0.08
  bnDetraccionAccount: string | null, // nro de cuenta BN (visible, no es secreto)
  clients: [{
    _id: ObjectId,
    name: string,
    ruc: string,
    kind: "FACTURA" | "RXH",
    defaultBaseCents: number   // 900000 para ambos
  }],
  notify: {
    telegramChatId: string,
    email: string,
    reminderDaysBefore: number[],  // default [3, 1]
    dailyDigest: boolean            // default false
  }
}
```

### 3.2 `periods` — un doc por periodo tributario (mes)
```ts
{
  _id: "2026-07",              // YYYY-MM, clave natural
  year: number, month: number,
  dueDate: Date,               // vencimiento F.621 según cronograma y dígito 0
  dueDateSource: "OFFICIAL" | "ESTIMATED",  // 2026 = OFFICIAL; futuro sin R.S. = ESTIMATED
  status: "OPEN" | "DECLARED" | "PAID",     // PAID implica DECLARED
  declaredAt: Date | null,
  paymentRef: string | null,   // nro de orden NPS / constancia
  notes: string
}
```

### 3.3 `invoices` — comprobantes EMITIDOS (factura y RxH)
```ts
{
  _id: ObjectId,
  period: string,              // "2026-07" (FK lógica a periods)
  kind: "FACTURA" | "RXH",
  series: string,              // "E001"
  number: string,              // correlativo
  clientId: ObjectId,          // ref settings.clients
  issueDate: Date,
  baseCents: number,           // FACTURA: base imponible. RXH: monto bruto
  igvCents: number,            // FACTURA: base*0.18. RXH: 0
  totalCents: number,          // FACTURA: base+igv. RXH: = baseCents
  // Solo FACTURA:
  detraccion: {
    applies: boolean,          // total > threshold
    amountCents: number,       // round(total * 0.12) — redondeo: ver §4.2
    depositDueDate: Date,      // 5.º día hábil del mes siguiente a emisión (ver §4.3)
    depositedAt: Date | null,
    constanciaNumber: string | null,
    status: "PENDING" | "DEPOSITED" | "OVERDUE"  // OVERDUE la marca el worker
  } | null,
  // Solo RXH:
  retencion: {
    amountCents: number,       // bruto * 0.08 (si bruto > 1500_00)
  } | null,
  paidAt: Date | null,         // cuándo llegó el pago del cliente
  status: "ISSUED" | "PAID" | "VOIDED"
}
```

### 3.4 `purchases` — facturas de compra (gastos)
```ts
{
  _id: ObjectId,
  period: string,              // periodo de la fecha de emisión
  issueDate: Date,
  supplierName: string,
  supplierRuc: string,         // validar: 11 dígitos, empieza 10|15|17|20
  series: string, number: string,
  concept: string,             // texto libre
  category: "EQUIPO" | "SOFTWARE_CLOUD" | "INTERNET" | "CELULAR" | "CONTADOR" | "OFICINA" | "OTROS",
  baseCents: number,
  igvCents: number,            // editable; default base*0.18
  totalCents: number,
  creditFiscal: boolean,       // usa el IGV como crédito (default true)
  deductibleIR: boolean,       // deduce renta (default true)
  bancarizado: boolean,        // pagado por medio bancario (obligatorio si total > S/ 2,000)
  notes: string
}
```
Regla de UI + API: si `totalCents > 200000` y `bancarizado === false`, aceptar el registro
pero marcar warning persistente (campo derivado en la respuesta, no en DB): "Sin
bancarización pierde crédito fiscal y gasto".

### 3.5 `alerts` — historial de notificaciones enviadas (idempotencia)
```ts
{
  _id: ObjectId,
  dedupeKey: string,           // ÚNICO. ej: "due:2026-07:T-3", "buzon:<gmailMsgId>", "detr:<invoiceId>:overdue"
  type: "DUE_REMINDER" | "BUZON_SOL" | "DETRACCION_PENDING" | "DETRACCION_OVERDUE" | "MONTHLY_DIGEST" | "SYSTEM",
  channel: "TELEGRAM" | "EMAIL",
  sentAt: Date,
  payloadPreview: string       // primeras ~200 chars del mensaje
}
```
`DECISIÓN:` la idempotencia de TODAS las notificaciones se implementa con índice único
sobre `dedupeKey` + upsert; si el insert falla por duplicado, no se envía.

### 3.6 Estado del watcher de buzón
No hay colección propia: el watcher IMAP busca por ventana móvil (últimos 2 días) y la
idempotencia la da `alerts.dedupeKey = "buzon:<Message-ID>"` (§3.5). El app password
vive SOLO en env, nunca en DB.

---

## 4. Reglas de dominio (`packages/core`) — implementar con tests

### 4.1 Cronograma de vencimientos
- Módulo `cronograma.ts` con data estática **oficial 2026** (R.S. 281-2022/SUNAT) para
  el dígito 0 — y la tabla completa 0–9/BC por si cambia el RUC:

```
Periodo 2026 → vencimiento dígito 0:
ene→16/02, feb→16/03, mar→17/04, abr→18/05, may→15/06, jun→15/07,
jul→18/08, ago→15/09, set→16/10, oct→16/11, nov→17/12, dic→18/01/2027
```

- Para periodos SIN tabla oficial cargada (2027+): estimar
  `dueDate = siguiente día hábil >= día 16 del mes siguiente` y marcar
  `dueDateSource: "ESTIMATED"`. Función `getDueDate(period, digit): {date, source}`.
- Días hábiles: lunes–viernes excluyendo feriados. Incluir lista estática de feriados
  nacionales Perú 2026–2027 en `feriados.ts` (editable), con comentario de fuente.
- Al publicarse el cronograma oficial 2027, se actualiza el archivo de data y un
  endpoint admin (`POST /periods/recompute-due-dates`) recalcula los `dueDate` de
  periodos `OPEN` cuyo source sea `ESTIMATED`.

### 4.2 Cálculo de comprobantes
```ts
computeFactura(baseCents, s: Settings) => {
  igvCents:    round(base * s.igvRate),
  totalCents:  base + igv,
  detraccion:  total > s.detraccionThresholdCents
                 ? { amountCents: roundDetraccion(total * s.detraccionRate) }
                 : null,
  netCents:    total - detraccionAmount
}
```
- `round` = redondeo bancario estándar a céntimo (`Math.round`).
- `roundDetraccion`: `DECISIÓN:` el depósito de detracción se redondea a **soles enteros**
  (sin céntimos) según práctica del sistema de pago de obligaciones: usar
  `Math.round(x / 100) * 100` sobre céntimos, pero guardar TAMBIÉN el exacto en un campo
  `exactAmountCents` para conciliar. En el caso base: 12% de 10,620.00 = 1,274.40 →
  depósito esperado S/ 1,274.00; aceptar como "match" cualquier depósito entre el
  exacto y el redondeado ±1 sol.
- `computeRxh(brutoCents)` → `retencion = bruto > 1500_00 ? round(bruto*0.08) : 0`,
  `neto = bruto − retención`.

### 4.3 Fecha límite del depósito de detracción
El pagador debe depositar como máximo en la **fecha de pago** o el **5.º día hábil del
mes siguiente a la emisión**, lo que ocurra primero. Como la fecha de pago real puede no
conocerse, `DECISIÓN:` calcular `depositDueDate = 5.º día hábil del mes siguiente a
issueDate` y, si se registra `paidAt` anterior, ajustarla a `paidAt`.

### 4.4 Liquidación del periodo (para el dashboard)
`computePeriodSummary(period, invoices[], purchases[], settings)`:
```
ventasBase   = Σ facturas.base            (solo kind FACTURA, status != VOIDED)
igvVentas    = Σ facturas.igv
comprasBase  = Σ purchases.base  (creditFiscal=true)
igvCompras   = Σ purchases.igv   (creditFiscal=true)
igvPagar     = max(0, igvVentas − igvCompras − saldoFavorAnterior)
saldoFavor   = max(0, igvCompras + saldoFavorAnterior − igvVentas)
pagoCuenta   = round(ventasBase * 0.01)
totalMes     = igvPagar + pagoCuenta
detrDisponibleEstimada = Σ detracciones DEPOSITED del periodo (estimador simple)
npsEstimado  = max(0, totalMes − detrDisponibleEstimada)
```
`saldoFavorAnterior` se lee del summary del periodo previo (persistir el resultado en
`periods` como subdocumento `summaryCache` al cerrar, o computar en cadena desde el
primer periodo — `DECISIÓN:` computar en cadena, el volumen es mínimo).

### 4.5 Proyección anual (informativa, solo dashboard)
`computeAnnualProjection(year)`: renta neta = Σ ventasBase − Σ compras deducibles −
`otrosGastosCents` (campo editable en settings); IR RMT = 10% hasta 15×UIT + 29.5%
exceso; menos Σ pagos a cuenta → `regularizacionEstimada`. Mostrar también
`gastosFaltantesParaTramo10 = max(0, rentaNeta − 15×UIT)`.

---

## 5. API (NestJS) — contrato REST

Prefijo `/api/v1`. JSON. Sin auth de usuarios (single-user; la API no se expone a internet —
solo la alcanza `web` por la red interna del compose), PERO:
`DECISIÓN:` middleware global que exige header `X-Api-Key` == env `API_KEY` en toda
ruta mutante (POST/PUT/PATCH/DELETE); GET libres dentro de la red interna.

Endpoints (DTOs con `class-validator`, errores RFC-7807 style `{status,title,detail}`):

```
GET    /health                      → {ok, db, uptime}
GET    /settings                    → settings (sin campos de notify secretos)
PATCH  /settings                    → actualizar UIT, cuenta BN, clients, notify prefs

GET    /periods?year=2026           → lista con summary computado
GET    /periods/:id                 → detalle + summary + comprobantes del periodo
POST   /periods/:id/declare         → {declaredAt?, paymentRef?} → status DECLARED/PAID
POST   /periods/recompute-due-dates → recalcula ESTIMATED (ver §4.1)

GET    /invoices?period=2026-07
POST   /invoices                    → crear (server computa igv/total/detraccion/retencion;
                                       cliente solo manda kind, clientId, series, number,
                                       issueDate, baseCents)
PATCH  /invoices/:id                → paidAt, status
POST   /invoices/:id/detraccion-deposit → {depositedAt, constanciaNumber, amountCents}
                                       → valida match según §4.2, status DEPOSITED
DELETE /invoices/:id                → solo si status ISSUED → VOIDED (soft)

GET    /purchases?period=2026-07
POST   /purchases                   → crear (validación RUC proveedor, warning bancarización)
PATCH  /purchases/:id
DELETE /purchases/:id               → hard delete permitido

GET    /alerts?limit=50             → historial
POST   /notify/test                 → dispara mensaje de prueba a Telegram y email
GET    /dashboard                   → payload agregado para la home (ver §7)
```

Reglas transversales:
- Crear invoice/purchase con `period` inexistente → crear el `period` on-the-fly con
  su `dueDate` calculado.
- Validaciones de negocio en servicio, no en controller. Tests e2e con `mongodb-memory-server`.

---

## 6. Worker — jobs programados (todos en `America/Lima`)

Proceso Node independiente (`apps/worker`). Cada job: log estructurado (pino) con
resultado, y captura de errores con notificación `SYSTEM` a Telegram si un job
falla 3 ejecuciones seguidas (contador en memoria basta).

| Job | Cron | Lógica |
|---|---|---|
| `due-reminders` | `0 9 * * *` (09:00) | Para cada periodo `OPEN`: si hoy == dueDate − N (N ∈ settings.notify.reminderDaysBefore) o hoy == dueDate → enviar recordatorio. dedupeKey `due:<period>:T-<N>`. Mensaje incluye: periodo, fecha exacta, resumen (`igvPagar`, `pagoCuenta`, `npsEstimado`) y si `dueDateSource=ESTIMATED` el sufijo "⚠️ fecha estimada — confirmar cronograma oficial" |
| `buzon-watcher` | `*/15 * * * *` | IMAP (`imapflow`) contra `imap.gmail.com` con `SMTP_USER`/`SMTP_APP_PASSWORD`. Search: `FROM sunat.gob.pe SINCE (hoy − 2 días)`. Por cada mensaje nuevo no alertado: Telegram "📬 Notificación SUNAT: <subject>" + dedupeKey `buzon:<Message-ID>`. NUNCA parsear/almacenar el cuerpo completo; guardar solo subject y fecha |
| `detraccion-check` | `0 9 * * *` | Facturas con `detraccion.status=PENDING`: si hoy > depositDueDate → status OVERDUE + alerta `detr:<id>:overdue` ("Reclamar constancia al cliente"). Si faltan ≤2 días hábiles → recordatorio suave `detr:<id>:soon` |
| `monthly-digest` | `0 9 1 * *` | Si settings.notify.dailyDigest o siempre el día 1: resumen del mes anterior (facturado, compras, IGV estimado, estado declaración) + checklist del mes nuevo |
| `period-bootstrap` | `0 1 1 * *` | Crea el doc del periodo del mes que inicia si no existe, con dueDate calculado |

Mensajes Telegram: texto plano con emojis moderados, SIEMPRE con montos formateados
`S/ 1,274.40` y fechas `mar 18/08/2026`. Plantillas centralizadas en `packages/notify`.

### Buzón por IMAP — setup requerido (documentar en README paso a paso)
1. Cuenta Google con 2FA activado → generar **App Password** (el mismo sirve para SMTP e IMAP).
2. Habilitar IMAP en Gmail (Configuración → Reenvío y correo POP/IMAP).
3. Nada más: sin OAuth, sin proyecto en Google Cloud, sin tokens que expiren.
   El trade-off aceptado: el app password da acceso completo al buzón (no solo lectura);
   vive únicamente en el `.env` de la VM privada.

---

## 7. Frontend (Next.js) — pantallas

Diseño sobrio, dark-mode por defecto, mobile-first (se usará desde iPhone vía
`tributo.inhousequeue.app`, detrás de Cloudflare Access).
Server components para lectura; mutaciones vía route handlers que proxean a la API con
`API_KEY` del server (la key nunca llega al browser).

1. **/ (Dashboard)** — todo lo importante en una pantalla:
   - Card "Próximo vencimiento": periodo, fecha, días restantes, badge OFFICIAL/ESTIMATED,
     botón "Marcar declarado".
   - Card "Mes en curso": facturado, IGV estimado a pagar, pago a cuenta, NPS estimado.
   - Card "Detracciones": pendientes/overdue con días.
   - Card "Proyección anual": renta neta, IR estimado, regularización estimada,
     "te faltan S/ X en gastos para quedarte en el tramo 10%".
   - Feed últimas 10 alerts.
2. **/periodos** — tabla por año: periodo, vencimiento, estado (chip), IGV, acciones
   (declarar, ver detalle). Detalle `/periodos/[id]`: summary + comprobantes + compras.
3. **/comprobantes** — lista + formulario de alta (modal). El form de FACTURA muestra
   en vivo el desglose base→IGV→total→detracción→neto al escribir la base.
   Acción rápida "Registrar depósito de detracción" (fecha + nro constancia).
4. **/compras** — lista + alta rápida (los 8 campos), filtro por periodo y categoría,
   totales del periodo al pie, warnings de bancarización visibles.
5. **/config** — settings editables: UIT, cuenta BN, clientes, chatId Telegram,
   días de recordatorio, botón "Enviar notificación de prueba".

Sin librería de estado global; fetch + revalidación de Next basta.

---

## 8. Infra y deploy

### 8.1 docker-compose.yml (en la VM)
Servicios: `api` (expose 3001, interno), `worker` (sin puertos), `web` (expose 3000, interno)
y `cloudflared` (túnel propio de Tributo, token por env; public hostname
`tributo.inhousequeue.app` → `http://web:3000`). **Sin `ports:` públicos en ningún servicio** —
todo inbound entra por el túnel, y solo `web`. Stack y red de compose independientes del stack
de la liga que ya corre en la misma VM (no compartir redes ni volúmenes).
Mongo NO se levanta local — se usa Atlas (env `MONGODB_URI`; **proyecto Atlas nuevo con su
propio M0**, no el cluster de la liga). `restart: unless-stopped`.
Healthchecks de compose sobre `/health` (api) y `/` (web). Logging json-file max 10m/3.
**Cloudflare Access**: application sobre `tributo.inhousequeue.app` con policy que permite
SOLO el email del dueño (OTP). Documentar la configuración en el README.

### 8.2 GitHub Actions
- `ci.yml` (push/PR): pnpm install → lint (eslint) → typecheck → tests (vitest en core,
  jest en api) → `gitleaks/gitleaks-action`.
- `deploy.yml` (push a `main`, tras CI verde): SSH a la VM (secrets `SSH_HOST` — IP pública
  de la caja—, `SSH_USER`, `SSH_KEY`) → `git pull && docker compose up -d --build`
  (build **nativo arm64 en la caja**, patrón ya probado en el deploy de inhousequeue;
  sin GHCR ni buildx cross-compile) → smoke test `curl http://localhost:3001/api/v1/health`
  dentro de la VM.

### 8.3 VM (existente — documentar en README, sección "Provisioning")
- Se **reusa la VM Oracle de inhousequeue** (Ubuntu 24.04 ARM, Docker ya instalado,
  cuenta ya en PAYG). No hay provisioning de caja nueva.
- Clonar este repo en su propio directorio; `.env` con `chmod 600`, gitignored.
- Cloudflare: crear un **tunnel nuevo** para Tributo (token → env) + **Access application**
  sobre `tributo.inhousequeue.app` (policy: solo el email del dueño, OTP).
- Atlas: **proyecto nuevo** con su M0; allowlist = IP pública reservada de la VM (ya reservada
  para la liga).
- La caja ya tiene el cron `@daily docker system prune -af --filter "until=168h"` — compatible
  con este stack (no borra imágenes en uso).

### 8.4 Variables de entorno (todas en `.env.example` con comentario)
```
MONGODB_URI=            # Atlas M0 (proyecto propio), IP allowlist: IP pública reservada de la VM
API_KEY=                # random 32+ chars — mismo valor en api y web (server-side)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SMTP_USER=              # gmail — usado para SMTP (email respaldo) e IMAP (watcher buzón)
SMTP_APP_PASSWORD=      # app password (2FA requerido), no la contraseña real
CLOUDFLARE_TUNNEL_TOKEN=  # túnel propio de Tributo (no el de la liga)
TZ=America/Lima
```

---

## 9. Calidad — Definition of Done

1. `packages/core` con cobertura ≥ 90% en: cronograma (incl. feriados y estimados),
   redondeos de detracción (caso 10,620 → 1,274.40/1,274), computeFactura, computeRxh,
   computePeriodSummary con arrastre de saldo a favor en cadena, proyección anual con
   cruce de tramo 15 UIT.
2. Tests e2e de api para el flujo completo del "mes tipo": crear factura → registrar
   depósito → crear 3 compras → GET summary → declare → verificar estados.
3. `docker compose up` local con Atlas de prueba levanta los 3 servicios sanos.
4. README con: setup local en ≤ 10 comandos, deploy en la VM existente (túnel + Access),
   guía app password de Google (SMTP + IMAP),
   guía creación bot Telegram (BotFather → token → obtener chat_id vía getUpdates),
   runbook: "qué hago si no llegó el recordatorio", "cómo actualizo el cronograma 2027",
   "cómo actualizo la UIT en enero".
5. Seed script `pnpm seed` que crea: settings con los valores de §0, el periodo 2026-07
   con dueDate 2026-08-18, la factura tipo (9,000 + IGV, detracción 1,274.40) y el RxH
   tipo (9,000, retención 720) como datos de ejemplo marcados `notes: "SEED"`.

## 10. Orden de implementación sugerido (fases commit-eables)

1. Scaffold monorepo + tooling + CI verde vacío.
2. `packages/core` completo con tests (cronograma, cálculos, summary, proyección).
3. `apps/api`: modelos + endpoints + e2e.
4. `packages/notify` + `apps/worker` (due-reminders y detraccion-check primero;
   buzon-watcher después — sin OAuth la fricción es mínima).
5. `apps/web` (dashboard → comprobantes → compras → periodos → config).
6. Docker + deploy.yml + README/runbook + seed.

> Cualquier ambigüedad no cubierta por este SPEC: resolver con la opción más simple
> que preserve las invariantes de §4, y dejar nota en `DECISIONS.md`.
