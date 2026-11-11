import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Health & Routing Tests', () => {
  it('GET /api/v1/health returns 200 and database health payload structure', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(['ok', 'degraded']).toContain(response.body.data.status);
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('uptimeSeconds');
    expect(response.body.data).toHaveProperty('environment');
    expect(response.body.data).toHaveProperty('database');
    expect(response.body.data.database).toHaveProperty('connected');
    expect(typeof response.body.data.database.connected).toBe('boolean');
  });

  it('GET /api/v1/unknown returns 404 with standardized error response', async () => {
    const response = await request(app).get('/api/v1/unknown-route-endpoint');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error.message).toContain('not found');
  });
});
