import {
  Controller,
  Get,
  Injectable,
  Module,
  Query,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { lastBusinessDaysOfMonth, todayLimaIso } from '@tributo/core';

// Tipo de cambio USD→PEN publicado por SUNAT. La página oficial de SUNAT bloquea las
// consultas automáticas (WAF), así que se consulta un servicio que replica su tabla por fecha.
// Cada día consultado se guarda: una vez obtenido no se vuelve a pedir y queda trazabilidad.
const SOURCE = 'SUNAT (vía apis.net.pe)';
const ENDPOINT = 'https://api.apis.net.pe/v1/tipo-cambio-sunat';

@Schema({ collection: 'fxrates' })
class FxRate {
  @Prop({ required: true }) _id!: string; // YYYY-MM-DD
  @Prop({ required: true }) compra!: number;
  @Prop({ required: true }) venta!: number;
  @Prop({ default: SOURCE }) source!: string;
}
type FxRateDoc = HydratedDocument<FxRate>;
const FxRateSchema = SchemaFactory.createForClass(FxRate);

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class FxService {
  constructor(@InjectModel(FxRate.name) private readonly model: Model<FxRateDoc>) {}

  /** Un día de SUNAT: de caché, o consultando. null si ese día no hay dato. */
  private async day(date: string): Promise<{ compra: number; venta: number } | null> {
    const cached = await this.model.findById(date).lean();
    if (cached) return { compra: cached.compra, venta: cached.venta };
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${ENDPOINT}?fecha=${date}`, {
        signal: AbortSignal.timeout(10_000),
        headers: { accept: 'application/json' },
      });
      if (res.status === 429 && attempt === 0) {
        await sleep(3000); // el servicio limita las consultas seguidas
        continue;
      }
      if (!res.ok) return null;
      const j = (await res.json()) as { fecha?: string; compra?: number; venta?: number };
      // Si ese día no hay dato, el servicio puede devolver otra fecha: no sirve.
      if (j.fecha !== date || !(j.compra! > 0) || !(j.venta! > 0)) return null;
      await this.model.updateOne(
        { _id: date },
        { $set: { compra: j.compra, venta: j.venta, source: SOURCE } },
        { upsert: true },
      );
      return { compra: j.compra!, venta: j.venta! };
    }
    return null;
  }

  /**
   * Tipo de cambio del mes: promedio de los últimos 3 días hábiles (lun–vie) del mes.
   * Mes en curso → los 3 últimos hábiles hasta hoy (provisional).
   */
  async usdForMonth(period: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new BadRequestException('period debe ser YYYY-MM');
    const today = todayLimaIso();
    const dates = lastBusinessDaysOfMonth(period, 3, today);
    const finalDates = lastBusinessDaysOfMonth(period, 3);
    const provisional = dates.join() !== finalDates.join();

    const days: { date: string; compra: number; venta: number }[] = [];
    const missing: string[] = [];
    for (const [i, date] of dates.entries()) {
      try {
        const cachedBefore = await this.model.exists({ _id: date });
        const d = await this.day(date);
        if (d) days.push({ date, ...d });
        else missing.push(date);
        if (!cachedBefore && i < dates.length - 1) await sleep(1200);
      } catch {
        missing.push(date);
      }
    }
    if (days.length === 0) {
      throw new ServiceUnavailableException(
        'No se pudo consultar el tipo de cambio de SUNAT. Ingrésalo manualmente.',
      );
    }
    const avg = (k: 'compra' | 'venta') => round3(days.reduce((a, d) => a + d[k], 0) / days.length);
    return {
      period,
      kind: 'venta' as const,
      rate: avg('venta'),
      compraAvg: avg('compra'),
      source: SOURCE,
      provisional,
      days,
      missing,
    };
  }
}

@Controller('fx')
class FxController {
  constructor(private readonly service: FxService) {}

  @Get('usd')
  usd(@Query('period') period: string) {
    return this.service.usdForMonth(period);
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: FxRate.name, schema: FxRateSchema }])],
  controllers: [FxController],
  providers: [FxService],
})
export class FxModule {}
