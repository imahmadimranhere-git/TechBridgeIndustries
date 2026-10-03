import { addDays } from 'date-fns';
import request from 'supertest';
import createApp from '../../src/app.js';
import { Client, Staff, User } from '../../src/models/index.js';
import * as DealService from '../../src/services/DealService.js';
import * as InvoiceService from '../../src/services/InvoiceService.js';
import * as PaymentService from '../../src/services/PaymentService.js';
import { invalidateSettingsCache, updateSettings } from '../../src/services/SettingsService.js';
import * as UserService from '../../src/services/UserService.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/testDb.js';

const app = createApp();
const rs = (rupees) => Math.round(rupees * 100);
const OWNER = { email: 'owner@test.com', password: 'Secret123' };

let admin;
let cookie;

beforeAll(startTestDb);
beforeEach(async () => {
  admin = await User.create({ name: 'Owner', ...OWNER });
  const login = await request(app).post('/api/auth/login').send(OWNER);
  cookie = login.headers['set-cookie'][0];
});
afterEach(async () => {
  await clearTestDb();
  invalidateSettingsCache();
});
afterAll(stopTestDb);

/* ---------------- helpers ---------------- */

async function setup() {
  const client = await Client.create({ name: 'Acme Traders' });
  const staff = await Staff.create({ name: 'Ali', commissionType: 'percentage', commissionRate: 10 });
  const deal = await DealService.createDeal(
    {
      client: String(client._id),
      title: 'Website',
      description: '',
      dealAmount: rs(100000),
      startDate: new Date(),
      deadline: null,
      assignedStaff: String(staff._id),
      status: 'In Progress',
      notes: '',
    },
    admin
  );
  return { client, staff, deal };
}

// Subtotal 25,000 - discount 5,000 = 20,000 + 10% tax 2,000 = 22,000
const invoiceData = (deal, overrides = {}) => ({
  deal: String(deal._id),
  invoiceDate: new Date(),
  dueDate: addDays(new Date(), 15),
  items: [
    { description: 'Design', qty: 2, rate: rs(10000) },
    { description: 'Hosting', qty: 1, rate: rs(5000) },
  ],
  discount: rs(5000),
  taxPercent: 10,
  notes: '',
  terms: '',
  status: 'Draft',
  ...overrides,
});

/* ---------------- invoices ---------------- */

