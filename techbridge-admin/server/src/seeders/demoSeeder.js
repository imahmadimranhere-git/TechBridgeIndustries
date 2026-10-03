import { addDays, subDays } from 'date-fns';
import logger from '../config/logger.js';
import {
  Client,
  CommissionPayout,
  Counter,
  Deal,
  DocumentVerification,
  Invoice,
  Note,
  Payment,
  Setting,
  Staff,
  WelcomeLetterLog,
} from '../models/index.js';
import { toMinor } from '../utils/money.js';
import { nextInvoiceNumber } from '../utils/counters.js';

// Midday avoids any timezone edge at midnight
const daysAgo = (days) => {
  const date = subDays(new Date(), days);
  date.setHours(12, 0, 0, 0);
  return date;
};

const getSettingValue = async (key, fallback) =>
  (await Setting.findOne({ key }).lean())?.value ?? fallback;

/** Removes all business data but keeps admin users and settings */
export async function wipeBusinessData() {
  const models = [
    Payment,
    CommissionPayout,
    Invoice,
    Deal,
    Note,
    WelcomeLetterLog,
    DocumentVerification,
    Client,
    Staff,
    Counter,
  ];
  // Raw collection calls also remove soft-deleted documents
  for (const Model of models) await Model.collection.deleteMany({});
  logger.warn('Business data wiped (admin users and settings kept).');
}

