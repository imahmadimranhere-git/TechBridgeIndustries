import request from 'supertest';
import createApp from '../../src/app.js';
import env from '../../src/config/env.js';
import { User } from '../../src/models/index.js';
import { invalidateSettingsCache, updateSettings } from '../../src/services/SettingsService.js';
import { issueVerification } from '../../src/services/VerificationService.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/testDb.js';
import mongoose from 'mongoose';

const app = createApp();
const ADMIN = { email: 'owner@test.com', password: 'Secret123' };

const makeAdmin = () => User.create({ name: 'Owner', designation: 'CEO', ...ADMIN });

beforeAll(startTestDb);
afterEach(async () => {
  await clearTestDb();
  invalidateSettingsCache();
});
afterAll(stopTestDb);

describe('public endpoints', () => {
  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
  });

  test('GET /api/public/branding returns only safe keys', async () => {
    const res = await request(app).get('/api/public/branding');
    expect(res.status).toBe(200);
    expect(res.body.companyName).toBe('TechBridgeIndustries');
    expect(res.body).toHaveProperty('logoUrl', null);
    expect(res.body).not.toHaveProperty('bankDetails');
    expect(res.body).not.toHaveProperty('invoicePrefix');
  });

  test('settings updates show up immediately (cache is cleared)', async () => {
    await request(app).get('/api/public/branding'); // fills the cache
    await updateSettings({ companyName: 'TBI Labs' });
    const res = await request(app).get('/api/public/branding');
    expect(res.body.companyName).toBe('TBI Labs');
  });

  test('unknown settings keys are rejected', async () => {
    await expect(updateSettings({ hackerKey: 1 })).rejects.toThrow('Unknown setting');
  });
});

describe('document verification', () => {
  test('unknown code -> 404 Document not found', async () => {
    const res = await request(app).get('/api/public/verify/TBI-INV-0001-ABCD');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Document not found');
  });

  test('valid code -> minimal public details', async () => {
    const record = await issueVerification({
      documentType: 'Invoice',
      documentId: new mongoose.Types.ObjectId(),
      sequence: 7,
      snapshot: { documentNumber: 'TBI-0007', partyName: 'Acme Traders', amount: 12500000, status: 'Sent' },
    });
    expect(record.code).toMatch(/^TBI-INV-0007-[A-Z0-9]{4}$/);

    const res = await request(app).get(`/api/public/verify/${record.code.toLowerCase()}`);
    expect(res.status).toBe(200);
    expect(res.body.document).toMatchObject({
      documentLabel: 'Invoice',
      documentNumber: 'TBI-0007',
      partyName: 'Acme Traders',
      amount: 12500000,
      isValid: true,
      issuer: 'TechBridgeIndustries',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/commission/i);
  });

  test('internal documents never reveal the amount', async () => {
    const record = await issueVerification({
      documentType: 'PayoutSlip',
      documentId: new mongoose.Types.ObjectId(),
      snapshot: { partyName: 'Ali Raza', amount: 1500000 },
    });
    const res = await request(app).get(`/api/public/verify/${record.code}`);
    expect(res.status).toBe(200);
    expect(res.body.document.amount).toBeNull();
  });
});

describe('authentication flow', () => {
  test('wrong format -> 400, wrong password -> 401 with a generic message', async () => {
    await makeAdmin();

    const badFormat = await request(app).post('/api/auth/login').send({ email: 'nope', password: '' });
    expect(badFormat.status).toBe(400);

    const wrong = await request(app).post('/api/auth/login').send({ ...ADMIN, password: 'WrongPass1' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.message).toBe('Email or password is incorrect');

    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@test.com', password: 'x' });
    expect(unknown.body.message).toBe('Email or password is incorrect');
  });

  test('login sets an httpOnly cookie, /me works, logout clears it', async () => {
    await makeAdmin();

    const login = await request(app).post('/api/auth/login').send(ADMIN);
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe(ADMIN.email);
    expect(login.body.user).not.toHaveProperty('password');

    const cookie = login.headers['set-cookie'][0];
    expect(cookie).toContain(`${env.COOKIE_NAME}=`);
    expect(cookie).toContain('HttpOnly');

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.user.designation).toBe('CEO');

    const logout = await request(app).post('/api/auth/logout');
    expect(logout.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  test('protected routes need a login', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(401);
  });
});

describe('everything else', () => {
  test('non-API routes -> 404 JSON', async () => {
    const res = await request(app).get('/something-else');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});