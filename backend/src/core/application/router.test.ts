import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../app';
import { signToken, requireAuth, requireRole } from '../../common/auth';
import { errorHandler } from '../../common/errors';
import { prisma } from '../../common/prisma';

describe('application router & auth guards', () => {
  const app = createApp();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('analyst decision by officer returns 403 FORBIDDEN', async () => {
    const officerToken = signToken({
      username: 'officer.kumar',
      role: 'LOAN_OFFICER',
      customerId: null,
    });

    const res = await request(app)
      .post('/api/applications/LA-2026-00418/decision')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ decision: 'APPROVED', reason: 'Looks fine to me' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('decision request without token returns 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/applications/LA-2026-00418/decision')
      .send({ decision: 'APPROVED', reason: 'Looks fine to me' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('decision request by POLICY_ADMIN returns 403 FORBIDDEN', async () => {
    const adminToken = signToken({
      username: 'admin.rao',
      role: 'POLICY_ADMIN',
      customerId: null,
    });

    const res = await request(app)
      .post('/api/applications/LA-2026-00418/decision')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVED', reason: 'Looks fine to me' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('requireRole POLICY_ADMIN guard check on throwaway app', async () => {
    const g = express();
    g.get('/guarded', requireAuth, requireRole('POLICY_ADMIN'), (_req, res) => {
      res.json({ ok: true });
    });
    g.use(errorHandler);

    const customerToken = signToken({
      username: 'priya.sharma',
      role: 'CUSTOMER',
      customerId: 'CUST-1001',
    });

    const adminToken = signToken({
      username: 'admin.rao',
      role: 'POLICY_ADMIN',
      customerId: null,
    });

    const resForbidden = await request(g)
      .get('/guarded')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(resForbidden.status).toBe(403);
    expect(resForbidden.body.code).toBe('FORBIDDEN');

    const resOk = await request(g)
      .get('/guarded')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resOk.status).toBe(200);
    expect(resOk.body.ok).toBe(true);
  });
});
