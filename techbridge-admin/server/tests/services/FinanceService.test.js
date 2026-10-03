import { endOfMonth, startOfMonth } from 'date-fns';
import { Client, CommissionPayout, Deal, Payment, Staff } from '../../src/models/index.js';
import FinanceService, { buildSummary } from '../../src/services/FinanceService.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/testDb.js';

// Write amounts in rupees in tests, store them in paisa
const rs = (rupees) => Math.round(rupees * 100);

const JAN_15 = new Date(2026, 0, 15);
const FEB_10 = new Date(2026, 1, 10);
const monthOf = (date) => ({ from: startOfMonth(date), to: endOfMonth(date) });

/* ---------------- factories ---------------- */

const makeClient = (name = 'Acme Traders') => Client.create({ name });

const makeStaff = (overrides = {}) =>
  Staff.create({ name: 'Ali Raza', commissionType: 'percentage', commissionRate: 10, ...overrides });

// Mirrors what the deal service will do: copy the staff member's commission onto the deal
const makeDeal = ({ client, staff = null, amount = 100000, status = 'In Progress', startDate = new Date(2026, 0, 1) }) =>
  Deal.create({
    client: client._id,
    title: 'Website project',
    dealAmount: rs(amount),
    startDate,
    status,
    assignedStaff: staff?._id ?? null,
    commissionType: staff?.commissionType ?? 'percentage',
    commissionRate: staff?.commissionRate ?? 0,
  });

const pay = (deal, rupees, date = JAN_15) =>
  Payment.create({ client: deal.client, deal: deal._id, amount: rs(rupees), date });

const payout = (staff, rupees, date = JAN_15) =>
  CommissionPayout.create({ staff: staff._id, amount: rs(rupees), date });

/* ---------------- setup ---------------- */

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/* ---------------- tests ---------------- */

describe('per deal: percentage commission', () => {
  test('partial payment', async () => {
    const client = await makeClient();
    const staff = await makeStaff();
    const deal = await makeDeal({ client, staff, amount: 100000 });
    await pay(deal, 40000);

    const row = await FinanceService.getDealFinancial(deal._id);
    expect(row).toMatchObject({
      dealAmount: rs(100000),
      received: rs(40000),
      remaining: rs(60000),
      progress: 40,
      commissionTotal: rs(10000),
      commissionEarned: rs(4000),
    });
  });

  test('full payment earns the full commission', async () => {
    const client = await makeClient();
    const staff = await makeStaff();
    const deal = await makeDeal({ client, staff, amount: 100000 });
    await pay(deal, 40000, JAN_15);
    await pay(deal, 60000, FEB_10);

    const row = await FinanceService.getDealFinancial(deal._id);
    expect(row).toMatchObject({ received: rs(100000), remaining: 0, progress: 100, commissionEarned: rs(10000) });
  });

  test('rounding matches the commission total stored on the deal', async () => {
    const client = await makeClient();
    const staff = await makeStaff({ commissionRate: 12.5 });
    const deal = await makeDeal({ client, staff, amount: 1001 }); // 12.5% of 100100 paisa = 12512.5
    await pay(deal, 1001);

    const row = await FinanceService.getDealFinancial(deal._id);
    expect(row.commissionTotal).toBe(12513);
    expect(row.commissionEarned).toBe(12513);
  });

  test('overpayment never earns more than the commission total', async () => {
    const client = await makeClient();
    const staff = await makeStaff();
    const deal = await makeDeal({ client, staff, amount: 100000 });
    await pay(deal, 120000);

    const row = await FinanceService.getDealFinancial(deal._id);
    expect(row.commissionEarned).toBe(rs(10000));
    expect(row.remaining).toBe(rs(-20000));
  });
});

describe('per deal: fixed commission', () => {
  test('nothing is earned while the deal is only partially paid', async () => {
    const client = await makeClient();
    const staff = await makeStaff({ commissionType: 'fixed', commissionRate: rs(5000) });
    const deal = await makeDeal({ client, staff, amount: 50000 });
    await pay(deal, 30000);

    const row = await FinanceService.getDealFinancial(deal._id);
    expect(row.commissionTotal).toBe(rs(5000));
    expect(row.commissionEarned).toBe(0);
  });

  test('the full fixed amount is earned once the deal is fully paid', async () => {
    const client = await makeClient();
    const staff = await makeStaff({ commissionType: 'fixed', commissionRate: rs(5000) });
    const deal = await makeDeal({ client, staff, amount: 50000 });
    await pay(deal, 30000, JAN_15);
    await pay(deal, 20000, FEB_10);

    const row = await FinanceService.getDealFinancial(deal._id);
    expect(row.commissionEarned).toBe(rs(5000));
  });

  test('a deal without staff earns no commission', async () => {
    const client = await makeClient();
    const deal = await makeDeal({ client, amount: 50000 });
    await pay(deal, 50000);

    const row = await FinanceService.getDealFinancial(deal._id);
    expect(row.commissionEarned).toBe(0);
  });
});

