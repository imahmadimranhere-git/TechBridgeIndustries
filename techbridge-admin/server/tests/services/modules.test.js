import { addDays } from 'date-fns';
import { Client, Deal, Invoice, Payment, Staff, User } from '../../src/models/index.js';
import * as ClientService from '../../src/services/ClientService.js';
import * as DealService from '../../src/services/DealService.js';
import * as PaymentService from '../../src/services/PaymentService.js';
import { invalidateSettingsCache } from '../../src/services/SettingsService.js';
import * as StaffService from '../../src/services/StaffService.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/testDb.js';

// Services receive data AFTER validation, so amounts are already in paisa here
const rs = (rupees) => Math.round(rupees * 100);

let admin;
let invoiceSequence = 0;

beforeAll(startTestDb);
beforeEach(async () => {
  admin = await User.create({ name: 'Owner', email: 'owner@test.com', password: 'Secret123' });
});
afterEach(async () => {
  await clearTestDb();
  invalidateSettingsCache();
});
afterAll(stopTestDb);

/* ---------------- helpers ---------------- */

const dealData = (client, staff, overrides = {}) => ({
  client: String(client._id),
  title: 'Website',
  description: '',
  dealAmount: rs(100000),
  startDate: new Date(),
  deadline: null,
  assignedStaff: staff ? String(staff._id) : null,
  status: 'In Progress',
  notes: '',
  ...overrides,
});

async function setup({ amount = 100000 } = {}) {
  const client = await Client.create({ name: 'Acme Traders' });
  const staff = await Staff.create({ name: 'Ali', commissionType: 'percentage', commissionRate: 10 });
  const deal = await DealService.createDeal(dealData(client, staff, { dealAmount: rs(amount) }), admin);
  return { client, staff, deal };
}

function makeInvoice(deal, rupees) {
  invoiceSequence += 1;
  return Invoice.create({
    invoiceNumber: `TBI-${String(invoiceSequence).padStart(4, '0')}`,
    sequence: invoiceSequence,
    client: deal.client,
    deal: deal._id,
    invoiceDate: new Date(),
    dueDate: addDays(new Date(), 15),
    items: [{ description: 'Work', qty: 1, rate: rs(rupees) }],
    status: 'Sent',
  });
}

const paymentData = (deal, rupees, extra = {}) => ({
  deal: String(deal._id),
  invoice: null,
  amount: rs(rupees),
  date: new Date(),
  method: 'Cash',
  reference: '',
  note: '',
  confirmOverpay: false,
  ...extra,
});

const payoutData = (rupees, extra = {}) => ({
  amount: rs(rupees),
  date: new Date(),
  method: 'Cash',
  reference: '',
  note: '',
  confirmOverpay: false,
  ...extra,
});

/* ---------------- deals ---------------- */

describe('deals', () => {
  test('copy the staff commission at creation; later staff rate changes do not affect them', async () => {
    const { staff, deal } = await setup();
    expect(deal).toMatchObject({ commissionType: 'percentage', commissionRate: 10, commissionTotal: rs(10000) });

    await Staff.updateOne({ _id: staff._id }, { commissionRate: 20 });
    const fresh = await Deal.findById(deal._id);
    expect(fresh.commissionRate).toBe(10);
  });

  test('changing staff copies the new rate, unless an override is given', async () => {
    const { client, deal } = await setup();
    const sara = await Staff.create({ name: 'Sara', commissionType: 'fixed', commissionRate: rs(5000) });

    const switched = await DealService.updateDeal(deal._id, dealData(client, sara));
    expect(switched).toMatchObject({ commissionType: 'fixed', commissionTotal: rs(5000) });

    const overridden = await DealService.updateDeal(
      deal._id,
      dealData(client, sara, { commissionType: 'percentage', commissionRate: 7 })
    );
    expect(overridden.commissionTotal).toBe(rs(7000));
  });
});

/* ---------------- payments ---------------- */

