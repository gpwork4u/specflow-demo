/**
 * F-001 使用者註冊 — API E2E Tests
 *
 * 根據 QA Issue #8 的 scenarios 撰寫。
 * Spec: specs/features/f001-register.md
 * Feature Issue: #5
 */

import { api, extractTokenCookie, hasHttpOnlyFlag } from './helpers/api';
import {
  validRegistration,
  uniqueRegistration,
  invalidEmails,
  invalidUsernames,
  invalidPasswords,
  errorCodes,
} from './helpers/fixtures';

describe('POST /api/v1/auth/register', () => {
  // ============================================================
  // Happy Path
  // ============================================================
  describe('Happy Path', () => {
    it('WHEN valid data provided THEN returns 201 with user object', async () => {
      // GIVEN
      const data = uniqueRegistration('reg-success');

      // WHEN
      const res = await api.post('/auth/register', data);

      // THEN 201 + user object
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        email: data.email,
        username: data.username,
        display_name: data.display_name,
        created_at: expect.any(String),
      });
    });

    it('WHEN valid data provided THEN response does NOT contain password_hash', async () => {
      // GIVEN
      const data = uniqueRegistration('reg-no-pwd');

      // WHEN
      const res = await api.post('/auth/register', data);

      // THEN response body does NOT contain password_hash
      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('password_hash');
      expect(res.body).not.toHaveProperty('password');
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('WHEN valid data provided THEN Set-Cookie contains token with HttpOnly flag', async () => {
      // GIVEN
      const data = uniqueRegistration('reg-cookie');

      // WHEN
      const res = await api.post('/auth/register', data);

      // THEN Set-Cookie header contains "token=" with HttpOnly flag
      expect(res.status).toBe(201);
      expect(res.setCookie).toBeDefined();
      expect(extractTokenCookie(res.setCookie!)).not.toBeNull();
      expect(hasHttpOnlyFlag(res.setCookie!)).toBe(true);
    });

    it('WHEN email has mixed case THEN email is stored in lowercase', async () => {
      // WHEN POST with mixed-case email
      const data = uniqueRegistration('reg-lower');
      data.email = 'User-Reg-Lower@Example.COM';

      const res = await api.post('/auth/register', data);

      // THEN 201 AND email = lowercase version
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('user-reg-lower@example.com');
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================
  describe('Error Handling', () => {
    it('WHEN email field is missing THEN returns 400 INVALID_INPUT', async () => {
      // WHEN POST without email field
      const { email, ...dataWithoutEmail } = uniqueRegistration('reg-no-email');

      const res = await api.post('/auth/register', dataWithoutEmail);

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN email format is invalid THEN returns 400 INVALID_INPUT with field detail', async () => {
      // WHEN POST with invalid email
      const data = { ...uniqueRegistration('reg-bad-email'), email: 'not-an-email' };

      const res = await api.post('/auth/register', data);

      // THEN 400 + INVALID_INPUT, details contains field "email"
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ])
      );
    });

    it('WHEN username contains disallowed characters THEN returns 400 INVALID_INPUT with field detail', async () => {
      // WHEN POST with username containing spaces and special chars
      const data = { ...uniqueRegistration('reg-bad-uname'), username: 'user name!' };

      const res = await api.post('/auth/register', data);

      // THEN 400 + INVALID_INPUT, details contains field "username"
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'username' }),
        ])
      );
    });

    it('WHEN password is too short THEN returns 400 INVALID_INPUT', async () => {
      // WHEN POST with password < 8 chars
      const data = { ...uniqueRegistration('reg-short-pwd'), password: invalidPasswords.tooShort };

      const res = await api.post('/auth/register', data);

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN password has no uppercase letter THEN returns 400 INVALID_INPUT', async () => {
      // WHEN POST with password lacking uppercase
      const data = { ...uniqueRegistration('reg-no-upper'), password: invalidPasswords.noUppercase };

      const res = await api.post('/auth/register', data);

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN email is already registered THEN returns 409 EMAIL_TAKEN', async () => {
      // GIVEN user exists with this email
      const data = uniqueRegistration('reg-dup-email');
      await api.post('/auth/register', data);

      // WHEN POST with same email
      const duplicateData = {
        ...uniqueRegistration('reg-dup-email2'),
        email: data.email,
      };
      const res = await api.post('/auth/register', duplicateData);

      // THEN 409 + EMAIL_TAKEN
      expect(res.status).toBe(409);
      expect(res.body.code).toBe(errorCodes.EMAIL_TAKEN);
    });

    it('WHEN username is already taken THEN returns 409 USERNAME_TAKEN', async () => {
      // GIVEN user exists with this username
      const data = uniqueRegistration('reg-dup-uname');
      await api.post('/auth/register', data);

      // WHEN POST with same username but different email
      const duplicateData = {
        ...uniqueRegistration('reg-dup-uname2'),
        username: data.username,
      };
      const res = await api.post('/auth/register', duplicateData);

      // THEN 409 + USERNAME_TAKEN
      expect(res.status).toBe(409);
      expect(res.body.code).toBe(errorCodes.USERNAME_TAKEN);
    });

    it('WHEN email duplicate check is case-insensitive THEN returns 409 EMAIL_TAKEN', async () => {
      // GIVEN user exists with email = "dup-case@example.com"
      const data = uniqueRegistration('reg-case-dup');
      data.email = 'dup-case-check@example.com';
      await api.post('/auth/register', data);

      // WHEN POST with "DUP-CASE-CHECK@example.com"
      const duplicateData = {
        ...uniqueRegistration('reg-case-dup2'),
        email: 'DUP-CASE-CHECK@example.com',
      };
      const res = await api.post('/auth/register', duplicateData);

      // THEN 409 + EMAIL_TAKEN
      expect(res.status).toBe(409);
      expect(res.body.code).toBe(errorCodes.EMAIL_TAKEN);
    });

    it('WHEN display_name is empty string THEN returns 400 INVALID_INPUT', async () => {
      // WHEN POST with empty display_name
      const data = { ...uniqueRegistration('reg-empty-dn'), display_name: '' };

      const res = await api.post('/auth/register', data);

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('Edge Cases', () => {
    it('WHEN username is exactly 3 characters (minimum) THEN returns 201', async () => {
      const data = {
        ...uniqueRegistration('reg-min-uname'),
        username: 'abc',
      };

      const res = await api.post('/auth/register', data);

      expect(res.status).toBe(201);
    });

    it('WHEN username is exactly 30 characters (maximum) THEN returns 201', async () => {
      const data = {
        ...uniqueRegistration('reg-max-uname'),
        username: invalidUsernames.exactMax,
      };

      const res = await api.post('/auth/register', data);

      expect(res.status).toBe(201);
    });

    it('WHEN username is 31 characters (exceeds maximum) THEN returns 400', async () => {
      const data = {
        ...uniqueRegistration('reg-over-uname'),
        username: invalidUsernames.tooLong,
      };

      const res = await api.post('/auth/register', data);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN password is exactly 8 characters (minimum) THEN returns 201', async () => {
      const data = {
        ...uniqueRegistration('reg-min-pwd'),
        password: invalidPasswords.exactMin,
      };

      const res = await api.post('/auth/register', data);

      expect(res.status).toBe(201);
    });
  });
});
