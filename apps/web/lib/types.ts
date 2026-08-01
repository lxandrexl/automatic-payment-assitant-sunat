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

export interface Period {
  _id: string;
  year: number;
  month: number;
  dueDate: string;
  dueDateSource: 'OFFICIAL' | 'ESTIMATED';
  status: 'OPEN' | 'DECLARED' | 'PAID';
  summary?: PeriodSummary;
}

export interface Detraccion {
  applies: boolean;
  amountCents: number;
  exactAmountCents: number;
  depositDueDate: string;
  depositedAt: string | null;
  constanciaNumber: string | null;
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
