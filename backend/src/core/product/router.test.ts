import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../common/prisma';

describe('product router', () => {
  const app = createApp();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/products returns all 8 products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(8);
  });

  it('GET /api/products with loanType=VEHICLE&sort=rate_asc returns VL-201 and VL-204', async () => {
    const res = await request(app).get('/api/products?loanType=VEHICLE&sort=rate_asc');
    expect(res.status).toBe(200);
    const ids = res.body.map((p: { productId: string }) => p.productId);
    expect(ids).toEqual(['VL-201', 'VL-204']);
  });

  it('GET /api/products/compare?ids=PL-101 rejects single id with 400 VALIDATION_FAILED', async () => {
    const res = await request(app).get('/api/products/compare?ids=PL-101');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toBe('/api/products/compare?ids=PL-101');
  });
});