describe('invoices', () => {
  test('numbers are sequential and totals are calculated by the server', async () => {
    const { deal } = await setup();
    const first = await InvoiceService.createInvoice(invoiceData(deal), admin);
    const second = await InvoiceService.createInvoice(invoiceData(deal), admin);

    expect(first.invoiceNumber).toBe('TBI-0001');
    expect(second.invoiceNumber).toBe('TBI-0002');
    expect(first).toMatchObject({
      subtotal: rs(25000),
      discount: rs(5000),
      taxAmount: rs(2000),
      total: rs(22000),
      status: 'Draft',
    });
  });

  test('the API ignores totals sent by the browser', async () => {
    const { deal } = await setup();
    const res = await request(app)
      .post('/api/invoices')
      .set('Cookie', cookie)
      .send({
        deal: String(deal._id),
        invoiceDate: '2026-10-01',
        dueDate: '2026-10-16',
        items: [
          { description: 'Design', qty: 2, rate: '10,000', amount: 1 },
          { description: 'Hosting', qty: 1, rate: 5000 },
        ],
        discount: '5,000',
        taxPercent: 10,
        subtotal: 1,
        total: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.invoice.total).toBe(rs(22000));
  });

  test('the invoice prefix comes from settings', async () => {
    const { deal } = await setup();
    await updateSettings({ invoicePrefix: 'INV' });
    const invoice = await InvoiceService.createInvoice(invoiceData(deal), admin);
    expect(invoice.invoiceNumber).toBe('INV-0001');
  });

  test('duplicate creates a new draft; mark as sent works', async () => {
    const { deal } = await setup();
    const original = await InvoiceService.createInvoice(invoiceData(deal, { status: 'Sent' }), admin);
    const copy = await InvoiceService.duplicateInvoice(original._id, admin);

    expect(copy.invoiceNumber).toBe('TBI-0002');
    expect(copy.status).toBe('Draft');
    expect(copy.total).toBe(original.total);

    const sent = await InvoiceService.markAsSent(copy._id);
    expect(sent.status).toBe('Sent');
    expect(sent.sentAt).toBeInstanceOf(Date);
  });

  test('an invoice with payments cannot be deleted', async () => {
    const { deal } = await setup();
    const invoice = await InvoiceService.createInvoice(invoiceData(deal, { status: 'Sent' }), admin);
    await PaymentService.createPayment(
      {
        deal: String(deal._id),
        invoice: String(invoice._id),
        amount: rs(1000),
        date: new Date(),
        method: 'Cash',
        reference: '',
        note: '',
        confirmOverpay: false,
      },
      admin
    );
    await expect(InvoiceService.deleteInvoice(invoice._id)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('the next invoice number can jump forward but never reuse a number', async () => {
    const { deal } = await setup();
    await InvoiceService.createInvoice(invoiceData(deal), admin);
    await InvoiceService.createInvoice(invoiceData(deal), admin);

    await expect(InvoiceService.setNextInvoiceNumber(2)).rejects.toThrow('greater than 2');

    await InvoiceService.setNextInvoiceNumber(100);
    const next = await InvoiceService.createInvoice(invoiceData(deal), admin);
    expect(next.invoiceNumber).toBe('TBI-0100');
  });
});

/* ---------------- admin users ---------------- */

describe('admin users', () => {
  test('an admin cannot delete their own account', async () => {
    await expect(UserService.deleteUser(admin._id, admin)).rejects.toThrow('cannot delete your own');
  });

  test('an admin who signed documents can only be deactivated', async () => {
    const manager = await User.create({ name: 'Manager', email: 'manager@test.com', password: 'Secret123' });
    const { deal } = await setup();
    await InvoiceService.createInvoice(invoiceData(deal), manager);

    await expect(UserService.deleteUser(manager._id, admin)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('changing the password needs the current password', async () => {
    await expect(
      UserService.changePassword(admin._id, { currentPassword: 'wrong', newPassword: 'NewPass123' })
    ).rejects.toThrow('Current password is incorrect');

    await UserService.changePassword(admin._id, { currentPassword: OWNER.password, newPassword: 'NewPass123' });
    const login = await request(app).post('/api/auth/login').send({ email: OWNER.email, password: 'NewPass123' });
    expect(login.status).toBe(200);
  });
});

/* ---------------- dashboard, reports, settings (through the API) ---------------- */

describe('dashboard, reports and settings', () => {
  test('GET /api/dashboard returns every section in one response', async () => {
    const { deal } = await setup();
    await PaymentService.createPayment(
      {
        deal: String(deal._id),
        invoice: null,
        amount: rs(40000),
        date: new Date(),
        method: 'Bank',
        reference: '',
        note: '',
        confirmOverpay: false,
      },
      admin
    );

    const res = await request(app).get('/api/dashboard?range=all_time').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.cards).toMatchObject({ totalReceived: rs(40000), netProfit: rs(36000) });
    expect(res.body.stats).toMatchObject({ activeDeals: 1, totalClients: 1, totalStaff: 1 });
    expect(res.body.charts.share).toEqual({ staffCommission: rs(4000), ourShare: rs(36000) });
    expect(res.body.tables.recentPayments).toHaveLength(1);
  });

  test('CSV export downloads a summary file', async () => {
    const res = await request(app).get('/api/reports/export?type=summary').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('techbridge-summary-report');
    expect(res.text).toContain('Metric,Amount');
    expect(res.text).toContain('Our Net Profit');
  });

  test('settings: invalid colors are rejected, valid ones show up in public branding', async () => {
    const bad = await request(app).put('/api/settings').set('Cookie', cookie).send({ brandPrimaryColor: 'red' });
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toHaveProperty('brandPrimaryColor');

    const good = await request(app).put('/api/settings').set('Cookie', cookie).send({ brandPrimaryColor: '#0f766e' });
    expect(good.status).toBe(200);
    expect(good.body.nextInvoiceNumber).toBe(1);

    const branding = await request(app).get('/api/public/branding');
    expect(branding.body.brandPrimaryColor).toBe('#0f766e');
  });
});