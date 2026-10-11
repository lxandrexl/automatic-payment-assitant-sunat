import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';

// Valor de prueba generado (no es un secreto): evita que gitleaks lo confunda con una clave real.
const API_KEY = 'k'.repeat(24);

// RxH en USD con retención del 10% en el exterior + F.621 y F.616 pagados por separado.
describe('RxH en dólares y pago separado de F.621 / F.616', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let jordanId: string;
  let metricaId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGODB_URI = mongod.getUri();
    process.env.API_KEY = API_KEY;
    process.env.RUC = '10727357730';
    process.env.RUC_LAST_DIGIT = '0';

    const { AppModule } = await import('../src/app.module');
    const { ApiKeyGuard } = await import('../src/common/api-key.guard');
    const { ProblemFilter } = await import('../src/common/problem.filter');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalGuards(new ApiKeyGuard(API_KEY));
    app.useGlobalFilters(new ProblemFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await mongod?.stop();
  });

  const auth = (req: request.Test) => req.set('X-Api-Key', API_KEY);
  const api = () => request(app.getHttpServer());

  it('configura clientes: Métrica (factura) y Jordan (USD, retiene 10% afuera)', async () => {
    const res = await auth(
      api()
        .patch('/api/v1/settings')
        .send({
          clients: [
            { name: 'Métrica', ruc: '20123456789', kind: 'FACTURA', defaultBaseCents: 400000 },
            {
              name: 'Empresas Jordan',
              ruc: 'EXT-1',
              kind: 'RXH',
              defaultBaseCents: 0,
              domiciliado: false,
              currency: 'USD',
              retencionExteriorRate: 0.1,
            },
          ],
        }),
    ).expect(200);
    metricaId = res.body.clients[0]._id;
    jordanId = res.body.clients[1]._id;
    expect(res.body.clients[1]).toMatchObject({ currency: 'USD', retencionExteriorRate: 0.1 });
  });

  it('RxH de 2,800 USD: base en Perú = 2,800 × TC; llegan 2,520 USD al banco', async () => {
    const res = await auth(
      api().post('/api/v1/invoices').send({
        kind: 'RXH',
        clientId: jordanId,
        series: 'E001',
        number: '23',
        issueDate: '2026-09-28',
        baseCents: 0, // el servidor lo recalcula desde foreignGrossCents
        foreignGrossCents: 280000,
        exchangeRate: 3.43,
      }),
    ).expect(201);
    expect(res.body.baseCents).toBe(960400);
    expect(res.body.retencion.amountCents).toBe(0);
    expect(res.body.foreign).toMatchObject({ grossCents: 280000, withholdingCents: 28000, exchangeRate: 3.43 });

    const income = await api().get('/api/v1/income?year=2026').expect(200);
    const line = income.body.months[0].lines[0];
    expect(line.baseCents).toBe(960400); // se declara el bruto completo
    expect(line.netoBancoCents).toBe(960400 - Math.round(28000 * 3.43)); // lo que llega, ≈ 2,520 USD
  });

  it('un RxH en USD sin tipo de cambio se rechaza', async () => {
    await auth(
      api().post('/api/v1/invoices').send({
        kind: 'RXH', clientId: jordanId, series: 'E001', number: '24',
        issueDate: '2026-09-29', baseCents: 0, foreignGrossCents: 100000,
      }),
    ).expect(400);
  });

  it('el mes sigue OPEN hasta pagar F.621 y F.616, cada uno por separado', async () => {
    await auth(
      api().post('/api/v1/invoices').send({
        kind: 'FACTURA', clientId: metricaId, series: 'E001', number: '1',
        issueDate: '2026-09-10', baseCents: 400000,
      }),
    ).expect(201);

    const before = await api().get('/api/v1/periods/2026-09').expect(200);
    expect(before.body.status).toBe('OPEN');
    expect(before.body.summary.pago616Cents).toBe(76832); // 8% de S/ 9,604.00

    // Se paga primero el F.616 (como en la vida real): el mes sigue abierto.
    const r616 = await auth(
      api().post('/api/v1/periods/2026-09/payments/f616').send({ paidAt: '2026-10-10', amountCents: 76900, ref: '7848179635' }),
    ).expect(201);
    expect(r616.body.status).toBe('OPEN');
    expect(r616.body.f616Payment).toMatchObject({ amountCents: 76900, ref: '7848179635' });
    expect(r616.body.f621Payment).toBeNull();

    // Al pagar también el F.621, el mes pasa a PAID.
    const r621 = await auth(
      api().post('/api/v1/periods/2026-09/payments/f621').send({ paidAt: '2026-10-14', amountCents: 0 }),
    ).expect(201);
    expect(r621.body.status).toBe('PAID');

    // Deshacer un pago lo reabre.
    const undone = await auth(api().delete('/api/v1/periods/2026-09/payments/f616')).expect(200);
    expect(undone.body.status).toBe('OPEN');
    expect(undone.body.f616Payment).toBeNull();
  });

  it('rechaza un formulario inválido', async () => {
    await auth(
      api().post('/api/v1/periods/2026-09/payments/f999').send({ paidAt: '2026-10-10', amountCents: 1 }),
    ).expect(400);
  });
});
