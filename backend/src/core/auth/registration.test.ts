import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../common/prisma';

const username = `test.register.${randomUUID().slice(0, 8)}`;
const input = { username, password: 'A-test-password-42', fullName: 'Test Customer', email: 'customer@example.test',
  phone: '9876543210', dateOfBirth: '1995-04-12', segment: 'SALARIED', monthlyIncome: 60000, location: 'Pune' };

describe.skipIf(!process.env.DATABASE_URL)('customer registration', () => {
  const app = createApp();
  afterAll(async () => {
    const user = await prisma.appUser.findUnique({ where: { username } });
    await prisma.appUser.deleteMany({ where: { username } });
    if (user?.customerId) await prisma.customer.delete({ where: { customerId: user.customerId } });
  });

  it('rejects staff role injection and invalid profile/password before creation', async () => {
    for (const bad of [{ ...input, role: 'POLICY_ADMIN' }, { ...input, password: 'short' },
      { ...input, email: 'invalid' }, { ...input, dateOfBirth: '2099-01-01' }, { ...input, monthlyIncome: -1 }]) {
      expect((await request(app).post('/api/auth/register').send(bad)).status).toBe(400);
    }
    expect(await prisma.appUser.findUnique({ where: { username } })).toBeNull();
  });

  it('creates a customer, returns login credentials, and keeps a nonverified profile', async () => {
    const r = await request(app).post('/api/auth/register').send(input);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ role: 'CUSTOMER', displayName: input.fullName, token: expect.any(String) });
    expect(r.body.password).toBeUndefined();
    expect(r.body.passwordHash).toBeUndefined();
    const profile = await request(app).get('/api/customers/me').set('Authorization', `Bearer ${r.body.token}`);
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({ fullName: input.fullName, monthlyIncome: 60000, kycStatus: 'PENDING' });
    const stored = await prisma.appUser.findUniqueOrThrow({ where: { username } });
    expect(JSON.stringify(stored)).not.toContain(input.password);
  });

  it('rejects duplicates without creating an orphan customer', async () => {
    const count = await prisma.customer.count();
    const r = await request(app).post('/api/auth/register').send(input);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('INVALID_STATE');
    expect(await prisma.customer.count()).toBe(count);
  });

  it('accepts the new password but rejects the demo password and wrong password', async () => {
    expect((await request(app).post('/api/auth/login').send({ username, password: input.password })).status).toBe(200);
    for (const password of ['password', 'incorrect-password']) {
      expect((await request(app).post('/api/auth/login').send({ username, password })).status).toBe(401);
    }
    expect((await request(app).post('/api/auth/login').send({ username: 'priya.sharma', password: 'password' })).status).toBe(200);
  });
});
