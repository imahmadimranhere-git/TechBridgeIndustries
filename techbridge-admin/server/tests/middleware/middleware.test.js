import fs from 'node:fs';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import env from '../../src/config/env.js';
import { Client, User } from '../../src/models/index.js';
import { requireAuth } from '../../src/middleware/auth.js';
import { errorHandler, notFound } from '../../src/middleware/errorHandler.js';
import { loginLimiter } from '../../src/middleware/rateLimit.js';
import { removeUpload, resolveUploadPath, uploadImage } from '../../src/middleware/upload.js';
import { validate } from '../../src/middleware/validate.js';
import ApiError from '../../src/utils/ApiError.js';
import asyncHandler from '../../src/utils/asyncHandler.js';
import { signAuthToken } from '../../src/utils/authToken.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/testDb.js';

// A tiny Express app with the same plumbing the real app will have
function makeApp(registerRoutes) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  registerRoutes(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

const makeAdmin = (overrides = {}) =>
  User.create({ name: 'Test Admin', email: 'admin@test.com', password: 'Secret123', ...overrides });

const authCookie = (user) => `${env.COOKIE_NAME}=${signAuthToken(user)}`;

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('validate', () => {
  const app = makeApp((a) =>
    a.post(
      '/items',
      validate({
        body: z.object({
          name: z.string().min(2, 'Name is too short'),
          qty: z.coerce.number().int().positive('Quantity must be positive'),
        }),
      }),
      (req, res) => res.json(req.body)
    )
  );

  test('returns 400 with one message per field', async () => {
    const res = await request(app).post('/items').send({ name: 'a', qty: -1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Please fix the highlighted fields');
    expect(res.body.errors).toEqual({ name: 'Name is too short', qty: 'Quantity must be positive' });
  });

  test('passes cleaned data and drops unknown fields', async () => {
    const res = await request(app).post('/items').send({ name: 'Pen', qty: '3', isAdmin: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'Pen', qty: 3 });
  });
});

describe('errorHandler', () => {
  const app = makeApp((a) => {
    a.get('/api-error', asyncHandler(async () => {
      throw ApiError.notFound('Client not found');
    }));
    a.get('/mongoose-validation', asyncHandler(async () => {
      await new Client({}).validate();
    }));
    a.get('/bad-id', asyncHandler(async () => {
      await Client.findById('not-an-id');
    }));
    a.post('/duplicate', asyncHandler(async (_req, res) => {
      await User.init();
      await makeAdmin();
      await makeAdmin();
      res.json({ ok: true });
    }));
    a.post('/json', (req, res) => res.json(req.body));
    a.get('/crash', asyncHandler(async () => {
      throw new Error('boom');
    }));
  });

  test('unknown route -> 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Route not found');
  });

  test('ApiError keeps its status and message', async () => {
    const res = await request(app).get('/api-error');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Client not found', errors: {} });
  });

  test('Mongoose validation -> 400 with field errors', async () => {
    const res = await request(app).get('/mongoose-validation');
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBe('Client name is required');
  });

  test('invalid ObjectId -> 400', async () => {
    const res = await request(app).get('/bad-id');
    expect(res.status).toBe(400);
  });

  test('duplicate unique value -> 409', async () => {
    const res = await request(app).post('/duplicate');
    expect(res.status).toBe(409);
    expect(res.body.errors).toHaveProperty('email');
  });

  test('broken JSON -> 400', async () => {
    const res = await request(app).post('/json').set('Content-Type', 'application/json').send('{"name":');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Request body is not valid JSON');
  });

  test('unexpected error -> 500', async () => {
    const res = await request(app).get('/crash');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('boom'); // in production this would be a generic message
  });
});

describe('requireAuth', () => {
  const app = makeApp((a) => a.get('/me', requireAuth, (req, res) => res.json(req.user)));

  test('no cookie -> 401', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
  });

  test('valid cookie -> the user, without the password', async () => {
    const admin = await makeAdmin();
    const res = await request(app).get('/me').set('Cookie', authCookie(admin));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@test.com');
    expect(res.body.password).toBeUndefined();
  });

  test('tampered token -> 401', async () => {
    const admin = await makeAdmin();
    const res = await request(app).get('/me').set('Cookie', `${authCookie(admin)}x`);
    expect(res.status).toBe(401);
  });

  test('token issued before a password change -> 401', async () => {
    const admin = await makeAdmin();
    const cookie = authCookie(admin);
    await User.updateOne({ _id: admin._id }, { passwordChangedAt: new Date(Date.now() + 60_000) });
    const res = await request(app).get('/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('password was changed');
  });

  test('inactive admin -> 401', async () => {
    const admin = await makeAdmin({ isActive: false });
    const res = await request(app).get('/me').set('Cookie', authCookie(admin));
    expect(res.status).toBe(401);
  });
});

describe('uploadImage', () => {
  const app = makeApp((a) =>
    a.post('/upload', uploadImage('signatures', 'image'), (req, res) =>
      res.json({ path: req.file?.relativePath ?? null })
    )
  );

  test('accepts a real PNG and stores it with a random name', async () => {
    const file = Buffer.concat([PNG_HEADER, Buffer.alloc(32)]);
    const res = await request(app).post('/upload').attach('image', file, { filename: 'my sign.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.path).toMatch(/^signatures\/[a-f0-9]{32}\.png$/);
    expect(fs.existsSync(resolveUploadPath(res.body.path))).toBe(true);

    await removeUpload(res.body.path);
    expect(fs.existsSync(resolveUploadPath(res.body.path))).toBe(false);
  });

  test('rejects a fake PNG (wrong file contents)', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('image', Buffer.from('this is not an image'), { filename: 'fake.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.errors.image).toBe('This file is not a real image');
  });

  test('rejects other file types', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('image', Buffer.from('%PDF-1.7'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.errors.image).toBe('Only PNG, JPG or WEBP images are allowed');
  });

  test('never resolves paths outside the uploads folder', () => {
    expect(resolveUploadPath('../../.env')).toBeNull();
  });
});

describe('loginLimiter', () => {
  const app = makeApp((a) => a.post('/login', loginLimiter, (_req, res) => res.status(401).json({ message: 'Wrong password' })));

  test('blocks after 10 failed attempts', async () => {
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const res = await request(app).post('/login');
      expect(res.status).toBe(401);
    }
    const blocked = await request(app).post('/login');
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toContain('Too many login attempts');
  });
});