const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

// Mock mongoose connect/disconnect since we don't want real DB calls in routing tests
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
  };
});

describe('Authentication Routing & Security', () => {
  
  beforeAll(() => {
    // Reset rate limiters before tests if necessary
  });

  it('should enforce Joi validation on /google (400 on missing token)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({}); // missing token
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('\"token\" is required');
  });

  it('should enforce strict rate limiting on /google (max 5 requests)', async () => {
    // Fire 5 requests
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/google')
        .send({ token: 'dummy_token' });
    }

    // 6th request should be rate limited (429)
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ token: 'dummy_token' });

    expect(res.statusCode).toEqual(429);
    expect(res.text).toContain('Too many login attempts');
  });
});