export async function seedDemoData({ admin }) {
  const existingClients = await Client.countDocuments({ deletedAt: { $exists: true } });
  if (existingClients > 0) {
    logger.info('Demo data skipped: clients already exist. Use "npm run seed:fresh" to start over.');
    return;
  }

  const invoicePrefix = await getSettingValue('invoicePrefix', 'TBI');
  const invoiceTerms = await getSettingValue('invoiceTerms', '');
  const signed = { signedBy: admin._id, createdBy: admin._id };

  /* ---------------- staff ---------------- */
  const [ali, sara, usman] = await Staff.create([
    {
      name: 'Ali Raza',
      email: 'ali.raza@example.com',
      phone: '0300-1234567',
      cnic: '35202-1234567-1',
      address: 'Model Town, Lahore',
      joiningDate: daysAgo(400),
      commissionType: 'percentage',
      commissionRate: 10,
    },
    {
      name: 'Sara Khan',
      email: 'sara.khan@example.com',
      phone: '0301-7654321',
      cnic: '61101-7654321-2',
      address: 'Gulberg, Lahore',
      joiningDate: daysAgo(250),
      commissionType: 'percentage',
      commissionRate: 8,
    },
    {
      name: 'Usman Tariq',
      email: 'usman.tariq@example.com',
      phone: '0333-5550001',
      cnic: '42101-5550001-3',
      address: 'Clifton, Karachi',
      joiningDate: daysAgo(180),
      commissionType: 'fixed',
      commissionRate: toMinor(15000),
    },
  ]);

  /* ---------------- clients ---------------- */
  const [hamza, ayesha, bilal, fatima, omar] = await Client.create(
    [
      ['Hamza Sheikh', 'Sheikh Textiles', 'Faisalabad', 'Referral', 'Active'],
      ['Ayesha Malik', 'Malik Foods', 'Lahore', 'Facebook', 'Active'],
      ['Bilal Ahmed', 'Ahmed Logistics', 'Karachi', 'LinkedIn', 'Active'],
      ['Fatima Noor', 'Noor Boutique', 'Multan', 'Instagram', 'Active'],
      ['Omar Farooq', 'Farooq Real Estate', 'Peshawar', 'Website', 'Lead'],
    ].map(([name, companyName, city, source, status], index) => ({
      name,
      companyName,
      email: `${name.split(' ')[0].toLowerCase()}@example.com`,
      phone: `0321-55500${index + 10}`,
      whatsapp: `0321-55500${index + 10}`,
      city,
      country: 'Pakistan',
      source,
      status,
      createdBy: admin._id,
    }))
  );

  /* ---------------- deals ---------------- */
  // Commission type and rate are copied from the staff member, exactly like the real deal service
  const createDeal = ({ client, staff = null, title, amount, status, startedDaysAgo, durationDays = 60 }) => {
    const startDate = daysAgo(startedDaysAgo);
    return Deal.create({
      client: client._id,
      title,
      description: `${title} for ${client.companyName}.`,
      dealAmount: toMinor(amount),
      startDate,
      deadline: addDays(startDate, durationDays),
      assignedStaff: staff?._id ?? null,
      commissionType: staff?.commissionType ?? 'percentage',
      commissionRate: staff?.commissionRate ?? 0,
      status,
      createdBy: admin._id,
    });
  };

  const website = await createDeal({ client: hamza, staff: ali, title: 'Corporate Website Redesign', amount: 150000, status: 'Completed', startedDaysAgo: 120 });
  const foodApp = await createDeal({ client: ayesha, staff: sara, title: 'Food Delivery Mobile App', amount: 450000, status: 'In Progress', startedDaysAgo: 75, durationDays: 120 });
  const fleet = await createDeal({ client: bilal, staff: usman, title: 'Fleet Tracking Dashboard', amount: 300000, status: 'In Progress', startedDaysAgo: 50 });
  const store = await createDeal({ client: fatima, staff: ali, title: 'E-commerce Store', amount: 250000, status: 'In Progress', startedDaysAgo: 20 });
  const seo = await createDeal({ client: hamza, staff: sara, title: 'SEO & Marketing Retainer', amount: 60000, status: 'Pending', startedDaysAgo: 5, durationDays: 90 });
  await createDeal({ client: omar, title: 'Property Listing Portal', amount: 200000, status: 'Pending', startedDaysAgo: 2 });
  const chatbot = await createDeal({ client: bilal, staff: ali, title: 'AI Customer Chatbot', amount: 120000, status: 'Cancelled', startedDaysAgo: 90 });

  /* ---------------- invoices ---------------- */
  const createInvoice = async ({ deal, items, issuedDaysAgo, dueInDays = 15, status = 'Sent', taxPercent = 0 }) => {
    const { invoiceNumber, sequence } = await nextInvoiceNumber({ prefix: invoicePrefix });
    const invoiceDate = daysAgo(issuedDaysAgo);
    return Invoice.create({
      invoiceNumber,
      sequence,
      client: deal.client,
      deal: deal._id,
      invoiceDate,
      dueDate: addDays(invoiceDate, dueInDays),
      items: items.map(([description, qty, rate]) => ({ description, qty, rate: toMinor(rate) })),
      taxPercent,
      status,
      sentAt: status === 'Draft' ? null : invoiceDate,
      terms: invoiceTerms,
      ...signed,
    });
  };

  const invWebsite = await createInvoice({
    deal: website,
    issuedDaysAgo: 115,
    items: [
      ['UI/UX design (5 pages)', 1, 50000],
      ['Front-end and CMS development', 1, 100000],
    ],
  });
  const invFoodApp1 = await createInvoice({
    deal: foodApp,
    issuedDaysAgo: 70,
    items: [['Milestone 1: UI/UX and backend API', 1, 200000]],
  });
  const invFleet = await createInvoice({
    deal: fleet,
    issuedDaysAgo: 45,
    dueInDays: 30,
    items: [['Phase 1: GPS integration and live map', 1, 150000]],
  });
  const invStore = await createInvoice({
    deal: store,
    issuedDaysAgo: 15,
    dueInDays: 30,
    items: [
      ['50% advance: store setup', 1, 100000],
      ['Product upload (50 products)', 50, 500],
    ],
  });
  const invFoodApp2 = await createInvoice({
    deal: foodApp,
    issuedDaysAgo: 10,
    dueInDays: 20,
    items: [['Milestone 2: Android and iOS apps', 1, 200000]],
  });
  const invSeo = await createInvoice({
    deal: seo,
    issuedDaysAgo: 1,
    status: 'Draft',
    items: [['SEO retainer: first month', 1, 20000]],
  });

  /* ---------------- payments ---------------- */
  const createPayment = ({ deal, amount, ago, invoice = null, method = 'Bank', reference = '', note = '' }) =>
    Payment.create({
      client: deal.client,
      deal: deal._id,
      invoice: invoice?._id ?? null,
      amount: toMinor(amount),
      date: daysAgo(ago),
      method,
      reference,
      note,
      ...signed,
    });

  await createPayment({ deal: website, invoice: invWebsite, amount: 75000, ago: 110, reference: 'HBL-TRX-10021' });
  await createPayment({ deal: website, invoice: invWebsite, amount: 75000, ago: 95, reference: 'HBL-TRX-10388' });
  await createPayment({ deal: foodApp, amount: 100000, ago: 74, method: 'JazzCash', note: 'Advance before invoice' });
  await createPayment({ deal: foodApp, invoice: invFoodApp1, amount: 150000, ago: 40, reference: 'MCB-55120' });
  await createPayment({ deal: fleet, invoice: invFleet, amount: 150000, ago: 30, reference: 'UBL-88231' });
  await createPayment({ deal: fleet, amount: 150000, ago: 3, reference: 'UBL-90112', note: 'Final payment' });
  await createPayment({ deal: store, invoice: invStore, amount: 50000, ago: 12, method: 'EasyPaisa' });
  await createPayment({ deal: chatbot, amount: 20000, ago: 85, method: 'Cash', note: 'Advance; project later cancelled' });

  // Same rule the payment service will use: amountPaid + status come from linked payments
  const invoices = [invWebsite, invFoodApp1, invFleet, invStore, invFoodApp2, invSeo];
  for (const invoice of invoices) {
    const [row] = await Payment.aggregate([
      { $match: { invoice: invoice._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    invoice.amountPaid = row?.total ?? 0;
    invoice.status = invoice.deriveStatus();
    await invoice.save();
  }

  /* ---------------- commission payouts ---------------- */
  await CommissionPayout.create([
    { staff: ali._id, amount: toMinor(15000), date: daysAgo(90), method: 'Bank', reference: 'PAYOUT-001', note: 'Website project commission', ...signed },
    { staff: sara._id, amount: toMinor(10000), date: daysAgo(35), method: 'JazzCash', reference: 'PAYOUT-002', ...signed },
  ]);

  /* ---------------- notes ---------------- */
  await Note.create([
    { notableType: 'Client', notableId: hamza._id, title: 'Very happy with the website', body: 'Hamza asked about an SEO package. Follow up next week.', date: daysAgo(6), createdBy: admin._id },
    { notableType: 'Client', notableId: ayesha._id, title: 'Milestone 1 overdue', body: 'Rs 50,000 still pending on milestone 1. She promised to clear it this month.', date: daysAgo(4), createdBy: admin._id },
    { notableType: 'Deal', notableId: fleet._id, title: 'Client approved phase 2', body: 'Bilal approved the live map. Starting reports module.', date: daysAgo(8), createdBy: admin._id },
    { notableType: 'Staff', notableId: usman._id, title: 'Fixed commission due', body: 'Fleet project fully paid. Rs 15,000 commission to be released.', date: daysAgo(2), createdBy: admin._id },
  ]);

  logger.info(
    `✅ Demo data: 3 staff, 5 clients, 7 deals, ${invoices.length} invoices, 8 payments, 2 payouts, 4 notes`
  );
}