// Tipos del payload de la API (subconjunto que consume la web).

export interface PeriodSummary {
  ventasBaseCents: number;
  igvVentasCents: number;
  comprasBaseCents: number;
  igvComprasCents: number;
  igvPagarCents: number;
  saldoFavorCents: number;
  pagoCuentaCents: number;
  totalMesCents: number;
  detrDisponibleEstimadaCents: number;
  npsEstimadoCents: number;
  rxhBrutoCents: number;
  pago616Cents: number;
}

export interface FormPayment {
  paidAt: string;
  amountCents: number;
  ref: string;
}

export interface Period {
  _id: string;
  year: number;
  month: number;
  dueDate: string;
  dueDateSource: 'OFFICIAL' | 'ESTIMATED';
  status: 'OPEN' | 'DECLARED' | 'PAID';
  /** F.621 y F.616 se pagan por separado. */
  f621Payment?: FormPayment | null;
  f616Payment?: FormPayment | null;
  summary?: PeriodSummary;
}

export interface Detraccion {
  applies: boolean;
  amountCents: number;
  exactAmountCents: number;
  depositDueDate: string;
  depositedAt: string | null;
  constanciaNumber: string | null;
  reference?: string;
  status: 'PENDING' | 'DEPOSITED' | 'OVERDUE';
}

export interface Invoice {
  _id: string;
  period: string;
  kind: 'FACTURA' | 'RXH';
  series: string;
  number: string;
  clientId: string;
  issueDate: string;
  baseCents: number;
  igvCents: number;
  totalCents: number;
  detraccion: Detraccion | null;
  retencion: { amountCents: number } | null;
  /** RxH cobrado en moneda extranjera (montos en céntimos de esa moneda; baseCents va en soles). */
  foreign?: {
    currency: 'USD';
    grossCents: number;
    exchangeRate: number;
    withholdingCents: number;
    /** De dónde salió el tipo de cambio (SUNAT, días promediados) o MANUAL. */
    rateInfo?: { source: string; kind: 'venta' | 'compra'; dates: string[]; values: number[]; provisional: boolean } | null;
  } | null;
  status: 'ISSUED' | 'PAID' | 'VOIDED';
}

export interface Purchase {
  _id: string;
  period: string;
  issueDate: string;
  supplierName: string;
  supplierRuc: string;
  series: string;
  number: string;
  concept: string;
  category: string;
  baseCents: number;
  igvCents: number;
  totalCents: number;
  creditFiscal: boolean;
  deductibleIR: boolean;
  bancarizado: boolean;
  notes: string;
  bancarizacionWarning: string | null;
}

export interface Client {
  _id: string;
  name: string;
  ruc: string;
  kind: 'FACTURA' | 'RXH';
  defaultBaseCents: number;
  domiciliado: boolean;
  currency?: 'PEN' | 'USD';
  /** % que el cliente retiene en SU país (0–1). No es impuesto peruano. */
  retencionExteriorRate?: number;
}

export interface Settings {
  _id: string;
  ruc: string;
  rucLastDigit: number;
  uitCents: number;
  igvRate: number;
  detraccionRate: number;
  detraccionThresholdCents: number;
  pagoCuentaRate: number;
  retencion4taRate: number;
  otrosGastosCents: number;
  gastos3UitCents: number;
  bnDetraccionAccount: string | null;
  clients: Client[];
  notify: {
    telegramChatId: string;
    email: string;
    reminderDaysBefore: number[];
    dailyDigest: boolean;
  };
}

export interface AnnualProjection {
  rentaNetaCents: number;
  irEstimadoCents: number;
  regularizacionEstimadaCents: number;
  gastosFaltantesParaTramo10Cents: number;
}

export interface IncomeLine {
  id: string;
  kind: 'FACTURA' | 'RXH';
  ref: string;
  issueDate: string;
  baseCents: number;
  igvCents: number;
  totalCents: number;
  detraccionDepositoCents: number;
  retencionCents: number;
  retencionExteriorCents?: number;
  foreign?: Invoice['foreign'];
  netoBancoCents: number;
}

export interface MonthIncome {
  period: string;
  emitidoCents: number;
  igvCents: number;
  detraccionDepositoCents: number;
  retencionCents: number;
  netoBancoCents: number;
  lines: IncomeLine[];
}

export interface IncomeYear {
  year: number;
  months: MonthIncome[];
  totals: Omit<MonthIncome, 'period' | 'lines'>;
}

export interface Alert {
  _id: string;
  type: string;
  channel: string;
  sentAt: string;
  payloadPreview: string;
}

export interface Renta4taProjection {
  deduccion20Cents: number;
  rentaNeta4taCents: number;
  rentaNetaTrabajoCents: number;
  irAnualCents: number;
  saldoCents: number;
}

export interface Dashboard {
  today: string;
  nextDue: {
    period: string;
    dueDate: string;
    source: string;
    status: string;
    summary: PeriodSummary | null;
    pagos?: { f621: FormPayment | null; f616: FormPayment | null };
  } | null;
  currentPeriod: { period: string; summary: PeriodSummary } | null;
  detracciones: {
    id: string;
    period: string;
    amountCents: number;
    depositDueDate: string | null;
    status: string;
  }[];
  projection: AnnualProjection;
  projection4ta: Renta4taProjection;
  rentaAnual: { ejercicio: number; dueDate: string; source: 'OFFICIAL' | 'ESTIMATED' };
  recentAlerts: Alert[];
}
