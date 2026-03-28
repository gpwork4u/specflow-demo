/**
 * F-002 使用者登入 — API E2E Tests
 *
 * 根據 QA Issue #8 的 scenarios 撰寫。
 * Spec: specs/features/f002-login.md
 * Feature Issue: #6
 */

import { api, extractTokenCookie, hasHttpOnlyFlag } from './helpers/api';
import { errorCodes } from './helpers/fixtures';
import { registerAndLogin } from './helpers/setup';

describe('POST /api/v1/auth/login', () => {
  // 在所有測試前建立一個測試使用者
  let testCredentials: { email: string; password: string };

  beforeAll(async () => {
    const { credentials } = await registerAndLogin({
      email: 'login-test@example.com',
      username: 'logintest',
      password: 'MyPass123',
      display_name: 'Login Test User',
    });
    testCredentials = credentials;
  });

  // ============================================================
  // Happy Path
  // ============================================================
  describe('Happy Path', () => {
    it('WHEN correct credentials provided THEN returns 200 with user object', async () => {
      // GIVEN user exists (created in beforeAll)
      // WHEN POST with correct credentials
      const res = await api.post('/auth/login', {
        email: testCredentials.email,
        password: testCredentials.password,
      });

      // THEN 200 + user object
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        email: testCredentials.email,
        username: expect.any(String),
        display_name: expect.any(String),
      });
    });

    it('WHEN correct credentials provided THEN response does NOT contain password_hash', async () => {
      const res = await api.post('/auth/login', {
        email: testCredentials.email,
        password: testCredentials.password,
      });

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('password_hash');
      expect(res.body).not.toHaveProperty('password');
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('WHEN correct credentials provided THEN Set-Cookie contains token with HttpOnly flag', async () => {
      const res = await api.post('/auth/login', {
        email: testCredentials.email,
        password: testCredentials.password,
      });

      // THEN Set-Cookie header contains "token=" with HttpOnly flag
      expect(res.status).toBe(200);
      expect(res.setCookie).toBeDefined();
      expect(extractTokenCookie(res.setCookie!)).not.toBeNull();
      expect(hasHttpOnlyFlag(res.setCookie!)).toBe(true);
    });

    it('WHEN email has different case THEN login still succeeds (case-insensitive)', async () => {
      // GIVEN user exists with email = "login-test@example.com"
      // WHEN POST with "LOGIN-TEST@Example.com"
      const res = await api.post('/auth/login', {
        email: 'LOGIN-TEST@Example.com',
        password: testCredentials.password,
      });

      // THEN 200
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: expect.any(String),
      });
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================
  describe('Error Handling', () => {
    it('WHEN email does not exist THEN returns 401 INVALID_CREDENTIALS', async () => {
      // WHEN POST with nonexistent email
      const res = await api.post('/auth/login', {
        email: 'nonexistent@example.com',
        password: 'SomePass123',
      });

      // THEN 401 + INVALID_CREDENTIALS, message = "Email or password is incorrect"
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(errorCodes.INVALID_CREDENTIALS);
      expect(res.body.message).toBe('Email or password is incorrect');
    });

    it('WHEN password is wrong THEN returns 401 INVALID_CREDENTIALS', async () => {
      // GIVEN user exists
      // WHEN POST with wrong password
      const res = await api.post('/auth/login', {
        email: testCredentials.email,
        password: 'WrongPass999',
      });

      // THEN 401 + INVALID_CREDENTIALS, message = "Email or password is incorrect"
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(errorCodes.INVALID_CREDENTIALS);
      expect(res.body.message).toBe('Email or password is incorrect');
    });

    it('WHEN email field is missing THEN returns 400 INVALID_INPUT', async () => {
      // WHEN POST with only password
      const res = await api.post('/auth/login', {
        password: 'MyPass123',
      });

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN password field is missing THEN returns 400 INVALID_INPUT', async () => {
      // WHEN POST with only email
      const res = await api.post('/auth/login', {
        email: 'user@example.com',
      });

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN request body is empty THEN returns 400 INVALID_INPUT', async () => {
      // WHEN POST with {}
      const res = await api.post('/auth/login', {});

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });
  });
});
