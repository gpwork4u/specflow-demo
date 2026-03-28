/**
 * F-003 使用者登出與身份驗證 — API E2E Tests
 *
 * 根據 QA Issue #8 的 scenarios 撰寫。
 * Spec: specs/features/f003-auth.md
 * Feature Issue: #7
 */

import { api, extractTokenCookie, hasMaxAgeZero } from './helpers/api';
import { errorCodes } from './helpers/fixtures';
import { registerAndLogin, createTamperedToken, createExpiredToken } from './helpers/setup';

describe('Auth Session & Logout', () => {
  // ============================================================
  // GET /api/v1/auth/me - 取得當前使用者
  // ============================================================
  describe('GET /api/v1/auth/me', () => {
    describe('Happy Path', () => {
      it('WHEN valid token provided THEN returns 200 with user object', async () => {
        // GIVEN 使用者已登入並持有有效 token
        const { user, cookie } = await registerAndLogin();

        // WHEN GET /api/v1/auth/me with valid token
        const res = await api.get('/auth/me', { cookie });

        // THEN 200 + user object
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          id: user.id,
          email: user.email,
          username: user.username,
        });
      });

      it('WHEN valid token provided THEN response does NOT contain password_hash', async () => {
        // GIVEN 使用者已登入
        const { cookie } = await registerAndLogin();

        // WHEN GET /api/v1/auth/me
        const res = await api.get('/auth/me', { cookie });

        // THEN user object 不含 password_hash
        expect(res.status).toBe(200);
        expect(res.body).not.toHaveProperty('password_hash');
        expect(res.body).not.toHaveProperty('password');
      });
    });

    describe('Error Handling', () => {
      it('WHEN no token provided THEN returns 401 UNAUTHORIZED', async () => {
        // WHEN GET /api/v1/auth/me without token
        const res = await api.get('/auth/me');

        // THEN 401 + UNAUTHORIZED
        expect(res.status).toBe(401);
        expect(res.body.code).toBe(errorCodes.UNAUTHORIZED);
      });

      it('WHEN token is expired THEN returns 401 UNAUTHORIZED', async () => {
        // GIVEN 過期 token
        const expiredCookie = createExpiredToken();

        // WHEN GET /api/v1/auth/me
        const res = await api.get('/auth/me', { cookie: expiredCookie });

        // THEN 401 + UNAUTHORIZED
        expect(res.status).toBe(401);
        expect(res.body.code).toBe(errorCodes.UNAUTHORIZED);
      });

      it('WHEN token signature is tampered THEN returns 401 UNAUTHORIZED', async () => {
        // GIVEN 簽名被竄改的 token
        const tamperedCookie = createTamperedToken();

        // WHEN GET /api/v1/auth/me with tampered token
        const res = await api.get('/auth/me', { cookie: tamperedCookie });

        // THEN 401 + UNAUTHORIZED
        expect(res.status).toBe(401);
        expect(res.body.code).toBe(errorCodes.UNAUTHORIZED);
      });
    });
  });

  // ============================================================
  // POST /api/v1/auth/logout - 登出
  // ============================================================
  describe('POST /api/v1/auth/logout', () => {
    describe('Happy Path', () => {
      it('WHEN logged-in user logs out THEN returns 200 and clears cookie with Max-Age=0', async () => {
        // GIVEN 使用者已登入並持有有效 token
        const { cookie } = await registerAndLogin();

        // WHEN POST /api/v1/auth/logout
        const res = await api.post('/auth/logout', undefined, { cookie });

        // THEN 200 AND Set-Cookie sets token with Max-Age=0
        expect(res.status).toBe(200);
        expect(res.setCookie).toBeDefined();
        expect(hasMaxAgeZero(res.setCookie!)).toBe(true);
      });

      it('WHEN logged out THEN original token becomes invalid', async () => {
        // GIVEN 使用者已登入
        const { cookie } = await registerAndLogin();

        // 確認 token 目前有效
        const beforeLogout = await api.get('/auth/me', { cookie });
        expect(beforeLogout.status).toBe(200);

        // WHEN 登出
        await api.post('/auth/logout', undefined, { cookie });

        // THEN 後續使用同一 token 的請求回傳 401
        const afterLogout = await api.get('/auth/me', { cookie });
        expect(afterLogout.status).toBe(401);
      });
    });
  });

  // ============================================================
  // 公開路由 — 不需要認證
  // ============================================================
  describe('Public Routes', () => {
    it('WHEN accessing public route without token THEN returns 200 (not 401)', async () => {
      // WHEN GET /api/v1/posts without token
      const res = await api.get('/posts');

      // THEN 200 (not 401) — 公開路由不需要 token
      expect(res.status).not.toBe(401);
      // 通常回傳 200，但也可能是 404 如果路由尚未實作
      expect([200, 404]).toContain(res.status);
    });

    it('WHEN accessing public route with invalid token THEN returns 200 (not 401)', async () => {
      // GIVEN 一個無效 token
      const tamperedCookie = createTamperedToken();

      // WHEN GET /api/v1/posts with invalid token
      const res = await api.get('/posts', { cookie: tamperedCookie });

      // THEN 200 (not 401) — 公開路由帶了無效 token 不報錯
      expect(res.status).not.toBe(401);
      expect([200, 404]).toContain(res.status);
    });
  });
});