describe('payments', () => {
  test('a payment updates the linked invoice inside a transaction', async () => {
    const { deal } = await setup();
    const invoice = await makeInvoice(deal, 40000);

    await PaymentService.createPayment(paymentData(deal, 10000, { invoice: String(invoice._id) }), admin);
    let fresh = await Invoice.findById(invoice._id);
    expect(fresh).toMatchObject({ amountPaid: rs(10000), status: 'Partially Paid' });

    await PaymentService.createPayment(paymentData(deal, 30000, { invoice: String(invoice._id) }), admin);
    fresh = await Invoice.findById(invoice._id);
    expect(fresh).toMatchObject({ amountPaid: rs(40000), status: 'Paid' });
  });

  test('paying more than the deal remaining needs confirmation', async () => {
    const { deal } = await setup({ amount: 50000 });

    await expect(PaymentService.createPayment(paymentData(deal, 60000), admin)).rejects.toMatchObject({
      statusCode: 409,
      meta: { requiresConfirmation: true, dealRemaining: rs(50000) },
    });
    expect(await Payment.countDocuments()).toBe(0);

    await PaymentService.createPayment(paymentData(deal, 60000, { confirmOverpay: true }), admin);
    expect(await Payment.countDocuments()).toBe(1);
  });

  test('the invoice must belong to the same deal', async () => {
    const { client, staff, deal } = await setup();
    const otherDeal = await DealService.createDeal(dealData(client, staff, { title: 'App' }), admin);
    const otherInvoice = await makeInvoice(otherDeal, 1000);

    await expect(
      PaymentService.createPayment(paymentData(deal, 500, { invoice: String(otherInvoice._id) }), admin)
    ).rejects.toThrow('belongs to a different deal');
  });

  test('cancelled deals reject new payments', async () => {
    const { deal } = await setup();
    await Deal.updateOne({ _id: deal._id }, { status: 'Cancelled' });
    await expect(PaymentService.createPayment(paymentData(deal, 100), admin)).rejects.toThrow('cancelled');
  });

  test('deleting a payment recalculates the invoice', async () => {
    const { deal } = await setup();
    const invoice = await makeInvoice(deal, 40000);
    const payment = await PaymentService.createPayment(
      paymentData(deal, 40000, { invoice: String(invoice._id) }),
      admin
    );

    await PaymentService.deletePayment(payment._id);
    const fresh = await Invoice.findById(invoice._id);
    expect(fresh).toMatchObject({ amountPaid: 0, status: 'Sent' });
  });
});

/* ---------------- deletes ---------------- */

describe('safe deletes', () => {
  test('a client with payments cannot be deleted', async () => {
    const { client, deal } = await setup();
    await PaymentService.createPayment(paymentData(deal, 1000), admin);
    await expect(ClientService.deleteClient(client._id)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('a client without payments is soft-deleted together with its deals', async () => {
    const { client, deal } = await setup();
    await ClientService.deleteClient(client._id);

    expect(await Client.findById(client._id)).toBeNull();
    expect(await Deal.findById(deal._id)).toBeNull();
    expect(await Deal.findOne({ _id: deal._id, deletedAt: { $ne: null } })).not.toBeNull();
  });

  test('staff with deals cannot be deleted', async () => {
    const { staff } = await setup();
    await expect(StaffService.deleteStaff(staff._id)).rejects.toMatchObject({ statusCode: 409 });
  });
});

/* ---------------- payouts ---------------- */

describe('commission payouts', () => {
  test('paying more than the pending commission needs confirmation', async () => {
    const { staff, deal } = await setup();
    await PaymentService.createPayment(paymentData(deal, 40000), admin); // earns Rs 4,000

    await expect(StaffService.createPayout(staff._id, payoutData(5000), admin)).rejects.toMatchObject({
      statusCode: 409,
      meta: { requiresConfirmation: true, pending: rs(4000) },
    });

    const payout = await StaffService.createPayout(staff._id, payoutData(4000), admin);
    expect(payout.amount).toBe(rs(4000));
    expect(String(payout.signedBy)).toBe(String(admin._id));
  });
});