describe('cancelled and deleted deals', () => {
  test('cancelled: excluded from deal value, payments still received, no commission', async () => {
    const client = await makeClient();
    const staff = await makeStaff();
    const active = await makeDeal({ client, staff, amount: 100000 });
    const cancelled = await makeDeal({ client, staff, amount: 200000, status: 'Cancelled' });
    await pay(active, 40000);
    await pay(cancelled, 10000);

    const summary = await FinanceService.getSummary();
    expect(summary.totalDealValue).toBe(rs(100000));
    expect(summary.totalReceived).toBe(rs(50000));
    expect(summary.commissionEarned).toBe(rs(4000));

    const row = await FinanceService.getDealFinancial(cancelled._id);
    expect(row.commissionEarned).toBe(0);
    expect(row.remaining).toBe(0);
  });

  test('soft-deleted deals and their payments are ignored', async () => {
    const client = await makeClient();
    const staff = await makeStaff();
    const deal = await makeDeal({ client, staff, amount: 100000 });
    await pay(deal, 40000);
    await deal.softDelete();

    const summary = await FinanceService.getSummary();
    expect(summary).toMatchObject({ totalDealValue: 0, totalReceived: 0, commissionEarned: 0 });
  });
});

describe('overall summary', () => {
  test('all 8 values follow the formulas', async () => {
    const client = await makeClient();
    const percentStaff = await makeStaff();
    const fixedStaff = await makeStaff({ name: 'Sara Khan', commissionType: 'fixed', commissionRate: rs(5000) });

    const fullyPaid = await makeDeal({ client, staff: percentStaff, amount: 100000 });
    const fixedPartial = await makeDeal({ client, staff: fixedStaff, amount: 50000 });
    const cancelled = await makeDeal({ client, staff: percentStaff, amount: 200000, status: 'Cancelled' });

    await pay(fullyPaid, 100000);
    await pay(fixedPartial, 30000);
    await pay(cancelled, 10000);
    await payout(percentStaff, 6000);

    const summary = await FinanceService.getSummary();
    expect(summary).toEqual({
      totalDealValue: rs(150000),
      totalReceived: rs(140000),
      remainingFromClients: rs(10000),
      commissionEarned: rs(10000),
      commissionPaid: rs(6000),
      commissionPending: rs(4000),
      cashInHand: rs(134000),
      netProfit: rs(130000),
    });
  });

  test('buildSummary derives the other four values', () => {
    expect(
      buildSummary({ totalDealValue: 1000, totalReceived: 600, commissionEarned: 60, commissionPaid: 20 })
    ).toEqual({
      totalDealValue: 1000,
      totalReceived: 600,
      remainingFromClients: 400,
      commissionEarned: 60,
      commissionPaid: 20,
      commissionPending: 40,
      cashInHand: 580,
      netProfit: 540,
    });
  });
});

