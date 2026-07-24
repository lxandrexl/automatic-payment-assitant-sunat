import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';

const API_KEY = 'test-key-1234567890';

describe('Flujo del mes tipo (SPEC §9.2)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let clientId: string;

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

  it('health responde ok con db up', async () => {
    const res = await api().get('/api/v1/health').expect(200);
    expect(res.body).toMatchObject({ ok: true, db: 'up' });
  });

  it('rechaza mutaciones sin X-Api-Key (401)', async () => {
    await api().patch('/api/v1/settings').send({ uitCents: 550000 }).expect(401);
  });

  let clienteChilenoId: string;

  it('crea los clientes en settings (uno domiciliado, uno chileno)', async () => {
    const res = await auth(
      api()
        .patch('/api/v1/settings')
        .send({
          clients: [
            { name: 'Cliente Empresa', ruc: '20123456789', kind: 'FACTURA', defaultBaseCents: 900000 },
            { name: 'Cliente Chile', ruc: '76543210-5', kind: 'RXH', defaultBaseCents: 900000, domiciliado: false },
          ],
        }),
    ).expect(200);
    clientId = res.body.clients[0]._id;
    clienteChilenoId = res.body.clients[1]._id;
    expect(res.body.clients[1].domiciliado).toBe(false);
  });

  it('crea la factura tipo: server computa IGV, total y detracción; crea el periodo on-the-fly', async () => {
    const res = await auth(
      api().post('/api/v1/invoices').send({
        kind: 'FACTURA',
        clientId,
        series: 'E001',
        number: '1',
        issueDate: '2026-07-20',
        baseCents: 900000,
      }),
    ).expect(201);
    expect(res.body.igvCents).toBe(162000);
    expect(res.body.totalCents).toBe(1062000);
    expect(res.body.detraccion.amountCents).toBe(127400);
    expect(res.body.detraccion.exactAmountCents).toBe(127440);
    expect(res.body.detraccion.status).toBe('PENDING');
    expect(res.body.period).toBe('2026-07');

    // El periodo se creó con el vencimiento oficial 2026-08-18.
    const period = await auth(api().get('/api/v1/periods/2026-07')).expect(200);
    expect(period.body.dueDateSource).toBe('OFFICIAL');
    expect(period.body.dueDate).toContain('2026-08-18');
  });

  it('registra el depósito de detracción (match dentro de la banda)', async () => {
    const invoices = await auth(api().get('/api/v1/invoices?period=2026-07')).expect(200);
    const id = invoices.body[0]._id;
    const res = await auth(
      api()
        .post(`/api/v1/invoices/${id}/detraccion-deposit`)
        .send({ depositedAt: '2026-07-31', constanciaNumber: 'C-001', amountCents: 127440 }),
    ).expect(201);
    expect(res.body.detraccion.status).toBe('DEPOSITED');
  });

  it('rechaza un depósito fuera de la banda ±1 sol', async () => {
    const invoices = await auth(api().get('/api/v1/invoices?period=2026-07')).expect(200);
    const id = invoices.body[0]._id;
    await auth(
      api()
        .post(`/api/v1/invoices/${id}/detraccion-deposit`)
        .send({ depositedAt: '2026-07-31', constanciaNumber: 'X', amountCents: 100000 }),
    ).expect(400);
  });

  it('crea el RxH: retención 8%, sin IGV ni detracción', async () => {
    const res = await auth(
      api().post('/api/v1/invoices').send({
        kind: 'RXH',
        clientId,
        series: 'E001',
        number: 'R1',
        issueDate: '2026-07-15',
        baseCents: 900000,
      }),
    ).expect(201);
    expect(res.body.igvCents).toBe(0);
    expect(res.body.detraccion).toBeNull();
    expect(res.body.retencion.amountCents).toBe(72000);
  });

  it('RxH a cliente chileno: SIN retención (no domiciliado)', async () => {
    const res = await auth(
      api().post('/api/v1/invoices').send({
        kind: 'RXH',
        clientId: clienteChilenoId,
        series: 'E001',
        number: 'R2',
        issueDate: '2026-07-16',
        baseCents: 900000,
      }),
    ).expect(201);
    expect(res.body.retencion.amountCents).toBe(0);
    expect(res.body.totalCents).toBe(900000);
  });

  it('crea 3 compras; una sin bancarizar > S/2000 trae warning', async () => {
    await auth(
      api().post('/api/v1/purchases').send({
        issueDate: '2026-07-10',
        supplierName: 'Proveedor A',
        supplierRuc: '20111111111',
        series: 'F001',
        number: '100',
        category: 'SOFTWARE_CLOUD',
        baseCents: 100000,
        bancarizado: true,
      }),
    ).expect(201);
    await auth(
      api().post('/api/v1/purchases').send({
        issueDate: '2026-07-12',
        supplierName: 'Proveedor B',
        supplierRuc: '10222222222',
        series: 'F001',
        number: '101',
        category: 'EQUIPO',
        baseCents: 50000,
        bancarizado: true,
      }),
    ).expect(201);
    const big = await auth(
      api().post('/api/v1/purchases').send({
        issueDate: '2026-07-14',
        supplierName: 'Proveedor C',
        supplierRuc: '20333333333',
        series: 'F001',
        number: '102',
        category: 'OFICINA',
        baseCents: 300000,
        bancarizado: false,
      }),
    ).expect(201);
    expect(big.body.bancarizacionWarning).toMatch(/bancarización/);
  });

  it('rechaza compra con RUC de proveedor inválido (400)', async () => {
    await auth(
      api().post('/api/v1/purchases').send({
        issueDate: '2026-07-10',
        supplierName: 'Malo',
        supplierRuc: '99999999999',
        series: 'F', number: '1', category: 'OTROS', baseCents: 1000,
      }),
    ).expect(400);
  });

  it('GET summary del periodo refleja el mes tipo', async () => {
    const res = await auth(api().get('/api/v1/periods/2026-07')).expect(200);
    const s = res.body.summary;
    expect(s.ventasBaseCents).toBe(900000); // solo la factura, no el RxH
    expect(s.igvVentasCents).toBe(162000);
    expect(s.igvComprasCents).toBe(18000 + 9000 + 54000); // 18% de 100k+50k+300k con crédito
    expect(s.pagoCuentaCents).toBe(9000);
    // detracción ya DEPOSITED → disponible reduce el NPS
    expect(s.detrDisponibleEstimadaCents).toBe(127400);
    // 2 RxH de 9,000: uno retenido (720), el chileno no → F.616 = 1,440 − 720 = 720
    expect(s.rxhBrutoCents).toBe(1800000);
    expect(s.pago616Cents).toBe(72000);
  });

  it('declara el periodo con pago → status PAID', async () => {
    const res = await auth(
      api().post('/api/v1/periods/2026-07/declare').send({ paymentRef: 'NPS-999' }),
    ).expect(201);
    expect(res.body.status).toBe('PAID');
    expect(res.body.paymentRef).toBe('NPS-999');
  });

  it('el dashboard agrega el estado del mes', async () => {
    const res = await auth(api().get('/api/v1/dashboard')).expect(200);
    expect(res.body).toHaveProperty('projection');
    expect(res.body).toHaveProperty('detracciones');
    expect(Array.isArray(res.body.recentAlerts)).toBe(true);
  });
});