describe('date ranges', () => {
  test('payments and percentage commission land in the right month', async () => {
    const client = await makeClient();
    const staff = await makeStaff();
    const deal = await makeDeal({ client, staff, amount: 100000 });
    await pay(deal, 40000, JAN_15);
    await pay(deal, 60000, FEB_10);

    const jan = await FinanceService.getSummary(monthOf(JAN_15));
    const feb = await FinanceService.getSummary(monthOf(FEB_10));
    const all = await FinanceService.getSummary();

    expect(jan).toMatchObject({ totalReceived: rs(40000), commissionEarned: rs(4000) });
    expect(feb).toMatchObject({ totalReceived: rs(60000), commissionEarned: rs(6000) });
    expect(jan.commissionEarned + feb.commissionEarned).toBe(all.commissionEarned);
  });

  test('fixed commission is earned in the month the deal is paid off', async () => {
    const client = await makeClient();
    const staff = await makeStaff({ commissionType: 'fixed', commissionRate: rs(5000) });
    const deal = await makeDeal({ client, staff, amount: 50000 });
    await pay(deal, 30000, JAN_15);
    await pay(deal, 20000, FEB_10);

    expect((await FinanceService.getSummary(monthOf(JAN_15))).commissionEarned).toBe(0);
    expect((await FinanceService.getSummary(monthOf(FEB_10))).commissionEarned).toBe(rs(5000));
  });

  test('deal balances are as of the end of the period', async () => {
    const client = await makeClient();
    const staff = await makeStaff();
    const deal = await makeDeal({ client, staff, amount: 100000 });
    await pay(deal, 40000, JAN_15);
    await pay(deal, 60000, FEB_10);

    const row = await FinanceService.getDealFinancial(deal._id, monthOf(JAN_15));
    expect(row).toMatchObject({ received: rs(40000), remaining: rs(60000), receivedInPeriod: rs(40000) });
  });
});

describe('filters', () => {
  test('clientId and staffId narrow the summary', async () => {
    const clientA = await makeClient('Client A');
    const clientB = await makeClient('Client B');
    const staffA = await makeStaff({ name: 'Staff A' });
    const staffB = await makeStaff({ name: 'Staff B', commissionRate: 5 });
    const dealA = await makeDeal({ client: clientA, staff: staffA, amount: 100000 });
    const dealB = await makeDeal({ client: clientB, staff: staffB, amount: 100000 });
    await pay(dealA, 40000);
    await pay(dealB, 20000);
    await payout(staffA, 1000);

    const forClientA = await FinanceService.getSummary({ clientId: clientA._id });
    expect(forClientA).toMatchObject({ totalDealValue: rs(100000), totalReceived: rs(40000), commissionPaid: 0 });

    const forStaffB = await FinanceService.getSummary({ staffId: staffB._id });
    expect(forStaffB).toMatchObject({ totalReceived: rs(20000), commissionEarned: rs(1000) });
  });

  test('an invalid id is rejected with a clear message', async () => {
    await expect(FinanceService.getSummary({ clientId: 'abc' })).rejects.toThrow('not a valid id');
  });
});

describe('lists for profiles, dashboard and reports', () => {
  test('staff financials: earned, paid and pending', async () => {
    const client = await makeClient();
    const ali = await makeStaff();
    await makeStaff({ name: 'New Joiner' });
    const deal = await makeDeal({ client, staff: ali, amount: 100000 });
    await pay(deal, 40000);
    await payout(ali, 1500);

    const rows = await FinanceService.getStaffFinancials();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      dealsCount: 1,
      commissionEarned: rs(4000),
      commissionPaid: rs(1500),
      commissionPending: rs(2500),
    });
    expect(rows[0].staff.name).toBe('Ali Raza');
    expect(rows[1]).toMatchObject({ dealsCount: 0, commissionEarned: 0, commissionPending: 0 });
  });

  test('client financials are sorted by highest remaining', async () => {
    const a = await makeClient('Big Debtor');
    const b = await makeClient('Almost Done');
    await makeClient('No Deals Yet');
    await pay(await makeDeal({ client: a, amount: 100000 }), 40000);
    await pay(await makeDeal({ client: b, amount: 50000 }), 45000);

    const rows = await FinanceService.getClientFinancials();
    expect(rows.map((row) => row.client.name)).toEqual(['Big Debtor', 'Almost Done', 'No Deals Yet']);
    expect(rows[0]).toMatchObject({ totalDealValue: rs(100000), received: rs(40000), remaining: rs(60000) });
  });

  test('monthly series for the bar chart', async () => {
    const client = await makeClient();
    const staff = await makeStaff();
    const deal = await makeDeal({ client, staff, amount: 100000 });
    await pay(deal, 40000, JAN_15);
    await pay(deal, 60000, FEB_10);
    await payout(staff, 3000, FEB_10);

    const series = await FinanceService.getMonthlySeries({
      from: new Date(2026, 0, 1),
      to: endOfMonth(FEB_10),
    });

    expect(series).toMatchObject([
      { key: '2026-01', received: rs(40000), commissionEarned: rs(4000), commissionPaid: 0, netProfit: rs(36000) },
      { key: '2026-02', received: rs(60000), commissionEarned: rs(6000), commissionPaid: rs(3000), netProfit: rs(54000) },
    ]);
  });
});